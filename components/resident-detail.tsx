"use client";
import Link from "next/link";
import {
  ArrowLeft,
  UserRound,
  CalendarDays,
  Wallet,
  History,
  Info,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHeading, useScope } from "./shell";
import {
  type Resident,
  type Period,
  companies,
  homes,
  rooms,
  funders,
  stayTypes,
  careTypes,
  fundingTypes,
  currentPeriod,
  chronologicalPeriods,
  weeklyTotal,
  money,
  date,
  homeName,
  roomName,
  matchesScope,
} from "@/lib/data";
function Field({
  label,
  value,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
}) {
  return (
    <label className="field">
      {label}
      <input aria-label={label} type={type} value={value} readOnly />
    </label>
  );
}
function Choice({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="field">
      {label}
      <select aria-label={label} value={value} disabled>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
const choices = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));
function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="card-heading">
      <div className="section-title">
        <span className="section-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
    </div>
  );
}
function FundingBreakdown({ period }: { period: Period }) {
  return (
    <section className="card funding-card">
      <SectionTitle
        icon={<Wallet size={20} />}
        title="Funding breakdown"
        description="Funding entries for the current period"
      />
      <div className="funding-content">
        {period.funding.map((entry, index) => (
          <fieldset className="funding-entry" key={entry.id}>
            <legend>Funding entry {index + 1}</legend>
            <Choice
              label="Funding type"
              value={entry.type}
              options={choices(fundingTypes)}
            />
            {entry.type === "Local Authority" || entry.type === "NHS" ? (
              <Choice
                label="Funder"
                value={entry.funderId!}
                options={funders
                  .filter((funder) => funder.type === entry.type)
                  .map((funder) => ({ value: funder.id, label: funder.name }))}
              />
            ) : (
              <Field label="Funder" value="Not applicable" />
            )}
            <Field
              label="Weekly amount (£)"
              value={entry.weeklyAmount.toFixed(2)}
            />
          </fieldset>
        ))}
      </div>
      <div className="weekly-total">
        <div>
          <strong>Total weekly fee</strong>
          <span>Sum of demonstration funding entries</span>
        </div>
        <strong>
          {money(weeklyTotal(period))}
          <small> / week</small>
        </strong>
      </div>
    </section>
  );
}
export function ResidentDetail({ resident }: { resident: Resident }) {
  const { company, home } = useScope();
  const period = currentPeriod(resident);
  const periodHome = homes.find((item) => item.id === period.homeId)!;
  return (
    <>
      <Link className="back-link" href="/residents">
        <ArrowLeft size={16} />
        Back to residents
      </Link>
      <PageHeading
        title={resident.name}
        description="Resident record · Care, occupancy and funding at a glance."
      >
        <span className="tag">Read-only demonstration</span>
      </PageHeading>
      {!matchesScope(resident, company, home) && (
        <div className="notice" role="status">
          <Info size={18} />
          <span>
            This record is outside your current company or home selection.{" "}
            <Link href="/residents">Return to the filtered resident list</Link>.
          </span>
        </div>
      )}
      <div className="notice">
        <Info size={18} />
        <span>
          Demonstration only. Fields are read-only and no changes are saved.
        </span>
      </div>
      <section className="card">
        <SectionTitle icon={<UserRound size={20} />} title="Resident details" />
        <div className="form-grid resident-fields">
          <Field label="Resident ID" value={resident.id} />
          <Field label="Resident name" value={resident.name} />
        </div>
      </section>
      <div className="detail-columns">
        <section className="card">
          <SectionTitle
            icon={<CalendarDays size={20} />}
            title="Resident period"
            description="Complete snapshot of the current circumstances"
          />
          <div className="form-grid">
            <Field label="Period start date" value={period.start} type="date" />
            <label className="field">
              Period end date
              <input
                aria-label="Period end date"
                aria-describedby="end-date-help"
                type="date"
                value={period.end ?? ""}
                readOnly
              />
              <span id="end-date-help" className="field-help">
                Blank means ongoing
              </span>
            </label>
            <Field
              label="Company"
              value={
                companies.find((item) => item.id === periodHome.companyId)!.name
              }
            />
            <Choice
              label="Home"
              value={period.homeId}
              options={homes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            <Choice
              label="Room"
              value={period.roomId}
              options={rooms
                .filter((item) => item.homeId === period.homeId)
                .map((item) => ({ value: item.id, label: item.name }))}
            />
            <Choice
              label="Stay type"
              value={period.stayType}
              options={choices(stayTypes)}
            />
            <div className="full-width">
              <Choice
                label="Care type"
                value={period.careType}
                options={choices(careTypes)}
              />
            </div>
            <Choice
              label="Physical occupancy"
              value={period.physicalOccupancy ? "Yes" : "No"}
              options={choices(["Yes", "No"])}
            />
            <Choice
              label="Financial occupancy"
              value={period.financialOccupancy ? "Yes" : "No"}
              options={choices(["Yes", "No"])}
            />
            <label className="field full-width">
              Comments
              <textarea
                aria-label="Comments"
                readOnly
                value={period.comments}
                rows={3}
              />
            </label>
          </div>
        </section>
        <FundingBreakdown period={period} />
      </div>
      <section className="card">
        <SectionTitle
          icon={<History size={20} />}
          title="Period history"
          description="All periods, ordered from earliest to latest"
        />
        <div className="table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                {[
                  "Start / end",
                  "Home / room",
                  "Stay type",
                  "Care type",
                  "Physical occupancy",
                  "Financial occupancy",
                  "Weekly fee",
                  "Comments",
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chronologicalPeriods(resident).map((item) => (
                <tr key={item.id}>
                  <td>
                    {date(item.start)}
                    <span className="cell-secondary">{date(item.end)}</span>
                  </td>
                  <td>
                    {homeName(item.homeId)}
                    <span className="cell-secondary">
                      Room {roomName(item.roomId)}
                    </span>
                  </td>
                  <td>{item.stayType}</td>
                  <td>{item.careType}</td>
                  <td>{item.physicalOccupancy ? "Yes" : "No"}</td>
                  <td>{item.financialOccupancy ? "Yes" : "No"}</td>
                  <td className="fee">{money(weeklyTotal(item))}</td>
                  <td>{item.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
