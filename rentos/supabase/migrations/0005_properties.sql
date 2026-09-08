-- =====================================================================
-- 0005_properties.sql — properties, buildings, units, property_owners,
-- unit_owners, property_documents
-- =====================================================================

create table properties (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  property_code text not null,
  type property_type not null default 'residential',
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  description text,
  image_url text,
  management_fee_type text default 'percentage', -- percentage|flat|custom
  management_fee_value numeric(10,2) default 0,
  archived_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, property_code)
);
create trigger trg_properties_updated_at before update on properties
  for each row execute function set_updated_at();
create index idx_properties_org on properties(organisation_id) where archived_at is null;
create index idx_properties_search on properties using gin (name gin_trgm_ops);

create table buildings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  floors integer,
  created_at timestamptz not null default now()
);
create index idx_buildings_property on buildings(property_id);

create table units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  building_id uuid references buildings(id) on delete set null,
  unit_number text not null,
  internal_code text,
  floor text,
  bedrooms integer,
  bathrooms integer,
  area_sqm numeric(10,2),
  unit_type text, -- studio|1br|2br|3br|office|shop|warehouse|other
  furnishing text default 'unfurnished', -- furnished|semi_furnished|unfurnished
  market_rent numeric(12,2),
  current_rent numeric(12,2),
  status unit_status not null default 'vacant',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, unit_number)
);
create trigger trg_units_updated_at before update on units
  for each row execute function set_updated_at();
create index idx_units_org on units(organisation_id) where archived_at is null;
create index idx_units_property on units(property_id);
create index idx_units_status on units(status);

-- Ownership can be split across owners at the property level and/or overridden per unit.
create table property_owners (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  ownership_percentage numeric(5,2) not null default 100,
  created_at timestamptz not null default now(),
  unique (property_id, owner_id)
);
create index idx_property_owners_property on property_owners(property_id);
create index idx_property_owners_owner on property_owners(owner_id);

create table unit_owners (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  ownership_percentage numeric(5,2) not null default 100,
  created_at timestamptz not null default now(),
  unique (unit_id, owner_id)
);
create index idx_unit_owners_unit on unit_owners(unit_id);
create index idx_unit_owners_owner on unit_owners(owner_id);

create table property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  category document_category not null default 'other',
  title text not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_property_documents_property on property_documents(property_id);
