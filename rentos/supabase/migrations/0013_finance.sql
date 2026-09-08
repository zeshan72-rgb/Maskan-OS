-- =====================================================================
-- 0013_finance.sql — property_expenses, management_fees, owner_transactions,
-- owner_statements, owner_statement_items
-- =====================================================================

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null = system default
  name text not null,
  is_active boolean not null default true
);

create table property_expenses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  property_id uuid not null references properties(id),
  unit_id uuid references units(id),
  owner_id uuid references owners(id),
  maintenance_request_id uuid references maintenance_requests(id),
  vendor_id uuid references vendors(id),
  category_id uuid references expense_categories(id),
  description text,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  invoice_storage_path text,
  approval_status text not null default 'pending', -- pending|approved|rejected
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_property_expenses_updated_at before update on property_expenses
  for each row execute function set_updated_at();
create index idx_property_expenses_org on property_expenses(organisation_id);
create index idx_property_expenses_property on property_expenses(property_id);
create index idx_property_expenses_owner on property_expenses(owner_id);

create table management_fees (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  property_id uuid references properties(id),
  owner_id uuid references owners(id),
  fee_type text not null default 'percentage', -- percentage|flat|custom
  fee_value numeric(10,2) not null,
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now()
);
create index idx_management_fees_property on management_fees(property_id);
create index idx_management_fees_owner on management_fees(owner_id);

-- Ledger of every owner-facing financial movement (rent share, expense,
-- management fee, adjustment, payout). owner_statements aggregate these into
-- immutable monthly snapshots.
create table owner_transactions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  owner_id uuid not null references owners(id),
  property_id uuid references properties(id),
  transaction_type text not null, -- rent_income|other_income|expense|maintenance|management_fee|adjustment|payout
  amount numeric(12,2) not null, -- positive = credit to owner, negative = debit
  reference_table text,          -- e.g. 'payments', 'property_expenses'
  reference_id uuid,
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_owner_transactions_owner on owner_transactions(owner_id, transaction_date);
create index idx_owner_transactions_org on owner_transactions(organisation_id);

create table owner_statements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  owner_id uuid not null references owners(id),
  period_start date not null,
  period_end date not null,
  opening_balance numeric(12,2) not null default 0,
  rent_received numeric(12,2) not null default 0,
  other_income numeric(12,2) not null default 0,
  expenses numeric(12,2) not null default 0,
  maintenance_costs numeric(12,2) not null default 0,
  management_fees numeric(12,2) not null default 0,
  adjustments numeric(12,2) not null default 0,
  owner_payout numeric(12,2) not null default 0,
  closing_balance numeric(12,2) not null default 0,
  status text not null default 'draft', -- draft|finalised|revised
  version integer not null default 1,
  storage_path text, -- generated PDF
  finalised_by uuid references profiles(id),
  finalised_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, period_start, period_end, version)
);
create index idx_owner_statements_owner on owner_statements(owner_id);
create index idx_owner_statements_org on owner_statements(organisation_id);

create table owner_statement_items (
  id uuid primary key default gen_random_uuid(),
  owner_statement_id uuid not null references owner_statements(id) on delete cascade,
  owner_transaction_id uuid references owner_transactions(id),
  description text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index idx_owner_statement_items_statement on owner_statement_items(owner_statement_id);
