export type Reference = {
  id: string;
  name: string;
  company_id?: string;
  home_id?: string;
  category?: string;
};
export type References = Record<
  "companies" | "homes" | "rooms" | "funders",
  Reference[]
>;
export type FundingEntry = {
  funding_type: string;
  funder_id: string | null;
  weekly_amount: string | number;
};
export type ResidentPeriod = {
  id?: string;
  home_id: string;
  room_id: string;
  start_date: string;
  end_date: string | null;
  admission: boolean;
  discharge: boolean;
  stay_type: string;
  care_type: string;
  physical_occupancy: boolean;
  financial_occupancy: boolean;
  comments: string;
  funding: FundingEntry[];
};
