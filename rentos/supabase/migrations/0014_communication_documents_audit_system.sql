-- =====================================================================
-- 0014 — notifications, notification_preferences, communication_logs,
-- documents, document_categories(templates), audit_logs,
-- feature_flags, integration_connections, webhook_events, app_settings
-- =====================================================================

-- ---------------------------------------------------------------------
-- Communication
-- ---------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null, -- rent_upcoming|rent_overdue|payment_confirmed|payment_rejected|cheque_due|cheque_bounced|lease_expiring|renewal_offer|maintenance_update|work_assigned|document_required
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_profile on notifications(profile_id, is_read);
create index idx_notifications_org on notifications(organisation_id);

create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  notification_type text not null,
  channel notification_channel not null,
  is_enabled boolean not null default true,
  unique (profile_id, notification_type, channel)
);

create table communication_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  channel notification_channel not null,
  recipient text not null, -- email address / phone number
  profile_id uuid references profiles(id),
  template_key text,
  subject text,
  status text not null default 'queued', -- queued|sent|failed|delivered
  provider text,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index idx_comm_logs_org on communication_logs(organisation_id);
create index idx_comm_logs_profile on communication_logs(profile_id);

-- ---------------------------------------------------------------------
-- Documents (generic uploads + lease template infrastructure)
-- ---------------------------------------------------------------------
create table document_categories (
  id uuid primary key default gen_random_uuid(),
  key document_category not null unique,
  label text not null
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  category document_category not null default 'other',
  title text not null,
  storage_path text not null,
  related_table text, -- e.g. 'tenants', 'leases', 'properties'
  related_id uuid,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_documents_org on documents(organisation_id);
create index idx_documents_related on documents(related_table, related_id);

create table document_templates (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null = system sample template
  name text not null,
  locale text not null default 'en',
  body_html text not null, -- contains {{variable}} placeholders
  is_sample boolean not null default true,
  created_at timestamptz not null default now()
);

alter table lease_documents add constraint fk_lease_documents_template
  foreign key (generated_from_template_id) references document_templates(id);

-- ---------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null for platform-level actions
  actor_id uuid references profiles(id),
  action text not null, -- e.g. 'lease.created', 'payment.recorded', 'permissions.modified'
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_org on audit_logs(organisation_id, created_at desc);
create index idx_audit_logs_entity on audit_logs(entity_table, entity_id);
create index idx_audit_logs_actor on audit_logs(actor_id);

create or replace function write_audit_log(
  p_org_id uuid, p_action text, p_entity_table text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer as $$
begin
  insert into audit_logs (organisation_id, actor_id, action, entity_table, entity_id, metadata)
  values (p_org_id, auth.uid(), p_action, p_entity_table, p_entity_id, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------
-- System
-- ---------------------------------------------------------------------
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null = platform default
  key text not null, -- online_payments|whatsapp|ai_document_extraction|white_label|advanced_reporting
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (organisation_id, key)
);

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  provider_type text not null, -- payment|email|whatsapp
  provider_key text not null,  -- e.g. 'skipcash', 'resend', 'whatsapp_business'
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb, -- non-secret config only; secrets live in env/secret manager
  connected_by uuid references profiles(id),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, provider_type, provider_key)
);
create index idx_integration_connections_org on integration_connections(organisation_id);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null, -- 'payment_provider' | 'whatsapp' | 'email_provider'
  event_type text,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create table app_settings (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id) on delete cascade, -- null = platform-level
  key text not null,
  value jsonb not null default '{}'::jsonb,
  unique (organisation_id, key)
);
