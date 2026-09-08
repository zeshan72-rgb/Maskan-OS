-- =====================================================================
-- 0004_owners.sql — owners, owner_contacts, owner_bank_accounts
-- =====================================================================

create table owners (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  kind text not null default 'individual', -- individual|company
  name text not null,
  qid_or_cr text,
  email text,
  phone text,
  address text,
  notes text,
  archived_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_owners_updated_at before update on owners
  for each row execute function set_updated_at();
create index idx_owners_org on owners(organisation_id) where archived_at is null;
create index idx_owners_search on owners using gin (name gin_trgm_ops);

alter table organisation_members add constraint fk_org_members_owner
  foreign key (owner_id) references owners(id) on delete set null;

create table owner_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index idx_owner_contacts_owner on owner_contacts(owner_id);

-- Bank details are sensitive: full account numbers are only ever selected by
-- server-side code for roles with the finance.bank_details.view permission
-- (see lib/permissions). RLS still scopes rows to the owning organisation.
create table owner_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  bank_name text not null,
  account_holder_name text not null,
  account_number text not null,
  iban text,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_owner_bank_accounts_owner on owner_bank_accounts(owner_id);
