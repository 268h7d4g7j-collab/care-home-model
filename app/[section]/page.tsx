import { ReferenceData } from "@/components/reference-data";
import { notFound } from "next/navigation";
import { Placeholder } from "@/components/placeholder";
const titles: Record<string, string> = {
  occupancy: "Occupancy",
  revenue: "Revenue",
  settings: "Settings",
};
export function generateStaticParams() {
  return Object.keys(titles).map((section) => ({ section }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!titles[section]) notFound();
  if (section === "settings") return <ReferenceData />;
  return <Placeholder title={titles[section]} />;
}
