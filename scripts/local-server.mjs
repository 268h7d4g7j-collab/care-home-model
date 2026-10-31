import { createPeriodStore } from "../server/period-store.mjs";
import { handlePeriodApi } from "../server/period-api.mjs";
import { createServer } from "node:http";
import next from "next";
import nextEnv from "@next/env";
import { createResidentStore } from "../server/resident-store.mjs";
import {
  handleResidentApi,
  trustedLocalRequest,
} from "../server/resident-api.mjs";

const dev = process.argv.includes("--dev");
nextEnv.loadEnvConfig(process.cwd(), dev);
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid local server port.");
const app = next({ dev, hostname: "127.0.0.1", port });
await app.prepare();
const handle = app.getRequestHandler();
let store;
let periodStore;
const storeFactory = () => (store ??= createResidentStore());
const server = createServer(async (request, response) => {
  // Enforce the boundary using the socket peer as well as Host/Origin. The bind
  // address is fixed and cannot be changed with an environment variable.
  if (!trustedLocalRequest(request, port)) {
    response.writeHead(403, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    });
    response.end(
      JSON.stringify({
        error:
          "Resident editing is available only from this local application.",
      }),
    );
    return;
  }
  if (
    request.url?.startsWith("/api/periods") ||
    request.url?.startsWith("/api/references")
  ) {
    await handlePeriodApi(
      request,
      response,
      () => (periodStore ??= createPeriodStore()),
    );
  } else if (request.url?.startsWith("/api/residents")) {
    await handleResidentApi(request, response, storeFactory);
  } else {
    await handle(request, response);
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Local-only Care Home Revenue: http://127.0.0.1:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
