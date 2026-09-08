-- =====================================================================
-- 0009_payments.sql — payments, payment_allocations, payment_evidence,
-- payment_provider_events, bank_accounts
-- =====================================================================

-- Organisation's own bank accounts (for receiving bank transfers), distinct
-- from owner_bank_accounts (used for owner payouts).
create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  iban text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_bank_accounts_org on bank_accounts(organisation_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lease_id uuid not null references leases(id),
  tenant_id uuid not null references tenants(id),
  amount numeric(12,2) not null check (amount > 0),
  method payment_method not null,
  status payment_status not null default 'pending_verification',
  reference text,
  payer_name text,
  paid_at date not null default current_date,
  note text,
  bank_account_id uuid references bank_accounts(id),
  cheque_id uuid, -- fk added in 0010_cheques.sql
  provider text,  -- online provider key, e.g. 'stripe', 'skipcash'
  provider_payment_id text,
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  rejected_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payments_updated_at before update on payments
  for each row execute function set_updated_at();
create index idx_payments_org on payments(organisation_id);
create index idx_payments_lease on payments(lease_id);
create index idx_payments_status on payments(status);
create index idx_payments_reference on payments(reference);

-- A confirmed payment can be split across multiple instalments/charges.
create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  rent_instalment_id uuid references rent_instalments(id),
  charge_id uuid references charges(id),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint chk_allocation_target check (
    (rent_instalment_id is not null)::int + (charge_id is not null)::int = 1
  )
);
create index idx_payment_allocations_payment on payment_allocations(payment_id);
create index idx_payment_allocations_instalment on payment_allocations(rent_instalment_id);

create table payment_evidence (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  storage_path text not null,
  file_type text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_payment_evidence_payment on payment_evidence(payment_id);

-- Raw webhook events from payment providers, kept for idempotency + audit.
create table payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null, -- provider's unique event id, used for idempotency
  event_type text not null,
  payment_id uuid references payments(id),
  payload jsonb not null,
  signature_verified boolean not null default false,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);
create index idx_provider_events_payment on payment_provider_events(payment_id);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  payment_id uuid not null references payments(id) on delete cascade,
  receipt_number text not null,
  storage_path text,
  created_at timestamptz not null default now(),
  unique (organisation_id, receipt_number)
);
create index idx_receipts_payment on receipts(payment_id);

-- Applying/removing a payment allocation keeps the instalment's
-- outstanding_amount and derived status in sync — this is the mechanism
-- that implements "payments and rent obligations are separate records".
create or replace function apply_payment_allocation()
returns trigger language plpgsql as $$
begin
  if new.rent_instalment_id is not null then
    update rent_instalments
      set outstanding_amount = outstanding_amount - new.amount
      where id = new.rent_instalment_id;
    perform recompute_instalment_status(new.rent_instalment_id);
  elsif new.charge_id is not null then
    update charges
      set outstanding_amount = outstanding_amount - new.amount
      where id = new.charge_id;
  end if;
  return new;
end;
$$;
create trigger trg_apply_payment_allocation after insert on payment_allocations
  for each row execute function apply_payment_allocation();

create or replace function reverse_payment_allocation()
returns trigger language plpgsql as $$
begin
  if old.rent_instalment_id is not null then
    update rent_instalments
      set outstanding_amount = outstanding_amount + old.amount
      where id = old.rent_instalment_id;
    perform recompute_instalment_status(old.rent_instalment_id);
  elsif old.charge_id is not null then
    update charges
      set outstanding_amount = outstanding_amount + old.amount
      where id = old.charge_id;
  end if;
  return old;
end;
$$;
create trigger trg_reverse_payment_allocation after delete on payment_allocations
  for each row execute function reverse_payment_allocation();
