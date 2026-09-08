-- =====================================================================
-- 0006_tenants.sql — tenants, tenant_contacts, tenant_documents, occupants
-- =====================================================================

create table tenants (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  qid_or_passport text,
  nationality text,
  email text,
  phone text,
  employer text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  archived_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tenants_updated_at before update on tenants
  for each row execute function set_updated_at();
create index idx_tenants_org on tenants(organisation_id) where archived_at is null;
create index idx_tenants_search on tenants using gin (name gin_trgm_ops);
create index idx_tenants_phone on tenants(phone);
create index idx_tenants_qid on tenants(qid_or_passport);

alter table organisation_members add constraint fk_org_members_tenant
  foreign key (tenant_id) references tenants(id) on delete set null;

create table tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  relationship text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index idx_tenant_contacts_tenant on tenant_contacts(tenant_id);

create table tenant_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category document_category not null default 'other',
  title text not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_tenant_documents_tenant on tenant_documents(tenant_id);

create table occupants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  relationship text,
  qid_or_passport text,
  created_at timestamptz not null default now()
);
create index idx_occupants_tenant on occupants(tenant_id);
