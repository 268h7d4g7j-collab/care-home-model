import type { ResidentMaster } from "./resident-master";

export async function residentRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...options, cache: "no-store" });
  } catch {
    throw new Error(
      "The local server could not be reached. Your changes have not been saved.",
    );
  }
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error(
      "Resident storage is available only in the local application. Follow the Task 2A setup instructions to start it.",
    );
  }
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "The request failed. Your changes have not been saved.",
    );
  return result.data as T;
}

export const residentEndpoint = (id: string) =>
  `/api/residents/${encodeURIComponent(id)}`;
export const listResidents = () =>
  residentRequest<ResidentMaster[]>("/api/residents");
