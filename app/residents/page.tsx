"use client";
import Link from "next/link";
import { ArrowUpRight, UsersRound } from "lucide-react";
import { PageHeading, useScope } from "@/components/shell";
import {
  residents,
  currentPeriod,
  matchesScope,
  homeName,
  roomName,
} from "@/lib/data";
export default function Residents() {
  const { company, home } = useScope();
  const visible = residents.filter((resident) =>
    matchesScope(resident, company, home),
  );
  return (
    <>
      <PageHeading
        title="Residents"
        description="View resident records and their care and funding arrangements."
      >
        <span className="tag">Demonstration data</span>
      </PageHeading>
      <section className="card">
        <div className="card-heading">
          <div className="section-title">
            <span className="section-icon">
              <UsersRound size={20} />
            </span>
            <div>
              <h2>Resident directory</h2>
              <p>Residents in your selected company and home</p>
            </div>
          </div>
          <span className="count">
            {visible.length} {visible.length === 1 ? "resident" : "residents"}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Resident name</th>
                <th>Resident ID</th>
                <th>Current home</th>
                <th>Current room</th>
                <th>
                  <span className="sr-only">Record</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((resident) => {
                const period = currentPeriod(resident);
                return (
                  <tr key={resident.id}>
                    <td>
                      <div className="resident-name">
                        <span className="avatar" aria-hidden="true">
                          {resident.name.split(" ").at(-1)}
                        </span>
                        <strong>{resident.name}</strong>
                      </div>
                    </td>
                    <td className="muted mono">{resident.id}</td>
                    <td>{homeName(period.homeId)}</td>
                    <td>
                      <span className="room">
                        Room {roomName(period.roomId)}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <div className="empty">
            No residents match the selected company and home.
          </div>
        )}
        <div className="card-foot">
          All resident information shown is fictional.
        </div>
      </section>
    </>
  );
}
