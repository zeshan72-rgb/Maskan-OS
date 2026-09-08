-- =====================================================================
-- 0003_subscriptions.sql — plans, organisation_subscriptions, subscription_events
-- =====================================================================

create table plans (
  id uuid primary key default gen_random_uuid(),
  key text not null unique, -- trial|starter|growth|professional|enterprise
  name text not null,
  max_units integer,        -- null = unlimited
  max_users integer,
  storage_mb integer,
  monthly_price_qar numeric(10,2),
  features jsonb not null default '{}'::jsonb, -- feature flags this plan unlocks
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table organisation_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status text not null default 'active', -- active|past_due|cancelled
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  assigned_by uuid references profiles(id), -- set when Super Admin manually assigns
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_org_subs_updated_at before update on organisation_subscriptions
  for each row execute function set_updated_at();
create index idx_org_subs_org on organisation_subscriptions(organisation_id);

create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  organisation_subscription_id uuid not null references organisation_subscriptions(id) on delete cascade,
  event_type text not null, -- created|upgraded|downgraded|cancelled|renewed|payment_failed
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_sub_events_sub on subscription_events(organisation_subscription_id);
