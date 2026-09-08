-- =====================================================================
-- 0017_reference_data.sql
-- Reference/catalogue data the application requires to function in ANY
-- environment (including production): permission codes, system roles and
-- their default permission grants, subscription plans, and default
-- category lists. This is deliberately separate from
-- supabase/seed/demo_seed.sql, which contains fictional demo records and
-- must never run against production.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------
insert into permissions (code, category, description) values
  ('owners.manage', 'owners', 'Create and edit owner records'),
  ('properties.manage', 'properties', 'Create and edit properties and units'),
  ('tenants.manage', 'tenants', 'Create and edit tenant records'),
  ('leases.manage', 'leases', 'Create, activate and edit leases'),
  ('payments.manage', 'payments', 'Record, confirm and reject payments; manage cheques'),
  ('maintenance.manage', 'maintenance', 'Manage maintenance requests and work orders'),
  ('vendors.manage', 'vendors', 'Create and edit vendor records'),
  ('finance.bank_details.view', 'finance', 'View owner/organisation bank account numbers'),
  ('finance.bank_details.manage', 'finance', 'Edit owner/organisation bank account numbers'),
  ('finance.expenses.manage', 'finance', 'Record and approve property expenses'),
  ('finance.statements.manage', 'finance', 'Generate and finalise owner statements'),
  ('finance.settings.manage', 'finance', 'Configure management fee rules'),
  ('documents.manage', 'documents', 'Delete documents, manage document categories'),
  ('settings.manage', 'settings', 'Manage organisation settings, integrations, roles')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- System roles (organisation_id null => available to every organisation)
-- ---------------------------------------------------------------------
insert into roles (key, name, description, is_system) values
  ('platform_super_admin', 'Platform Super Admin', 'Full RentOS platform access', true),
  ('org_owner', 'Organisation Owner', 'Full access to their organisation', true),
  ('org_admin', 'Organisation Admin', 'Almost full operational access', true),
  ('property_manager', 'Property Manager', 'Properties, units, leases, tenants and operations', true),
  ('accountant', 'Accountant', 'Payments, cheques, reconciliation, expenses and reports', true),
  ('maintenance_manager', 'Maintenance Manager', 'Maintenance and vendors', true),
  ('staff', 'Staff', 'Limited, configurable access', true),
  ('property_owner', 'Property Owner', 'Portal access to own properties and financials', true),
  ('tenant', 'Tenant', 'Portal access to own lease, payments and maintenance', true),
  ('vendor', 'Vendor', 'Portal access to assigned work orders only', true)
on conflict do nothing;

-- Grant every permission to org_owner and org_admin.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.key in ('org_owner', 'org_admin') and r.organisation_id is null
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('properties.manage', 'tenants.manage', 'leases.manage', 'maintenance.manage', 'vendors.manage', 'owners.manage', 'documents.manage')
where r.key = 'property_manager' and r.organisation_id is null
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('payments.manage', 'finance.bank_details.view', 'finance.bank_details.manage',
                'finance.expenses.manage', 'finance.statements.manage', 'finance.settings.manage', 'documents.manage')
where r.key = 'accountant' and r.organisation_id is null
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('maintenance.manage', 'vendors.manage')
where r.key = 'maintenance_manager' and r.organisation_id is null
on conflict do nothing;

-- staff / property_owner / tenant / vendor / platform_super_admin intentionally
-- start with zero explicit permission rows: platform_super_admin bypasses all
-- checks via is_platform_super_admin(); the portal roles rely on the
-- self-scoped RLS policies rather than the has_permission() catalogue;
-- staff is meant to be customised per organisation by an admin.

-- ---------------------------------------------------------------------
-- Subscription plans
-- ---------------------------------------------------------------------
insert into plans (key, name, max_units, max_users, storage_mb, monthly_price_qar, features, sort_order) values
  ('trial', 'Trial', 25, 3, 500, 0,
    '{"online_payments": false, "whatsapp": false, "advanced_reporting": false}', 0),
  ('starter', 'Starter', 50, 5, 2000, 499,
    '{"online_payments": true, "whatsapp": false, "advanced_reporting": false}', 1),
  ('growth', 'Growth', 200, 15, 10000, 1499,
    '{"online_payments": true, "whatsapp": true, "advanced_reporting": true}', 2),
  ('professional', 'Professional', 750, 40, 50000, 3999,
    '{"online_payments": true, "whatsapp": true, "advanced_reporting": true}', 3),
  ('enterprise', 'Enterprise', null, null, null, null,
    '{"online_payments": true, "whatsapp": true, "advanced_reporting": true, "white_label": true}', 4)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Document categories (labels for the fixed enum)
-- ---------------------------------------------------------------------
insert into document_categories (key, label) values
  ('qid', 'QID'), ('passport', 'Passport'), ('lease', 'Lease'), ('ownership', 'Ownership'),
  ('cr', 'Commercial Registration'), ('bank_document', 'Bank Document'), ('receipt', 'Receipt'),
  ('invoice', 'Invoice'), ('maintenance', 'Maintenance'), ('other', 'Other')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Default maintenance + expense categories (organisation_id null = global defaults)
-- ---------------------------------------------------------------------
insert into maintenance_categories (organisation_id, name) values
  (null, 'Plumbing'), (null, 'Electrical'), (null, 'HVAC / AC'), (null, 'Appliances'),
  (null, 'Structural'), (null, 'Pest Control'), (null, 'Cleaning'), (null, 'Locks & Security'), (null, 'Other');

insert into expense_categories (organisation_id, name) values
  (null, 'Maintenance & Repairs'), (null, 'Utilities'), (null, 'Insurance'),
  (null, 'Management Fee'), (null, 'Cleaning'), (null, 'Security'), (null, 'Legal & Compliance'), (null, 'Other');

-- ---------------------------------------------------------------------
-- Sample (clearly-marked) English lease template
-- ---------------------------------------------------------------------
insert into document_templates (organisation_id, name, locale, body_html, is_sample) values
  (null, 'Sample Residential Tenancy Agreement (EN)', 'en',
   '<h1>SAMPLE TENANCY AGREEMENT — TEMPLATE, NOT LEGAL ADVICE</h1>
    <p>This sample template is provided for demonstration purposes only and does not constitute
    a lawyer-approved legal contract. Organisations should have their own tenancy agreement
    reviewed by qualified legal counsel before use.</p>
    <p>This agreement is made between <strong>{{owner_name}}</strong> ("the Landlord") and
    <strong>{{tenant_name}}</strong> ("the Tenant") for the property known as
    <strong>{{property_name}}, Unit {{unit_number}}</strong>.</p>
    <p>Term: from {{start_date}} to {{end_date}}.<br/>
       Monthly Rent: QAR {{monthly_rent}}.<br/>
       Security Deposit: QAR {{security_deposit}}.</p>',
   true);
