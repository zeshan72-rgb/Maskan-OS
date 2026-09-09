-- =====================================================================
-- 0008_rent.sql — rent_schedules, rent_instalments, charges, credits
-- =====================================================================

create table rent_schedules (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  frequency payment_frequency not null,
  generated_at timestamptz not null default now(),
  generated_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_rent_schedules_lease on rent_schedules(lease_id);

create table rent_instalments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  rent_schedule_id uuid not null references rent_schedules(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  instalment_number integer not null,
  due_date date not null,
  original_amount numeric(12,2) not null,
  outstanding_amount numeric(12,2) not null,
  status instalment_status not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rent_schedule_id, instalment_number),
  constraint chk_outstanding_nonneg check (outstanding_amount >= 0)
);
create trigger trg_rent_instalments_updated_at before update on rent_instalments
  for each row execute function set_updated_at();
create index idx_rent_instalments_org on rent_instalments(organisation_id);
create index idx_rent_instalments_lease on rent_instalments(lease_id);
create index idx_rent_instalments_due_date on rent_instalments(due_date);
create index idx_rent_instalments_status on rent_instalments(status);

-- One-off charges (e.g. late fee, utility recharge) tied to a lease, distinct
-- from the base rent instalments.
create table charges (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(12,2) not null,
  due_date date not null,
  outstanding_amount numeric(12,2) not null,
  status instalment_status not null default 'upcoming',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_charges_lease on charges(lease_id);

create table credits (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  reason text not null,
  amount numeric(12,2) not null,
  remaining_amount numeric(12,2) not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_credits_lease on credits(lease_id);

-- Recalculates an instalment's status from its outstanding_amount and due_date.
-- Called by triggers after any payment allocation changes outstanding_amount.
create or replace function recompute_instalment_status(instalment_id uuid)
returns void language plpgsql as $$
declare
  r rent_instalments%rowtype;
begin
  select * into r from rent_instalments where id = instalment_id for update;
  if not found then return; end if;
  if r.status = 'waived' then return; end if;

  if r.outstanding_amount <= 0 then
    update rent_instalments set status = 'paid' where id = instalment_id;
  elsif r.outstanding_amount < r.original_amount then
    update rent_instalments set status = 'partial' where id = instalment_id;
  elsif r.due_date < current_date then
    update rent_instalments set status = 'overdue' where id = instalment_id;
  elsif r.due_date = current_date then
    update rent_instalments set status = 'due' where id = instalment_id;
  else
    update rent_instalments set status = 'upcoming' where id = instalment_id;
  end if;
end;
$$;

-- Generates the full instalment schedule for a lease based on its frequency.
-- Idempotent: safe to call once at activation; raises if a schedule already exists.
create or replace function generate_rent_schedule(p_lease_id uuid, p_actor uuid default null)
returns uuid language plpgsql as $$
declare
  v_lease leases%rowtype;
  v_schedule_id uuid;
  v_months_step integer;
  v_period_count integer;
  v_period_amount numeric(12,2);
  v_due date;
  i integer;
begin
  select * into v_lease from leases where id = p_lease_id for update;
  if not found then raise exception 'Lease % not found', p_lease_id; end if;

  if exists (select 1 from rent_schedules where lease_id = p_lease_id) then
    raise exception 'Rent schedule already generated for lease %', p_lease_id;
  end if;

  v_months_step := case v_lease.payment_frequency
    when 'monthly' then 1
    when 'quarterly' then 3
    when 'semiannual' then 6
    when 'annual' then 12
    else 1 -- 'custom' defaults to monthly; refine via UI after generation
  end;

  v_period_count := ceil(
    (extract(year from age(v_lease.end_date, v_lease.start_date)) * 12
     + extract(month from age(v_lease.end_date, v_lease.start_date)))::numeric / v_months_step
  )::integer;
  if v_period_count < 1 then v_period_count := 1; end if;

  v_period_amount := round((v_lease.monthly_rent * v_months_step)::numeric, 2);

  insert into rent_schedules (lease_id, frequency, generated_by)
  values (p_lease_id, v_lease.payment_frequency, p_actor)
  returning id into v_schedule_id;

  v_due := v_lease.start_date;
  for i in 1..v_period_count loop
    insert into rent_instalments (
      organisation_id, rent_schedule_id, lease_id, instalment_number,
      due_date, original_amount, outstanding_amount, status
    ) values (
      v_lease.organisation_id, v_schedule_id, p_lease_id, i,
      v_due, v_period_amount, v_period_amount,
      -- Explicit cast: a CASE returns text and Postgres will not implicitly
      -- coerce it to instalment_status here. Without this, every call to
      -- generate_rent_schedule fails, which breaks lease activation.
      -- Fixed 2026-09-08.
      (case when v_due < current_date then 'overdue'
            when v_due = current_date then 'due'
            else 'upcoming' end)::instalment_status
    );
    v_due := v_due + make_interval(months => v_months_step);
  end loop;

  return v_schedule_id;
end;
$$;
