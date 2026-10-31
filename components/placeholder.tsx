"use client";
import { PanelsTopLeft } from "lucide-react";
import { PageHeading } from "./shell";
export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeading
        title={title}
        description={`Your ${title.toLowerCase()} workspace.`}
      />
      <section className="placeholder card">
        <span className="placeholder-icon">
          <PanelsTopLeft size={32} />
        </span>
        <span className="eyebrow">APPLICATION FOUNDATION</span>
        <h2>{title}</h2>
        <p>This screen is a placeholder for a future module.</p>
        <p className="muted">
          Explore the Residents screen to view the demonstration layout.
        </p>
        <span className="tag">Demonstration only</span>
      </section>
    </>
  );
}
