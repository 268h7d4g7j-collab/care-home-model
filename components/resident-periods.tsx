"use client";
import { useEffect, useState, type FormEvent } from "react";
import { residentRequest } from "@/lib/resident-api";
import { stayTypes, careTypes, fundingTypes, money } from "@/lib/data";
import type { References, ResidentPeriod, FundingEntry } from "@/lib/periods";
const blank = (): ResidentPeriod => ({
  home_id: "",
  room_id: "",
  start_date: "",
  end_date: null,
  admission: true,
  discharge: false,
  stay_type: "Permanent",
  care_type: "Residential",
  physical_occupancy: true,
  financial_occupancy: true,
  comments: "",
  funding: [],
});
export function ResidentPeriods({ residentId }: { residentId: string }) {
  const [refs, setRefs] = useState<References | null>(null),
    [periods, setPeriods] = useState<ResidentPeriod[]>([]),
    [draft, setDraft] = useState<ResidentPeriod | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const endpoint = `/api/periods/${residentId}`;
  async function load() {
    setReady(false);
    setError("");
    try {
      const [r, p] = await Promise.all([
        residentRequest<References>("/api/references"),
        residentRequest<ResidentPeriod[]>(endpoint),
      ]);
      setRefs(r);
      setPeriods(p);
      setReady(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [residentId]); // Resident component is keyed by ID.
  function add() {
    const last = periods.at(-1);
    setError("");
    setMessage("");
    setDraft(
      last
        ? {
            ...structuredClone(last),
            id: undefined,
            start_date: "",
            end_date: null,
            admission: last.discharge,
            discharge: false,
          }
        : blank(),
    );
  }
  function change<K extends keyof ResidentPeriod>(
    key: K,
    value: ResidentPeriod[K],
  ) {
    setDraft(draft ? { ...draft, [key]: value } : null);
    setMessage("");
  }
  function funding(index: number, values: Partial<FundingEntry>) {
    if (draft)
      change(
        "funding",
        draft.funding.map((f, i) => (i === index ? { ...f, ...values } : f)),
      );
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy || !draft) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const id = await residentRequest<string>(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const list = await residentRequest<ResidentPeriod[]>(endpoint);
      setPeriods(list);
      setDraft(list.find((p) => p.id === id) ?? null);
      setMessage("Period and funding saved together.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const select = (
    label: string,
    key: keyof ResidentPeriod,
    options: { id: string; name: string }[],
  ) => (
    <label className="field">
      {label}
      <select
        aria-label={label}
        required
        value={String(draft?.[key] ?? "")}
        onChange={(e) => {
          if (key === "home_id") {
            setDraft(
              draft
                ? {
                    ...draft,
                    home_id: e.target.value,
                    room_id: "",
                    admission: draft.id
                      ? draft.admission
                      : !periods.at(-1) ||
                        periods.at(-1)!.discharge ||
                        e.target.value !== periods.at(-1)!.home_id,
                  }
                : null,
            );
          } else change(key, e.target.value as never);
        }}
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <>
      <section className="card">
        <div className="card-heading">
          <h2>Period history</h2>
          <button
            className="primary-button"
            disabled={!ready || busy}
            onClick={add}
          >
            Add Period
          </button>
        </div>
        <p className="form-feedback">
          Periods are complete snapshots. Add Period copies the latest
          attributes and funding. A new home transfer marks admission and closes
          the originating stay on the preceding day. Readmissions preserve
          discharge gaps.
        </p>
        {!ready && !error && <p className="empty">Loading periods…</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Start / end</th>
                <th>Home / room</th>
                <th>Stay / care</th>
                <th>Admission / discharge</th>
                <th>Weekly fee</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.start_date} / {p.end_date ?? "Ongoing"}
                  </td>
                  <td>
                    {refs?.homes.find((h) => h.id === p.home_id)?.name} /{" "}
                    {refs?.rooms.find((r) => r.id === p.room_id)?.name}
                  </td>
                  <td>
                    {p.stay_type} / {p.care_type}
                  </td>
                  <td>
                    {p.admission ? "Yes" : "No"} / {p.discharge ? "Yes" : "No"}
                  </td>
                  <td>
                    {money(
                      p.funding.reduce(
                        (s, f) => s + Number(f.weekly_amount),
                        0,
                      ),
                    )}
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => {
                        setDraft(structuredClone(p));
                        setError("");
                        setMessage("");
                      }}
                    >
                      Open period
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ready && periods.length === 0 && (
          <p className="empty">No periods yet. Add the first admission.</p>
        )}
      </section>
      {error && (
        <p className="form-feedback form-error" role="alert">
          {error}{" "}
          {!ready && <button onClick={() => void load()}>Retry periods</button>}
        </p>
      )}
      {message && (
        <p className="form-feedback form-success" role="status">
          {message}
        </p>
      )}
      {draft && refs && (
        <form onSubmit={save}>
          <fieldset disabled={busy} className="period-editor">
            <section className="card">
              <div className="card-heading">
                <h2>
                  {draft.id ? "Edit resident period" : "New resident period"}
                </h2>
              </div>
              <div className="form-grid">
                <label className="field">
                  Start date
                  <input
                    required
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => change("start_date", e.target.value)}
                  />
                </label>
                <label className="field">
                  End date
                  <input
                    aria-label="End date"
                    type="date"
                    value={draft.end_date ?? ""}
                    onChange={(e) => change("end_date", e.target.value || null)}
                  />
                  <span className="field-help">Blank means open-ended</span>
                </label>
                <label className="field">
                  Period company
                  <input
                    readOnly
                    value={
                      refs.companies.find(
                        (c) =>
                          c.id ===
                          refs.homes.find((h) => h.id === draft.home_id)
                            ?.company_id,
                      )?.name ?? ""
                    }
                  />
                </label>
                {select("Period home", "home_id", refs.homes)}
                {select(
                  "Room",
                  "room_id",
                  refs.rooms.filter((r) => r.home_id === draft.home_id),
                )}
                {select(
                  "Stay type",
                  "stay_type",
                  stayTypes.map((s) => ({ id: s, name: s })),
                )}
                {select(
                  "Care type",
                  "care_type",
                  careTypes.map((s) => ({ id: s, name: s })),
                )}
                {(
                  [
                    "admission",
                    "discharge",
                    "physical_occupancy",
                    "financial_occupancy",
                  ] as const
                ).map((k) => (
                  <label className="field" key={k}>
                    {k.replaceAll("_", " ")}
                    <select
                      aria-label={k.replaceAll("_", " ")}
                      value={draft[k] ? "Yes" : "No"}
                      onChange={(e) => change(k, e.target.value === "Yes")}
                    >
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </label>
                ))}
                <label className="field full-width">
                  Comments
                  <textarea
                    value={draft.comments}
                    onChange={(e) => change("comments", e.target.value)}
                  />
                </label>
              </div>
            </section>
            <section className="card">
              <div className="card-heading">
                <h2>Weekly funding breakdown</h2>
              </div>
              <div className="funding-content">
                {draft.funding.map((f, i) => {
                  const category =
                    f.funding_type === "Local Authority"
                      ? "Local Authority"
                      : ["NHS", "FNC"].includes(f.funding_type)
                        ? "NHS ICB"
                        : null;
                  return (
                    <fieldset className="funding-entry" key={i}>
                      <legend>Funding entry {i + 1}</legend>
                      <label className="field">
                        Funding type
                        <select
                          aria-label="Funding type"
                          value={f.funding_type}
                          onChange={(e) =>
                            funding(i, {
                              funding_type: e.target.value,
                              funder_id: null,
                            })
                          }
                        >
                          {fundingTypes.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      {category && (
                        <label className="field">
                          Funder
                          <select
                            aria-label="Funder"
                            required
                            value={f.funder_id ?? ""}
                            onChange={(e) =>
                              funding(i, { funder_id: e.target.value || null })
                            }
                          >
                            <option value="">Select {category}</option>
                            {refs.funders
                              .filter((r) => r.category === category)
                              .map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      <label className="field">
                        Weekly amount (£)
                        <input
                          required
                          type="number"
                          min="0"
                          max="9999999999.99"
                          step="0.01"
                          value={f.weekly_amount}
                          onChange={(e) =>
                            funding(i, { weekly_amount: e.target.value })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          change(
                            "funding",
                            draft.funding.filter((_, j) => i !== j),
                          )
                        }
                      >
                        Remove funding entry {i + 1}
                      </button>
                    </fieldset>
                  );
                })}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    change("funding", [
                      ...draft.funding,
                      {
                        funding_type: "Private / Self-funded",
                        funder_id: null,
                        weekly_amount: "",
                      },
                    ])
                  }
                >
                  Add funding
                </button>
              </div>
              <div className="weekly-total">
                <strong>Total weekly fee</strong>
                <strong>
                  {money(
                    draft.funding.reduce(
                      (s, f) => s + Math.round(Number(f.weekly_amount) * 100),
                      0,
                    ) / 100,
                  )}
                </strong>
              </div>
            </section>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {busy ? "Saving…" : "Save period and funding"}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </>
  );
}
