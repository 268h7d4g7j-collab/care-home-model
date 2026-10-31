"use client";
import { useEffect, useState, type FormEvent } from "react";
import { residentRequest } from "@/lib/resident-api";
import { PageHeading } from "./shell";
import type { References, Reference } from "@/lib/periods";
export function ReferenceData() {
  const [refs, setRefs] = useState<References | null>(null),
    [table, setTable] = useState<keyof References>("companies"),
    [draft, setDraft] = useState<Partial<Reference>>({ name: "" }),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setRefs(await residentRequest<References>("/api/references"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await residentRequest(`/api/references/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      await load();
      setDraft({ name: "" });
      setMessage("Reference saved.");
      window.dispatchEvent(new Event("references-updated"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Settings"
        description="Maintain companies, homes, rooms and predefined funders."
      />
      {error && (
        <p role="alert" className="form-feedback form-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="form-feedback form-success">
          {message}
        </p>
      )}
      <section className="card">
        <div className="form-grid">
          <label className="field">
            Reference type
            <select
              aria-label="Reference type"
              value={table}
              onChange={(e) => {
                setTable(e.target.value as keyof References);
                setDraft({ name: "" });
                setMessage("");
              }}
            >
              {["companies", "homes", "rooms", "funders"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        {refs ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relationship / category</th>
                    <th>Record</th>
                  </tr>
                </thead>
                <tbody>
                  {refs[table].map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>
                        {r.category ??
                          refs.companies.find((c) => c.id === r.company_id)
                            ?.name ??
                          refs.homes.find((h) => h.id === r.home_id)?.name ??
                          "—"}
                      </td>
                      <td>
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => setDraft({ ...r })}
                        >
                          Edit {r.name}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form onSubmit={save}>
              <fieldset className="period-editor" disabled={busy}>
                <div className="form-grid">
                  <label className="field">
                    Reference name
                    <input
                      required
                      value={draft.name ?? ""}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    />
                  </label>
                  {(table === "homes" || table === "rooms") && (
                    <label className="field">
                      {table === "homes" ? "Parent company" : "Parent home"}
                      <select
                        required
                        value={
                          (table === "homes"
                            ? draft.company_id
                            : draft.home_id) ?? ""
                        }
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [table === "homes" ? "company_id" : "home_id"]:
                              e.target.value,
                          })
                        }
                      >
                        <option value="">Select parent</option>
                        {refs[table === "homes" ? "companies" : "homes"].map(
                          (r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                  {table === "funders" && (
                    <label className="field">
                      Funder category
                      <select
                        aria-label="Funder category"
                        required
                        value={draft.category ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, category: e.target.value })
                        }
                      >
                        <option value="">Select category</option>
                        <option>Local Authority</option>
                        <option>NHS ICB</option>
                      </select>
                    </label>
                  )}
                </div>
                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    Save reference
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setDraft({ name: "" })}
                  >
                    New reference
                  </button>
                </div>
              </fieldset>
            </form>
          </>
        ) : (
          <button onClick={() => void load()}>Retry references</button>
        )}
      </section>
    </>
  );
}
