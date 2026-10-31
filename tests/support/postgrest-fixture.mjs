// Test double only: no production code imports this module. It exercises the
// actual supabase-js HTTP contract without claiming to be a Supabase database.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const port = Number(process.env.FIXTURE_PORT || 54329);
const file = process.env.FIXTURE_FILE;
let records = file ? JSON.parse(readFileSync(file, "utf8")) : [];
const persist = () => {
  if (file) writeFileSync(file, JSON.stringify(records));
};
createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const send = (status, body) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (url.pathname === "/health") return send(200, { testDouble: true });
  if (url.pathname !== "/rest/v1/residents") return send(404, {});
  if (request.headers.apikey !== "fictional-test-key")
    return send(401, { message: "Missing test key" });
  const id = url.searchParams.get("id")?.replace(/^eq\./, "");
  if (request.method === "GET") {
    const data = records
      .filter((item) => !id || item.id === id)
      .sort((a, b) => a.name.localeCompare(b.name));
    return send(
      200,
      request.headers.accept?.includes("vnd.pgrst.object+json")
        ? data[0]
        : data,
    );
  }
  let body = "";
  for await (const part of request) body += part;
  const payload = JSON.parse(body);
  if (Object.keys(payload).join(",") !== "name" || !payload.name.trim())
    return send(400, { message: "Only name accepted" });
  if (payload.name === "Fictional unavailable storage")
    return send(503, { message: "Simulated database outage" });
  let resident;
  if (request.method === "POST") {
    resident = { id: randomUUID(), name: payload.name };
    records.push(resident);
  } else if (request.method === "PATCH") {
    resident = records.find((item) => item.id === id);
    if (resident) resident.name = payload.name;
  } else return send(405, {});
  persist();
  const object = request.headers.accept?.includes("vnd.pgrst.object+json");
  return send(200, object ? resident : resident ? [resident] : []);
}).listen(port, "127.0.0.1", () =>
  console.log(`PostgREST test double listening on ${port}`),
);
