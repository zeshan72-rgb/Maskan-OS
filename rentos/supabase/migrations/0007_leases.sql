-- =====================================================================
-- 0007_leases.sql — leases, lease_parties, lease_documents, lease_events,
-- lease_renewal_offers
-- =====================================================================

create table leases (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  property_id uuid not null references properties(id),
  unit_id uuid not null references units(id),
  owner_id uuid references owners(id),
  tenant_id uuid not null references tenants(id),
  lease_code text not null,
  start_date date not null,
  end_date date not null,
  monthly_rent numeric(12,2) not null,
  total_contract_rent numeric(12,2) not null,
  security_deposit numeric(12,2) not null default 0,
  payment_frequency payment_frequency not null default 'monthly',
  payment_method payment_method not null default 'bank_transfer',
  grace_period_days integer not null default 0,
  status lease_status not null default 'draft',
  notes text,
  previous_lease_id uuid references leases(id), -- set when this lease is a renewal successor
  activated_at timestamptz,
  terminated_at timestamptz,
  termination_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, lease_code),
  constraint chk_lease_dates check (end_date > start_date)
);
create trigger trg_leases_updated_at before update on leases
  for each row execute function set_updated_at();
create index idx_leases_org on leases(organisation_id);
create index idx_leases_property on leases(property_id);
create index idx_leases_unit on leases(unit_id);
create index idx_leases_tenant on leases(tenant_id);
create index idx_leases_status on leases(status);
create index idx_leases_end_date on leases(end_date);

-- Enforce sane state transitions server-side (also enforced in app layer);
-- this trigger blocks the impossible jumps regardless of caller.
create or replace function enforce_lease_status_transition()
returns trigger language plpgsql as $$
declare
  allowed boolean;
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;
  allowed := case old.status
    when 'draft' then new.status in ('pending', 'active', 'terminated')
    when 'pending' then new.status in ('active', 'draft', 'terminated')
    when 'active' then new.status in ('expiring', 'renewal_offered', 'terminated', 'expired')
    when 'expiring' then new.status in ('renewal_offered', 'renewed', 'expired', 'terminated')
    when 'renewal_offered' then new.status in ('renewed', 'expiring', 'active', 'terminated')
    when 'renewed' then false            -- terminal: successor lease takes over
    when 'expired' then new.status in ('renewed') -- only via an explicit backfilled renewal
    when 'terminated' then false          -- terminal
    else false
  end;
  if not allowed then
    raise exception 'Invalid lease status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
create trigger trg_lease_status_transition before update of status on leases
  for each row execute function enforce_lease_status_transition();

create table lease_parties (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  party_type text not null, -- co_tenant|guarantor
  name text not null,
  qid_or_passport text,
  phone text,
  created_at timestamptz not null default now()
);
create index idx_lease_parties_lease on lease_parties(lease_id);

create table lease_documents (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  title text not null,
  storage_path text,
  generated_from_template_id uuid, -- fk added after document_templates exists (0015)
  is_signed boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_lease_documents_lease on lease_documents(lease_id);

create table lease_events (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  event_type text not null, -- created|activated|renewed|terminated|status_changed
  from_status lease_status,
  to_status lease_status,
  notes text,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_lease_events_lease on lease_events(lease_id);

create table lease_renewal_offers (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references leases(id) on delete cascade,
  new_start_date date not null,
  new_end_date date not null,
  new_monthly_rent numeric(12,2) not null,
  new_security_deposit numeric(12,2),
  notes text,
  status renewal_offer_status not null default 'pending',
  responded_at timestamptz,
  response_notes text,
  successor_lease_id uuid references leases(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_renewal_offers_lease on lease_renewal_offers(lease_id);
