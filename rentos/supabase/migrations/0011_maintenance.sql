-- =====================================================================
-- 0011_maintenance.sql — maintenance_requests, maintenance_comments,
-- maintenance_attachments, work_orders, work_order_events
-- =====================================================================

create table maintenance_categories (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null = system default
  name text not null,
  is_active boolean not null default true
);

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  property_id uuid not null references properties(id),
  unit_id uuid not null references units(id),
  tenant_id uuid references tenants(id),
  lease_id uuid references leases(id),
  category_id uuid references maintenance_categories(id),
  priority maintenance_priority not null default 'normal',
  status maintenance_status not null default 'submitted',
  description text not null,
  access_notes text,
  preferred_time text,
  request_code text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, request_code)
);
create trigger trg_maintenance_requests_updated_at before update on maintenance_requests
  for each row execute function set_updated_at();
create index idx_maint_requests_org on maintenance_requests(organisation_id);
create index idx_maint_requests_unit on maintenance_requests(unit_id);
create index idx_maint_requests_tenant on maintenance_requests(tenant_id);
create index idx_maint_requests_status on maintenance_requests(status);
create index idx_maint_requests_priority on maintenance_requests(priority);

create table maintenance_comments (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references maintenance_requests(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  is_internal boolean not null default false, -- internal notes hidden from tenant
  created_at timestamptz not null default now()
);
create index idx_maint_comments_request on maintenance_comments(maintenance_request_id);

create table maintenance_attachments (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references maintenance_requests(id) on delete cascade,
  storage_path text not null,
  file_type text,
  stage text default 'reported', -- reported|before|after
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_maint_attachments_request on maintenance_attachments(maintenance_request_id);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  maintenance_request_id uuid not null references maintenance_requests(id) on delete cascade,
  -- vendor_id is added in 0012_vendors.sql, once the vendors table exists.
  -- A placeholder FK to a nonexistent table stood here and made this
  -- migration unrunnable; removed 2026-09-08.
  assigned_employee_id uuid references profiles(id),
  scheduled_at timestamptz,
  estimated_cost numeric(12,2),
  approved_amount numeric(12,2),
  actual_amount numeric(12,2),
  instructions text,
  status maintenance_status not null default 'assigned',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- work_order_events was named in this file's header, declared in
-- types/database.ts, given RLS policies in 0015, and written to by
-- features/maintenance/actions.ts in two places, but the CREATE TABLE was
-- missing. Restored 2026-09-08 from the shape the application expects.
create table work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  event_type text not null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_work_order_events_wo on work_order_events(work_order_id);
