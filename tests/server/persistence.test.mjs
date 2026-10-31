import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function ready(url, child) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error("Test service exited before readiness");
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test service did not start");
}
async function stop(child) {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
}

test(
  "resident API persists and reopens a master after restarting the application (PostgREST test double)",
  { timeout: 60000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "resident-master-test-"));
    const file = join(dir, "records.json");
    await writeFile(file, "[]");
    const environment = {
      ...process.env,
      SUPABASE_URL: "http://127.0.0.1:54330",
      SUPABASE_SECRET_KEY: "fictional-test-key",
      PORT: "3111",
      FIXTURE_PORT: "54330",
      FIXTURE_FILE: file,
    };
    let fixture, app;
    const startApp = async () => {
      app = spawn(process.execPath, ["scripts/local-server.mjs"], {
        env: environment,
        stdio: "pipe",
      });
      await ready("http://127.0.0.1:3111/api/residents", app);
    };
    const call = (path = "", method = "GET", body) =>
      fetch(`http://127.0.0.1:3111/api/residents${path}`, {
        method,
        headers: {
          Origin: "http://127.0.0.1:3111",
          "Content-Type": "application/json",
        },
        body: body && JSON.stringify(body),
      });
    try {
      fixture = spawn(
        process.execPath,
        ["tests/support/postgrest-fixture.mjs"],
        { env: environment, stdio: "pipe" },
      );
      await ready("http://127.0.0.1:54330/health", fixture);
      await startApp();
      const created = await call("", "POST", {
        name: "Fictional restart resident",
      });
      assert.equal(created.status, 201);
      const { data: resident } = await created.json();
      assert.match(resident.id, /^[0-9a-f-]{36}$/);
      const second = await (
        await call("", "POST", { name: "Fictional second resident" })
      ).json();
      assert.notEqual(resident.id, second.data.id);
      await stop(app);
      await startApp();
      assert.equal(
        (await (await call("/" + resident.id)).json()).data.name,
        resident.name,
      );
      const updated = await call("/" + resident.id, "PATCH", {
        name: "Fictional revised resident",
      });
      assert.equal(updated.status, 200);
      await stop(app);
      await startApp();
      assert.deepEqual((await (await call("/" + resident.id)).json()).data, {
        id: resident.id,
        name: "Fictional revised resident",
      });
      assert.equal(
        (await call("", "POST", { name: "No extra fields", homeId: "a" }))
          .status,
        400,
      );
      assert.equal(
        (
          await fetch("http://127.0.0.1:3111/api/residents", {
            headers: { Origin: "https://untrusted.example" },
          })
        ).status,
        403,
      );
      assert.equal(
        (await call("/00000000-0000-0000-0000-000000000000")).status,
        404,
      );
    } finally {
      await stop(app);
      await stop(fixture);
      await rm(dir, { recursive: true, force: true });
    }
  },
);
