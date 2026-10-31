"use client";
import Link from "next/link";
import { ResidentPeriods } from "./resident-periods";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, UserRound, Info } from "lucide-react";
import { PageHeading } from "./shell";
import { residentRequest, residentEndpoint } from "@/lib/resident-api";
import type { ResidentMaster } from "@/lib/resident-master";

export function ResidentMasterForm({ id }: { id?: string }) {
  const [resident, setResident] = useState<ResidentMaster | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [success, setSuccess] = useState("");
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError("");
    setLoadError(false);
    setSuccess("");
    residentRequest<ResidentMaster>(residentEndpoint(id))
      .then((data) => {
        if (active) {
          setResident(data);
          setName(data.name);
        }
      })
      .catch((cause) => {
        if (active) {
          setLoadError(true);
          setError(cause.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setSuccess("");
    if (!name.trim()) {
      setError("Enter a resident name.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const existingId = resident?.id ?? id;
      const saved = await residentRequest<ResidentMaster>(
        existingId ? residentEndpoint(existingId) : "/api/residents",
        {
          method: existingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        },
      );
      setResident(saved);
      setName(saved.name);
      setSuccess("Resident saved to Supabase.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The resident could not be saved.",
      );
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }
  return (
    <>
      <Link className="back-link" href="/residents">
        <ArrowLeft size={16} />
        Back to residents
      </Link>
      <PageHeading
        title={resident?.name ?? (id ? "Resident record" : "New resident")}
        description="Resident master · ID and name only."
      >
        <span className="tag">Local-only editing</span>
      </PageHeading>
      <div className="notice">
        <Info size={18} />
        <span>
          Resident details contain the ID and name. Periods hold home, room and
          funding history.
        </span>
      </div>
      <section className="card" aria-busy={loading || saving}>
        <div className="card-heading">
          <div className="section-title">
            <span className="section-icon">
              <UserRound size={20} />
            </span>
            <h2>Resident details</h2>
          </div>
        </div>
        {loading ? (
          <p className="empty" role="status">
            Loading resident…
          </p>
        ) : (
          <form onSubmit={save}>
            <div className="form-grid resident-fields">
              <label className="field">
                Resident ID
                <input
                  aria-label="Resident ID"
                  value={resident?.id ?? id ?? ""}
                  placeholder="Generated automatically when saved"
                  readOnly
                />
              </label>
              <label className="field">
                Resident name
                <input
                  aria-label="Resident name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSuccess("");
                  }}
                  required
                  disabled={saving || loadError}
                  autoComplete="off"
                />
              </label>
            </div>
            {error && (
              <p className="form-feedback form-error" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="form-feedback form-success" role="status">
                {success}
              </p>
            )}
            <div className="form-actions">
              {loadError ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Retry connection
                </button>
              ) : (
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save resident"}
                </button>
              )}
              {!id && resident && (
                <Link
                  className="record-link"
                  href={`/residents/${resident.id}`}
                >
                  Open resident record
                </Link>
              )}
              <Link className="record-link" href="/residents">
                Back to residents
              </Link>
            </div>
          </form>
        )}
      </section>
      {id && resident && <ResidentPeriods residentId={id} />}
    </>
  );
}
