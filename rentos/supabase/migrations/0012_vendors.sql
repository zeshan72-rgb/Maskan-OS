-- =====================================================================
-- 0012_vendors.sql — vendors, vendor_contacts, vendor_members,
-- vendor_documents, vendor_invoices
-- =====================================================================

create table vendors (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  trade text, -- plumbing|electrical|hvac|general|cleaning|other
  email text,
  phone text,
  cr_number text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_vendors_updated_at before update on vendors
  for each row execute function set_updated_at();
create index idx_vendors_org on vendors(organisation_id) where archived_at is null;

alter table organisation_members add constraint fk_org_members_vendor
  foreign key (vendor_id) references vendors(id) on delete set null;

alter table work_orders add column vendor_id uuid references vendors(id);
create index idx_work_orders_vendor on work_orders(vendor_id);

create table vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text
);
create index idx_vendor_contacts_vendor on vendor_contacts(vendor_id);

-- A profile can be a member of a vendor organisation (technician login).
create table vendor_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (vendor_id, profile_id)
);
create index idx_vendor_members_vendor on vendor_members(vendor_id);
create index idx_vendor_members_profile on vendor_members(profile_id);

create table vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  category document_category not null default 'other',
  title text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index idx_vendor_documents_vendor on vendor_documents(vendor_id);

create table vendor_invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  work_order_id uuid references work_orders(id),
  invoice_number text,
  amount numeric(12,2) not null,
  storage_path text,
  status text not null default 'submitted', -- submitted|approved|paid|rejected
  created_at timestamptz not null default now()
);
create index idx_vendor_invoices_vendor on vendor_invoices(vendor_id);
create index idx_vendor_invoices_wo on vendor_invoices(work_order_id);

-- Helper used by RLS: is the current user a member of vendor_id?
create or replace function is_vendor_member(v_id uuid)
returns boolean language sql stable as $$
  select is_platform_super_admin() or exists (
    select 1 from vendor_members vm where vm.vendor_id = v_id and vm.profile_id = auth.uid() and vm.is_active
  );
$$;
