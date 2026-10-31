begin;
create table public.companies(id uuid primary key default gen_random_uuid(), name text not null check(btrim(name)<>''));
create table public.homes(id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies, name text not null check(btrim(name)<>''));
create table public.rooms(id uuid primary key default gen_random_uuid(), home_id uuid not null references public.homes, name text not null check(btrim(name)<>''), unique(id,home_id), unique(home_id,name));
create table public.funders(id uuid primary key default gen_random_uuid(), name text not null check(btrim(name)<>''), category text not null check(category in ('Local Authority','NHS ICB')), unique(name,category));
create table public.resident_periods(
 id uuid primary key default gen_random_uuid(), resident_id uuid not null references public.residents,
 home_id uuid not null references public.homes, room_id uuid not null,
 start_date date not null, end_date date, admission boolean not null, discharge boolean not null,
 stay_type text not null check(stay_type in ('Permanent','Respite','D2A')),
 care_type text not null check(care_type in ('Residential','Nursing','Residential dementia','Nursing dementia')),
 physical_occupancy boolean not null, financial_occupancy boolean not null, comments text not null default '',
 foreign key(room_id,home_id) references public.rooms(id,home_id),
 check(end_date is null or end_date>=start_date), check(not discharge or end_date is not null), unique(resident_id,start_date)
);
create table public.period_funding(
 id uuid primary key default gen_random_uuid(), period_id uuid not null references public.resident_periods,
 funding_type text not null check(funding_type in ('Private / Self-funded','Local Authority','NHS','FNC','Third-party top-up','Other')),
 funder_id uuid references public.funders, weekly_amount numeric(12,2) not null check(weekly_amount>=0 and weekly_amount<10000000000),
 check((funding_type in ('Local Authority','NHS','FNC')) = (funder_id is not null))
);
-- Reference maintenance must not invalidate historical funding categories.
create function public.guard_funder_category() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.category<>old.category and exists(select 1 from period_funding where funder_id=old.id) then
 raise exception 'A funder used in period history cannot change category; create a new reference instead';
 end if;
 return new;
end $$;
revoke all on function public.guard_funder_category() from public,anon,authenticated;
create trigger guard_funder_category before update on public.funders for each row execute function public.guard_funder_category();
create index on public.resident_periods(resident_id,start_date);
create index on public.period_funding(period_id);
-- Only the existing trusted local server may access these objects.
do $$ declare t text; begin
 foreach t in array array['companies','homes','rooms','funders','resident_periods','period_funding'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end $$;
-- Locking the resident serializes competing saves, including the first period.
create function public.save_resident_period(rid uuid, payload jsonb) returns uuid
language plpgsql security invoker set search_path = public,pg_temp as $$
declare p resident_periods; old resident_periods; prev resident_periods; nxt resident_periods; f jsonb; category_needed text; isnew boolean;
begin
 perform 1 from residents where id=rid for update;
 if not found then raise exception 'Resident not found'; end if;
 p := jsonb_populate_record(null::resident_periods,payload - 'funding');
 p.resident_id:=rid; p.comments:=coalesce(p.comments,''); isnew:=p.id is null;
 if isnew then p.id:=gen_random_uuid(); else
 select * into old from resident_periods where id=p.id and resident_id=rid;
 if not found then raise exception 'Period not found for this resident'; end if;
 end if;
 if p.start_date is null then raise exception 'Enter a start date'; end if;
 if not isnew and exists(select 1 from resident_periods where resident_id=rid and id<>p.id and ((start_date<old.start_date and start_date>=p.start_date) or (start_date>old.start_date and start_date<=p.start_date))) then
 raise exception 'A date correction cannot reorder periods'; end if;
 select * into prev from resident_periods where resident_id=rid and id<>p.id and start_date<p.start_date order by start_date desc limit 1;
 select * into nxt from resident_periods where resident_id=rid and id<>p.id and start_date>p.start_date order by start_date limit 1;
 if isnew and nxt.id is not null then raise exception 'Add Period must follow the latest period; edit existing history for corrections'; end if;
 if prev.id is null and not p.admission then raise exception 'The first period must mark an admission'; end if;
 if prev.id is not null then
 if isnew and p.home_id<>prev.home_id and not prev.discharge then
 if not p.admission then raise exception 'A transfer must mark admission to the receiving home'; end if;
 update resident_periods set discharge=true,end_date=p.start_date-1 where id=prev.id;
 elsif prev.discharge then
 if not p.admission then raise exception 'A period after discharge must mark a new admission'; end if;
 else
 if p.admission then raise exception 'A continuation cannot mark a new admission without discharge'; end if;
 if p.home_id<>prev.home_id then raise exception 'Historical home changes require explicit discharge and admission boundaries'; end if;
 update resident_periods set end_date=p.start_date-1 where id=prev.id;
 end if;
 end if;
 if nxt.id is not null then
 if not isnew and (p.admission<>old.admission or p.discharge<>old.discharge) then raise exception 'Do not change historical stay boundaries while a following period exists'; end if;
 if not p.discharge then
 if nxt.admission or nxt.home_id<>p.home_id then raise exception 'Conflicting stay boundary'; end if;
 if p.end_date is null then raise exception 'An open-ended period cannot precede another period'; end if;
 update resident_periods set start_date=p.end_date+1 where id=nxt.id;
 end if;
 end if;
 if isnew then insert into resident_periods select p.*;
 else update resident_periods set home_id=p.home_id,room_id=p.room_id,start_date=p.start_date,end_date=p.end_date,admission=p.admission,discharge=p.discharge,stay_type=p.stay_type,care_type=p.care_type,physical_occupancy=p.physical_occupancy,financial_occupancy=p.financial_occupancy,comments=p.comments where id=p.id;
 end if;
 if exists(select 1 from resident_periods a join resident_periods b on a.resident_id=b.resident_id and a.id<b.id and daterange(a.start_date,a.end_date,'[]') && daterange(b.start_date,b.end_date,'[]') where a.resident_id=rid) then raise exception 'Resident periods must not overlap'; end if;
 if jsonb_typeof(payload->'funding') is distinct from 'array' then raise exception 'Supply the funding breakdown'; end if;
 delete from period_funding where period_id=p.id;
 for f in select * from jsonb_array_elements(payload->'funding') loop
 category_needed:=case when f->>'funding_type'='Local Authority' then 'Local Authority' when f->>'funding_type' in ('NHS','FNC') then 'NHS ICB' end;
 if category_needed is not null and not exists(select 1 from funders where id=(f->>'funder_id')::uuid and category=category_needed) then raise exception 'Select a funder with the correct category'; end if;
 insert into period_funding(period_id,funding_type,funder_id,weekly_amount) values(p.id,f->>'funding_type',(f->>'funder_id')::uuid,(f->>'weekly_amount')::numeric);
 end loop;
 return p.id;
end $$;
revoke all on function public.save_resident_period(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.save_resident_period(uuid,jsonb) to service_role;
grant delete on public.period_funding to service_role;
-- Fictional starting reference records only; resident masters are untouched.
insert into companies(name) values('Example Care Group'),('Second Care Group');
insert into homes(company_id,name) select id,'Home A' from companies where name='Example Care Group';
insert into homes(company_id,name) select id,'Home B' from companies where name='Example Care Group';
insert into homes(company_id,name) select id,'Home C' from companies where name='Second Care Group';
insert into rooms(home_id,name) select id,'101' from homes;
insert into rooms(home_id,name) select id,'102' from homes;
insert into funders(name,category) values('Example Borough Council','Local Authority'),('Demo County Council','Local Authority'),('Example NHS Integrated Care Board','NHS ICB');
commit;
