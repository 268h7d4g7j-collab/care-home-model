import { notFound } from "next/navigation";
import { residents } from "@/lib/data";
import { ResidentDetail } from "@/components/resident-detail";
export function generateStaticParams() {
  return residents.map((resident) => ({ id: resident.id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = residents.find((item) => item.id === id);
  if (!resident) notFound();
  return <ResidentDetail resident={resident} />;
}
