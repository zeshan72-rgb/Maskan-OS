-- =====================================================================
-- 0002_identity.sql
-- profiles, organisations, organisation_members, invitations,
-- roles, permissions, role_permissions, member_roles
-- =====================================================================

-- One row per Supabase auth user, mirrors auth.users for convenient joins.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  locale text not null default 'en',
  is_platform_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  email text,
  phone text,
  address text,
  status org_status not null default 'trial',
  locale text not null default 'en',
  currency text not null default 'QAR',
  timezone text not null default 'Asia/Qatar',
  branding jsonb not null default '{}'::jsonb, -- logo url, primary colour, email identity
  onboarding_step text not null default 'company', -- company|portfolio|team|payment|import|complete
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organisations_updated_at before update on organisations
  for each row execute function set_updated_at();
create index idx_organisations_status on organisations(status);

-- Canonical role catalogue. Seeded with the fixed system roles; orgs may
-- later add custom roles (is_system = false) built from the same
-- permission model.
create table roles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null = system role, available to all orgs
  key member_role_key,           -- set for system roles, null for custom roles
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index uq_roles_system_key on roles(key) where organisation_id is null;
create index idx_roles_org on roles(organisation_id);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- e.g. 'properties.create', 'payments.confirm'
  category text not null,
  description text
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Membership of a profile in an organisation (one profile can belong to many
-- orgs, e.g. a vendor working across several PM companies).
create table organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_active boolean not null default true,
  -- convenience pointers when this member IS an owner/tenant/vendor record
  owner_id uuid,   -- fk added in 0004_owners.sql
  tenant_id uuid,  -- fk added in 0006_tenants.sql
  vendor_id uuid,  -- fk added in 0012_vendors.sql
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, profile_id)
);
create trigger trg_org_members_updated_at before update on organisation_members
  for each row execute function set_updated_at();
create index idx_org_members_org on organisation_members(organisation_id);
create index idx_org_members_profile on organisation_members(profile_id);

create table member_roles (
  organisation_member_id uuid not null references organisation_members(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (organisation_member_id, role_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  role_id uuid not null references roles(id),
  -- optional linkage so an invited owner/tenant/vendor is bound to their record on acceptance
  owner_id uuid,
  tenant_id uuid,
  vendor_id uuid,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status invitation_status not null default 'pending',
  invited_by uuid references profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_invitations_org on invitations(organisation_id);
create index idx_invitations_email on invitations(email);
create index idx_invitations_token on invitations(token);

-- Helper: current user's profile id (wraps auth.uid() for readability)
create or replace function current_profile_id()
returns uuid language sql stable as $$
  select auth.uid();
$$;

create or replace function is_platform_super_admin()
returns boolean language sql stable as $$
  select coalesce((select p.is_platform_super_admin from profiles p where p.id = auth.uid()), false);
$$;

-- Returns the set of organisation_ids the current user is an active member of.
create or replace function my_organisation_ids()
returns setof uuid language sql stable as $$
  select om.organisation_id from organisation_members om
  where om.profile_id = auth.uid() and om.is_active = true;
$$;

create or replace function is_org_member(org_id uuid)
returns boolean language sql stable as $$
  select is_platform_super_admin() or exists (
    select 1 from organisation_members om
    where om.organisation_id = org_id and om.profile_id = auth.uid() and om.is_active = true
  );
$$;

-- Returns true if current user holds ANY of the given system role keys in org_id.
create or replace function has_role(org_id uuid, variadic role_keys member_role_key[])
returns boolean language sql stable as $$
  select is_platform_super_admin() or exists (
    select 1
    from organisation_members om
    join member_roles mr on mr.organisation_member_id = om.id
    join roles r on r.id = mr.role_id
    where om.organisation_id = org_id
      and om.profile_id = auth.uid()
      and om.is_active = true
      and r.key = any(role_keys)
  );
$$;

create or replace function has_permission(org_id uuid, perm_code text)
returns boolean language sql stable as $$
  select is_platform_super_admin() or exists (
    select 1
    from organisation_members om
    join member_roles mr on mr.organisation_member_id = om.id
    join role_permissions rp on rp.role_id = mr.role_id
    join permissions p on p.id = rp.permission_id
    where om.organisation_id = org_id
      and om.profile_id = auth.uid()
      and om.is_active = true
      and p.code = perm_code
  );
$$;
