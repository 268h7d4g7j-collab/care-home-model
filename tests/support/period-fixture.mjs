import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
const periodDb = new PGlite();
await periodDb.exec(
  "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
);
for (const f of (await readdir("supabase/migrations")).sort())
  await periodDb.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
async function periodFixture(request, url, send) {
  const table = url.pathname.split("/").at(-1);
  const tables = ["companies", "homes", "rooms", "funders", "resident_periods"];
  if (!tables.includes(table) && table !== "save_resident_period") return false;
  try {
    if (request.method === "GET") {
      let rows;
      if (table === "resident_periods") {
        rows = (
          await periodDb.query(
            "select *,start_date::text as start_date,end_date::text as end_date from resident_periods where resident_id=$1 order by resident_periods.start_date",
            [url.searchParams.get("resident_id")?.slice(3)],
          )
        ).rows;
        for (const row of rows)
          row.funding = (
            await periodDb.query(
              "select * from period_funding where period_id=$1",
              [row.id],
            )
          ).rows;
      } else
        rows = (await periodDb.query(`select * from ${table} order by name`))
          .rows;
      send(200, rows);
      return true;
    }
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const payload = JSON.parse(raw);
    if (table === "save_resident_period") {
      const data = (
        await periodDb.query("select save_resident_period($1,$2) id", [
          payload.rid,
          payload.payload,
        ])
      ).rows[0].id;
      send(200, data);
      return true;
    }
    const allowed = {
      companies: ["name"],
      homes: ["name", "company_id"],
      rooms: ["name", "home_id"],
      funders: ["name", "category"],
    }[table];
    const keys = Object.keys(payload);
    if (!allowed || keys.some((k) => !allowed.includes(k)))
      throw new Error("Invalid fixture reference");
    const values = keys.map((k) => payload[k]);
    const id = url.searchParams.get("id")?.slice(3);
    const sql =
      request.method === "PATCH"
        ? `update ${table} set ${keys.map((k, i) => `${k}=$${i + 1}`).join(",")} where id=$${keys.length + 1} returning *`
        : `insert into ${table}(${keys.join(",")}) values(${keys.map((_, i) => `$${i + 1}`).join(",")}) returning *`;
    if (request.method === "PATCH") values.push(id);
    const rows = (await periodDb.query(sql, values)).rows;
    send(
      200,
      request.headers.accept?.includes("vnd.pgrst.object+json")
        ? rows[0]
        : rows,
    );
    return true;
  } catch (e) {
    send(400, { message: e.message });
    return true;
  }
}
export { periodFixture, periodDb };
