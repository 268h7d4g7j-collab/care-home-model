import { ResidentStoreError, validResidentId } from "./resident-store.mjs";

const respond = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
};

export function trustedLocalRequest(request, port) {
  const peer = request.socket.remoteAddress;
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(peer)) return false;
  const host = request.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) return false;
  // Never trust a public reverse proxy, forwarded headers, or DNS rebinding.
  if (
    Object.keys(request.headers).some(
      (name) => name === "forwarded" || name.startsWith("x-forwarded-"),
    )
  )
    return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  if (request.headers.origin && request.headers.origin !== `http://${host}`)
    return false;
  // Browser writes must originate from this exact local application.
  if (
    !["GET", "HEAD"].includes(request.method) &&
    request.headers.origin !== `http://${host}`
  )
    return false;
  return true;
}

async function readPayload(request) {
  if (
    request.headers["content-type"]?.split(";")[0].trim() !== "application/json"
  ) {
    throw new ResidentStoreError("Use a JSON request.", 415);
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 16384)
      throw new ResidentStoreError("Request is too large.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ResidentStoreError("Invalid JSON request.", 400);
  }
}

export async function handleResidentApi(request, response, storeFactory) {
  try {
    const path = new URL(request.url, "http://localhost").pathname.replace(
      /\/$/,
      "",
    );
    const collection = path === "/api/residents";
    const match = path.match(/^\/api\/residents\/([^/]+)$/);
    if (!collection && !match)
      return respond(response, 404, { error: "Not found." });
    const id = match?.[1];
    if (id && !validResidentId(id))
      return respond(response, 400, { error: "Invalid resident ID." });
    const allowed = collection ? ["GET", "POST"] : ["GET", "PATCH"];
    if (!allowed.includes(request.method)) {
      response.setHeader("Allow", allowed.join(", "));
      return respond(response, 405, { error: "Method not allowed." });
    }
    const store = storeFactory();
    if (request.method === "GET")
      return respond(response, 200, {
        data: collection ? await store.list() : await store.get(id),
      });
    const payload = await readPayload(request);
    const data = collection
      ? await store.create(payload)
      : await store.update(id, payload);
    return respond(response, collection ? 201 : 200, { data });
  } catch (error) {
    return respond(
      response,
      error instanceof ResidentStoreError ? error.status : 500,
      {
        error:
          error instanceof ResidentStoreError
            ? error.message
            : "The request could not be completed. Please retry.",
      },
    );
  }
}
