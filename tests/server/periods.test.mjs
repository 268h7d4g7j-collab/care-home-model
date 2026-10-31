import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
test(
  "period snapshots, continuity, boundaries, transfer, validation, atomic rollback and restart",
  { timeout: 60000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "period-postgres-"));
    let db = new PGlite(dir);
    try {
      await db.exec(
        "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;",
      );
      for (const file of (await readdir("supabase/migrations")).sort())
        await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
      if (
        !(await readdir("supabase/migrations")).some((f) =>
          f.includes("resident_periods"),
        )
      )
        await db.exec(await readFile("supabase/task-2b.sql", "utf8"));
      const query = async (sql, args) => (await db.query(sql, args)).rows;
      const [resident] = await query(
        "insert into residents(name) values('Fictional period tester') returning id",
      );
      const homes = await query("select * from homes order by name");
      const rooms = await query("select * from rooms order by name");
      const funders = await query("select * from funders");
      const base = {
        home_id: homes[0].id,
        room_id: rooms.find((r) => r.home_id === homes[0].id).id,
        start_date: "2026-01-01",
        end_date: null,
        admission: true,
        discharge: false,
        stay_type: "Permanent",
        care_type: "Nursing",
        physical_occupancy: true,
        financial_occupancy: true,
        comments: "Fictional",
        funding: [
          {
            funding_type: "Local Authority",
            funder_id: funders.find((f) => f.category === "Local Authority").id,
            weekly_amount: 900,
          },
          {
            funding_type: "FNC",
            funder_id: funders.find((f) => f.category === "NHS ICB").id,
            weekly_amount: 200,
          },
        ],
      };
      const save = async (p) =>
        (
          await query("select save_resident_period($1,$2) id", [resident.id, p])
        )[0].id;
      const periods = () =>
        query(
          "select *,start_date::text as start_date,end_date::text as end_date from resident_periods where resident_id=$1 order by resident_periods.start_date",
          [resident.id],
        );
      await db.exec("set role service_role");
      const first = await save(base);
      assert.equal((await periods())[0].end_date, null);
      const second = await save({
        ...base,
        start_date: "2026-02-01",
        admission: false,
        funding: base.funding.map((f) => ({ ...f, weekly_amount: 500 })),
      });
      assert.equal((await periods())[0].end_date, "2026-01-31");
      assert.deepEqual(
        (
          await query(
            "select weekly_amount from period_funding where period_id=$1 order by weekly_amount",
            [first],
          )
        ).map((f) => f.weekly_amount),
        ["200.00", "900.00"],
      );
      await save({
        ...base,
        id: second,
        start_date: "2026-02-05",
        admission: false,
      });
      assert.equal((await periods())[0].end_date, "2026-02-04");
      await save({ ...base, id: first, end_date: "2026-02-07" });
      assert.equal((await periods())[1].start_date, "2026-02-08");
      await assert.rejects(
        save({ ...base, id: first, end_date: null }),
        /open-ended/,
      );
      await assert.rejects(
        save({ ...base, id: first, end_date: "2025-12-29" }),
        /check constraint|overlap/,
      );
      await assert.rejects(
        query("update funders set category=$1 where id=$2", [
          "NHS ICB",
          funders.find((f) => f.category === "Local Authority").id,
        ]),
        /cannot change category/,
      );
      const before = await periods();
      await assert.rejects(
        save({
          ...base,
          id: second,
          start_date: "2025-01-01",
          admission: false,
        }),
        /reorder/,
      );
      assert.deepEqual(await periods(), before);
      const counts = await query("select * from period_funding order by id");
      await assert.rejects(
        save({
          ...base,
          id: second,
          start_date: "2026-02-10",
          admission: false,
          funding: [
            {
              funding_type: "NHS",
              funder_id: funders.find((f) => f.category === "Local Authority")
                .id,
              weekly_amount: 100,
            },
          ],
        }),
        /correct category/,
      );
      assert.deepEqual(await periods(), before);
      assert.deepEqual(
        await query("select * from period_funding order by id"),
        counts,
      );
      await save({
        ...base,
        id: second,
        start_date: "2026-02-08",
        end_date: "2026-02-28",
        admission: false,
        discharge: true,
      });
      const third = await save({
        ...base,
        start_date: "2026-04-01",
        end_date: "2026-04-10",
        discharge: true,
        stay_type: "Respite",
      });
      assert.equal((await periods())[1].end_date, "2026-02-28");
      await assert.rejects(
        save({
          ...base,
          id: third,
          start_date: "2026-02-20",
          end_date: "2026-04-10",
          discharge: true,
        }),
        /overlap/,
      );
      const fourth = await save({ ...base, start_date: "2026-05-01" });
      const fifth = await save({
        ...base,
        home_id: homes[1].id,
        room_id: rooms.find((r) => r.home_id === homes[1].id).id,
        start_date: "2026-06-01",
      });
      const transferred = await periods();
      assert.equal(transferred.find((p) => p.id === fourth).discharge, true);
      assert.equal(
        transferred.find((p) => p.id === fourth).end_date,
        "2026-05-31",
      );
      assert.equal(transferred.find((p) => p.id === fifth).admission, true);
      await assert.rejects(
        save({
          ...base,
          start_date: "2026-07-01",
          home_id: homes[1].id,
          room_id: rooms.find((r) => r.home_id === homes[0].id).id,
          admission: false,
        }),
        /foreign key|continuation/,
      );
      await assert.rejects(
        save({ ...base, id: fifth, start_date: "2026-06-01", discharge: true }),
        /check constraint/,
      );
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`set role ${role}`);
        await assert.rejects(
          query("select * from resident_periods"),
          /permission denied/,
        );
        await assert.rejects(save(base), /permission denied/);
      }
      await db.exec("reset role");
      await db.close();
      db = new PGlite(dir);
      assert.equal((await periods()).length, 5);
      assert.equal(
        (
          await query("select name from residents where id=$1", [resident.id])
        )[0].name,
        "Fictional period tester",
      );
    } finally {
      await db.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
