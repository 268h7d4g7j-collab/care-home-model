import { createClient } from "@supabase/supabase-js";

export class ResidentStoreError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export const validResidentId = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function residentName(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).some((key) => key !== "name") ||
    typeof payload.name !== "string" ||
    !payload.name.trim()
  ) {
    throw new ResidentStoreError(
      "Enter a resident name. Only the name can be saved.",
      400,
    );
  }
  return payload.name.trim();
}

// This module is imported only by the loopback HTTP server, never by Next pages
// or browser components. It never logs or returns connection credentials.
export function createServerClient(environment = process.env) {
  const url = environment.SUPABASE_URL;
  const key = environment.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new ResidentStoreError(
      "Supabase is not configured. Follow the setup instructions to connect this local application.",
      503,
    );
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ResidentStoreError("The Supabase URL is invalid.", 503);
  }
  if (
    parsed.protocol !== "https:" &&
    !(
      parsed.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(parsed.hostname)
    )
  ) {
    throw new ResidentStoreError(
      "Supabase requires HTTPS, except for local test services.",
      503,
    );
  }
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function createResidentStore(environment = process.env) {
  const client = createServerClient(environment);
  const resolve = ({ data, error }) => {
    // Do not leak upstream errors, SQL, credentials, or resident information.
    if (error)
      throw new ResidentStoreError(
        "Supabase could not complete the request. Check the local connection and migration, then retry.",
        502,
      );
    if (!data) throw new ResidentStoreError("Resident not found.", 404);
    return data;
  };
  return {
    async list() {
      return resolve(
        await client
          .from("residents")
          .select("id,name")
          .order("name")
          .order("id"),
      );
    },
    async get(id) {
      return resolve(
        await client
          .from("residents")
          .select("id,name")
          .eq("id", id)
          .maybeSingle(),
      );
    },
    async create(payload) {
      const name = residentName(payload);
      return resolve(
        await client
          .from("residents")
          .insert({ name })
          .select("id,name")
          .single(),
      );
    },
    async update(id, payload) {
      const name = residentName(payload);
      return resolve(
        await client
          .from("residents")
          .update({ name })
          .eq("id", id)
          .select("id,name")
          .maybeSingle(),
      );
    },
  };
}
