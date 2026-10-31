import { ResidentStoreError, createServerClient } from "./resident-store.mjs";
export function createPeriodStore(env = process.env) {
  const db = createServerClient(env);
  const resolve = ({ data, error }) => {
    if (error) {
      const messages = [
        "Resident not found",
        "Period not found for this resident",
        "Enter a start date",
        "A date correction cannot reorder periods",
        "Add Period must follow the latest period; edit existing history for corrections",
        "The first period must mark an admission",
        "A transfer must mark admission to the receiving home",
        "A period after discharge must mark a new admission",
        "A continuation cannot mark a new admission without discharge",
        "Historical home changes require explicit discharge and admission boundaries",
        "Do not change historical stay boundaries while a following period exists",
        "Conflicting stay boundary",
        "An open-ended period cannot precede another period",
        "Resident periods must not overlap",
        "Supply the funding breakdown",
        "Select a funder with the correct category",
        "A funder used in period history cannot change category; create a new reference instead",
      ];
      throw new ResidentStoreError(
        messages.includes(error.message)
          ? error.message
          : "Save failed. Check dates, room/home relationships, required fields and funding amounts. No changes were saved.",
        400,
      );
    }
    return data;
  };
  return {
    async references() {
      const result = {};
      for (const table of ["companies", "homes", "rooms", "funders"])
        result[table] = resolve(await db.from(table).select("*").order("name"));
      return result;
    },
    async periods(id) {
      return resolve(
        await db
          .from("resident_periods")
          .select("*,funding:period_funding(*)")
          .eq("resident_id", id)
          .order("start_date"),
      );
    },
    async save(id, payload) {
      return resolve(
        await db.rpc("save_resident_period", { rid: id, payload }),
      );
    },
    async reference(table, payload) {
      if (!["companies", "homes", "rooms", "funders"].includes(table))
        throw new ResidentStoreError("Unknown reference type.", 400);
      const keys = {
        companies: ["name"],
        homes: ["name", "company_id"],
        rooms: ["name", "home_id"],
        funders: ["name", "category"],
      }[table];
      if (
        !payload ||
        Object.keys(payload).some((k) => !["id", ...keys].includes(k)) ||
        typeof payload.name !== "string" ||
        !payload.name.trim()
      )
        throw new ResidentStoreError(
          "Enter the reference name and required relationship.",
          400,
        );
      const { id, ...values } = payload;
      values.name = values.name.trim();
      return resolve(
        await (
          id
            ? db.from(table).update(values).eq("id", id)
            : db.from(table).insert(values)
        )
          .select()
          .single(),
      );
    },
  };
}
