-- =====================================================================
-- 0001_extensions_and_helpers.sql
-- Extensions, shared enum types, and helper functions used across all
-- later migrations (updated_at trigger, current org/role helpers for RLS).
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- trigram search for global search

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Shared enums
-- ---------------------------------------------------------------------
create type member_role_key as enum (
  'platform_super_admin',
  'org_owner',
  'org_admin',
  'property_manager',
  'accountant',
  'maintenance_manager',
  'staff',
  'property_owner',
  'tenant',
  'vendor'
);

create type org_status as enum ('trial', 'active', 'suspended', 'cancelled');

create type invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create type property_type as enum (
  'residential', 'commercial', 'mixed_use', 'villa_compound', 'building', 'other'
);

create type unit_status as enum ('vacant', 'occupied', 'reserved', 'maintenance', 'inactive');

create type lease_status as enum (
  'draft', 'pending', 'active', 'expiring', 'renewal_offered',
  'renewed', 'expired', 'terminated'
);

create type payment_frequency as enum ('monthly', 'quarterly', 'semiannual', 'annual', 'custom');

create type instalment_status as enum ('upcoming', 'due', 'partial', 'paid', 'overdue', 'waived');

create type payment_method as enum ('cheque', 'bank_transfer', 'cash', 'online', 'other');

create type payment_status as enum ('pending_verification', 'confirmed', 'rejected', 'refunded', 'failed');

create type cheque_status as enum (
  'received', 'stored', 'due_soon', 'submitted', 'cleared', 'bounced', 'replaced', 'cancelled'
);

create type maintenance_priority as enum ('low', 'normal', 'high', 'emergency');

create type maintenance_status as enum (
  'submitted', 'reviewing', 'assigned', 'scheduled', 'in_progress',
  'waiting', 'completed', 'closed', 'cancelled'
);

create type document_category as enum (
  'qid', 'passport', 'lease', 'ownership', 'cr', 'bank_document',
  'receipt', 'invoice', 'maintenance', 'other'
);

create type renewal_offer_status as enum ('pending', 'accepted', 'declined', 'discussion_requested', 'expired');

create type notification_channel as enum ('in_app', 'email', 'whatsapp', 'sms');

-- Soft-delete convention: tables that must never be hard-deleted (financial /
-- tenancy records) get an `archived_at timestamptz` column instead of being
-- removed from the DB. Application code and RLS filter on archived_at is null
-- by default.
