import { test } from "node:test";
import assert from "node:assert/strict";
import { trustedLocalRequest } from "../../server/resident-api.mjs";
import {
  residentName,
  validResidentId,
  createResidentStore,
} from "../../server/resident-store.mjs";
const request = (overrides = {}) => ({
  socket: { remoteAddress: "127.0.0.1" },
  method: "GET",
  headers: { host: "127.0.0.1:3000" },
  ...overrides,
});
test("local boundary checks the actual peer, host, proxy headers and browser origin", () => {
  assert.equal(trustedLocalRequest(request(), 3000), true);
  assert.equal(
    trustedLocalRequest(
      request({ socket: { remoteAddress: "203.0.113.1" } }),
      3000,
    ),
    false,
  );
  assert.equal(
    trustedLocalRequest(
      request({ headers: { host: "attacker.example:3000" } }),
      3000,
    ),
    false,
  );
  for (const headers of [
    { "x-forwarded-for": "127.0.0.1" },
    { forwarded: "for=127.0.0.1" },
    { origin: "https://attacker.example" },
    { "sec-fetch-site": "cross-site" },
  ])
    assert.equal(
      trustedLocalRequest(
        request({ headers: { host: "127.0.0.1:3000", ...headers } }),
        3000,
      ),
      false,
    );
  assert.equal(trustedLocalRequest(request({ method: "POST" }), 3000), false);
  assert.equal(
    trustedLocalRequest(
      request({
        method: "POST",
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
      3000,
    ),
    true,
  );
});
test("resident writes accept only a nonblank name; ID is never client-assigned", () => {
  assert.equal(
    residentName({ name: "  Fictional Resident  " }),
    "Fictional Resident",
  );
  for (const payload of [
    null,
    [],
    {},
    { name: "" },
    { name: "   " },
    { name: 42 },
    { name: "A", id: "client-id" },
    { name: "A", homeId: "a" },
  ]) {
    assert.throws(() => residentName(payload), { status: 400 });
  }
  assert.equal(validResidentId("RES-001"), false);
  assert.equal(validResidentId("780f5f23-1efb-4973-a1af-05bbcc5a65af"), true);
});
test("missing or insecure Supabase configuration fails closed", () => {
  assert.throws(() => createResidentStore({}), { status: 503 });
  assert.throws(
    () =>
      createResidentStore({
        SUPABASE_URL: "http://public.example",
        SUPABASE_SECRET_KEY: "not-a-real-key",
      }),
    { status: 503 },
  );
});
