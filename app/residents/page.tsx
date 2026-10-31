"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, UsersRound, Plus, Info } from "lucide-react";
import { useScope } from "@/components/shell";
import { residentRequest } from "@/lib/resident-api";
import type { ResidentPeriod } from "@/lib/periods";
import { PageHeading } from "@/components/shell";
import { listResidents } from "@/lib/resident-api";
import type { ResidentMaster } from "@/lib/resident-master";

export default function Residents() {
  const { company, home, references } = useScope();
  const [periods, setPeriods] = useState<Record<string, ResidentPeriod[]>>({});
  const [residents, setResidents] = useState<ResidentMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listResidents()
      .then(async (data) => {
        const snapshots = await Promise.all(
          data.map(
            async (r) =>
              [
                r.id,
                await residentRequest<ResidentPeriod[]>(`/api/periods/${r.id}`),
              ] as const,
          ),
        );
        if (active) setPeriods(Object.fromEntries(snapshots));
        if (active) setResidents(data);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt]);
  const visible = residents.filter(
    (r) =>
      (company === "all" && home === "all") ||
      (periods[r.id] ?? []).some(
        (p) =>
          (home === "all" || p.home_id === home) &&
          (company === "all" ||
            references?.homes.find((h) => h.id === p.home_id)?.company_id ===
              company),
      ),
  );
  return (
    <>
      <PageHeading
        title="Residents"
        description="View and maintain resident master records."
      >
        {!loading && !error && (
          <Link className="primary-button" href="/residents/new">
            <Plus size={16} />
            New resident
          </Link>
        )}
      </PageHeading>
      <div className="notice">
        <Info size={18} />
        <span>
          Resident masters contain only ID and name. Company and home filters
          include matching period history.
        </span>
      </div>
      <section className="card" aria-busy={loading}>
        <div className="card-heading">
          <div className="section-title">
            <span className="section-icon">
              <UsersRound size={20} />
            </span>
            <div>
              <h2>Resident directory</h2>
              <p>Resident master records · local-only access</p>
            </div>
          </div>
          {!loading && !error && (
            <span className="count">
              {visible.length} {visible.length === 1 ? "resident" : "residents"}
            </span>
          )}
        </div>
        {loading ? (
          <p className="empty" role="status">
            Loading residents…
          </p>
        ) : error ? (
          <div className="storage-message">
            <p role="alert">{error}</p>
            <button
              className="secondary-button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry connection
            </button>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Resident name</th>
                    <th>Resident ID</th>
                    <th>Latest period home</th>
                    <th>Latest period room</th>
                    <th>
                      <span className="sr-only">Record</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((resident) => (
                    <tr key={resident.id}>
                      <td>
                        <div className="resident-name">
                          <span className="avatar" aria-hidden="true">
                            {resident.name.slice(0, 1)}
                          </span>
                          <strong>{resident.name}</strong>
                        </div>
                      </td>
                      <td className="muted mono">{resident.id}</td>
                      <td className="muted">
                        {references?.homes.find(
                          (h) => h.id === periods[resident.id]?.at(-1)?.home_id,
                        )?.name ?? "Not assigned"}
                      </td>
                      <td className="muted">
                        {references?.rooms.find(
                          (r) => r.id === periods[resident.id]?.at(-1)?.room_id,
                        )?.name ?? "Not assigned"}
                      </td>
                      <td>
                        <Link
                          className="record-link"
                          href={`/residents/${resident.id}`}
                        >
                          View record <ArrowUpRight size={16} />
                          <span className="sr-only"> for {resident.name}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <div className="empty">
                No matching resident records. Choose New resident to create one.
              </div>
            )}
            <div className="card-foot">
              Names are stored in Supabase. Company, home and room are not
              resident master fields.
            </div>
          </>
        )}
      </section>
    </>
  );
}
