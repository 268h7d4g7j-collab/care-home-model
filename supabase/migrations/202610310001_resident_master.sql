-- Apply to Supabase project hmgzswvngsehrazfzwsf using the SQL editor
-- or the Supabase CLI. No resident-period or funding tables are created.
begin;

create table public.residents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0)
);

alter table public.residents enable row level security;
alter table public.residents force row level security;

-- No browser role may read or write resident information. No policies are
-- created until an authentication and tenant-authorization model is agreed.
revoke all on table public.residents from public, anon, authenticated;
grant select, insert, update on table public.residents to service_role;

comment on table public.residents is
  'Resident master only. Local trusted-server access until authentication is specified.';

commit;
