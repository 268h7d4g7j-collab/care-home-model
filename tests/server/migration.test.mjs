import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

test(
  "PostgreSQL migration keeps exactly two fields, denies browser roles and persists after reopen",
  { timeout: 60000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "resident-postgres-"));
    let db = new PGlite(dir);
    try {
      await db.exec(
        "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;",
      );
      await db.exec(
        await readFile(
          "supabase/migrations/202610310001_resident_master.sql",
          "utf8",
        ),
      );
      const { rows: columns } = await db.query(
        "select column_name from information_schema.columns where table_schema='public' and table_name='residents' order by ordinal_position",
      );
      assert.deepEqual(
        columns.map((item) => item.column_name),
        ["id", "name"],
      );
      const { rows: rls } = await db.query(
        "select relrowsecurity,relforcerowsecurity from pg_class where oid='public.residents'::regclass",
      );
      assert.equal(rls[0].relrowsecurity, true);
      assert.equal(rls[0].relforcerowsecurity, true);
      assert.equal(
        (
          await db.query(
            "select * from pg_policies where schemaname='public' and tablename='residents'",
          )
        ).rows.length,
        0,
      );
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`set role ${role}`);
        for (const statement of [
          "select * from public.residents",
          "insert into public.residents(name) values ('Fictional denied')",
          "update public.residents set name='Fictional denied'",
        ]) {
          await assert.rejects(db.query(statement), /permission denied/);
        }
        await db.exec("reset role");
      }
      await db.exec("set role service_role");
      const { rows: first } = await db.query(
        "insert into public.residents(name) values ('Fictional PostgreSQL resident') returning id,name",
      );
      const { rows: second } = await db.query(
        "insert into public.residents(name) values ('Fictional second PostgreSQL resident') returning id",
      );
      assert.notEqual(first[0].id, second[0].id);
      for (const statement of [
        "insert into public.residents(name) values (null)",
        "insert into public.residents(name) values ('  ')",
      ])
        await assert.rejects(db.query(statement));
      await db.query("update public.residents set name=$1 where id=$2", [
        "Fictional revised PostgreSQL resident",
        first[0].id,
      ]);
      await db.close();
      db = new PGlite(dir);
      await db.exec("set role service_role");
      assert.deepEqual(
        (
          await db.query("select id,name from public.residents where id=$1", [
            first[0].id,
          ])
        ).rows,
        [{ id: first[0].id, name: "Fictional revised PostgreSQL resident" }],
      );
    } finally {
      await db.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
