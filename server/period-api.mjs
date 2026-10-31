import { ResidentStoreError, validResidentId } from "./resident-store.mjs";
export async function handlePeriodApi(req, res, factory) {
  const send = (status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  };
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    const match = path.match(/^\/api\/periods\/([0-9a-f-]+)$/i);
    const ref = path.match(
      /^\/api\/references(?:\/(companies|homes|rooms|funders))?$/,
    );
    if (!match && !ref) return send(404, { error: "Not found." });
    if (match && !validResidentId(match[1]))
      return send(400, { error: "Invalid resident ID." });
    if (
      !["GET", "POST"].includes(req.method) ||
      (ref?.[1] && req.method === "GET")
    )
      return send(405, { error: "Method not allowed." });
    const store = factory();
    if (req.method === "GET")
      return send(200, {
        data: match ? await store.periods(match[1]) : await store.references(),
      });
    if (req.headers["content-type"]?.split(";")[0] !== "application/json")
      return send(415, { error: "Use JSON." });
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 65536)
        throw new ResidentStoreError("Request too large.", 413);
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new ResidentStoreError("Invalid JSON.", 400);
    }
    if (!match && !ref[1])
      return send(404, { error: "Select a reference type." });
    send(200, {
      data: match
        ? await store.save(match[1], payload)
        : await store.reference(ref[1], payload),
    });
  } catch (error) {
    send(error instanceof ResidentStoreError ? error.status : 500, {
      error:
        error instanceof ResidentStoreError
          ? error.message
          : "Request failed. No changes saved.",
    });
  }
}
