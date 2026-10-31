export const companies = [
  { id: "example", name: "Example Care Group" },
  { id: "second", name: "Second Care Group" },
];
export const homes = [
  { id: "a", companyId: "example", name: "Home A" },
  { id: "b", companyId: "example", name: "Home B" },
  { id: "c", companyId: "second", name: "Home C" },
];
export const rooms = [
  { id: "a01", homeId: "a", name: "101" },
  { id: "a02", homeId: "a", name: "102" },
  { id: "b01", homeId: "b", name: "201" },
  { id: "c01", homeId: "c", name: "301" },
];
export const funders = [
  { id: "la1", type: "Local Authority", name: "Example Borough Council" },
  { id: "la2", type: "Local Authority", name: "Demo County Council" },
  { id: "nhs1", type: "NHS", name: "Example NHS Integrated Care Board" },
];
export const stayTypes = ["Permanent", "Respite", "D2A"] as const;
export const careTypes = [
  "Residential",
  "Nursing",
  "Residential dementia",
  "Nursing dementia",
] as const;
export const fundingTypes = [
  "Private / Self-funded",
  "Local Authority",
  "NHS",
  "FNC",
  "Third-party top-up",
  "Other",
] as const;
export type Funding = {
  id: string;
  type: (typeof fundingTypes)[number];
  funderId?: string;
  weeklyAmount: number;
};
export type Period = {
  id: string;
  start: string;
  end?: string;
  homeId: string;
  roomId: string;
  stayType: (typeof stayTypes)[number];
  careType: (typeof careTypes)[number];
  physicalOccupancy: boolean;
  financialOccupancy: boolean;
  comments: string;
  funding: Funding[];
};
export type Resident = { id: string; name: string; periods: Period[] };
export const residents: Resident[] = [
  {
    id: "RES-001",
    name: "Resident A",
    periods: [
      {
        id: "p1",
        start: "2025-01-06",
        end: "2025-03-31",
        homeId: "a",
        roomId: "a02",
        stayType: "Respite",
        careType: "Residential",
        physicalOccupancy: true,
        financialOccupancy: true,
        comments: "Fictional respite period before a permanent stay.",
        funding: [
          { id: "f1", type: "Private / Self-funded", weeklyAmount: 1100 },
        ],
      },
      {
        id: "p2",
        start: "2025-04-01",
        homeId: "a",
        roomId: "a01",
        stayType: "Permanent",
        careType: "Nursing",
        physicalOccupancy: true,
        financialOccupancy: true,
        comments:
          "Fictional ongoing placement. All information is demonstration data.",
        funding: [
          {
            id: "f2",
            type: "Local Authority",
            funderId: "la1",
            weeklyAmount: 950,
          },
          { id: "f3", type: "FNC", weeklyAmount: 250 },
          { id: "f4", type: "Third-party top-up", weeklyAmount: 100 },
        ],
      },
    ],
  },
  {
    id: "RES-002",
    name: "Resident B",
    periods: [
      {
        id: "p3",
        start: "2025-06-16",
        homeId: "b",
        roomId: "b01",
        stayType: "Permanent",
        careType: "Residential dementia",
        physicalOccupancy: true,
        financialOccupancy: true,
        comments: "Fictional self-funded placement.",
        funding: [
          { id: "f5", type: "Private / Self-funded", weeklyAmount: 1450 },
        ],
      },
    ],
  },
  {
    id: "RES-003",
    name: "Resident C",
    periods: [
      {
        id: "p4",
        start: "2025-09-01",
        homeId: "c",
        roomId: "c01",
        stayType: "D2A",
        careType: "Nursing dementia",
        physicalOccupancy: false,
        financialOccupancy: true,
        comments:
          "Fictional temporary absence; financial occupancy remains in place.",
        funding: [
          { id: "f6", type: "NHS", funderId: "nhs1", weeklyAmount: 1250 },
          { id: "f7", type: "Other", weeklyAmount: 50 },
        ],
      },
    ],
  },
];
export const chronologicalPeriods = (resident: Resident) =>
  [...resident.periods].sort((a, b) => a.start.localeCompare(b.start));
export const currentPeriod = (resident: Resident) =>
  chronologicalPeriods(resident).at(-1)!;
export const weeklyTotal = (period: Period) =>
  period.funding.reduce(
    (sum, entry) => sum + Math.round(entry.weeklyAmount * 100),
    0,
  ) / 100;
export const money = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    value,
  );
export const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value + "T00:00:00Z"))
    : "Ongoing";
export const homeName = (id: string) =>
  homes.find((home) => home.id === id)!.name;
export const roomName = (id: string) =>
  rooms.find((room) => room.id === id)!.name;
export function matchesScope(
  resident: Resident,
  company: string,
  home: string,
) {
  const period = currentPeriod(resident);
  return (
    (home === "all" || period.homeId === home) &&
    (company === "all" ||
      homes.find((item) => item.id === period.homeId)?.companyId === company)
  );
}
