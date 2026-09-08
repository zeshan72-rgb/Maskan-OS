-- =====================================================================
-- 0015_row_level_security.sql
--
-- Defence-in-depth: every organisation-scoped table is locked down with
-- RLS so that even if an application-layer permission check is missed,
-- Postgres itself refuses cross-organisation reads/writes. Application
-- code (lib/permissions) performs the *same* checks again server-side —
-- RLS is the backstop, not the only line of defence.
--
-- Pattern per table:
--   1. enable + force row level security
--   2. staff/manager access: is_org_member(organisation_id), narrowed by
--      has_permission(...) for writes
--   3. portal users (tenant/owner/vendor) get an additional SELECT policy
--      scoped to rows that belong to them
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: a user can read/update their own profile; org members can
-- read basic profile info of people in their org (for assignment UIs).
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
create policy profiles_self_select on profiles for select
  using (id = auth.uid() or is_platform_super_admin());
create policy profiles_org_peers_select on profiles for select
  using (exists (
    select 1 from organisation_members me
    join organisation_members them on them.organisation_id = me.organisation_id
    where me.profile_id = auth.uid() and them.profile_id = profiles.id
  ));
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_self_insert on profiles for insert
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------
alter table organisations enable row level security;
create policy organisations_member_select on organisations for select
  using (is_org_member(id));
create policy organisations_admin_update on organisations for update
  using (has_role(id, 'org_owner', 'org_admin')) with check (has_role(id, 'org_owner', 'org_admin'));
create policy organisations_platform_insert on organisations for insert
  with check (is_platform_super_admin());
create policy organisations_platform_delete on organisations for delete
  using (is_platform_super_admin());

-- ---------------------------------------------------------------------
-- roles / permissions / role_permissions (system roles are readable by
-- everyone signed in; custom org roles are scoped)
-- ---------------------------------------------------------------------
alter table roles enable row level security;
create policy roles_readable on roles for select
  using (organisation_id is null or is_org_member(organisation_id));
create policy roles_admin_write on roles for all
  using (organisation_id is not null and has_role(organisation_id, 'org_owner', 'org_admin'))
  with check (organisation_id is not null and has_role(organisation_id, 'org_owner', 'org_admin'));

alter table permissions enable row level security;
create policy permissions_readable on permissions for select using (true);

alter table role_permissions enable row level security;
create policy role_permissions_readable on role_permissions for select using (true);
create policy role_permissions_admin_write on role_permissions for all
  using (exists (select 1 from roles r where r.id = role_id and has_role(r.organisation_id, 'org_owner', 'org_admin')))
  with check (exists (select 1 from roles r where r.id = role_id and has_role(r.organisation_id, 'org_owner', 'org_admin')));

-- ---------------------------------------------------------------------
-- organisation_members / member_roles / invitations
-- ---------------------------------------------------------------------
alter table organisation_members enable row level security;
create policy org_members_select on organisation_members for select
  using (is_org_member(organisation_id));
create policy org_members_admin_write on organisation_members for all
  using (has_role(organisation_id, 'org_owner', 'org_admin'))
  with check (has_role(organisation_id, 'org_owner', 'org_admin'));

alter table member_roles enable row level security;
create policy member_roles_select on member_roles for select
  using (exists (select 1 from organisation_members om where om.id = organisation_member_id and is_org_member(om.organisation_id)));
create policy member_roles_admin_write on member_roles for all
  using (exists (select 1 from organisation_members om where om.id = organisation_member_id and has_role(om.organisation_id, 'org_owner', 'org_admin')))
  with check (exists (select 1 from organisation_members om where om.id = organisation_member_id and has_role(om.organisation_id, 'org_owner', 'org_admin')));

alter table invitations enable row level security;
create policy invitations_admin_select on invitations for select
  using (has_role(organisation_id, 'org_owner', 'org_admin', 'property_manager'));
create policy invitations_admin_write on invitations for all
  using (has_role(organisation_id, 'org_owner', 'org_admin'))
  with check (has_role(organisation_id, 'org_owner', 'org_admin'));
-- unauthenticated/invited users must be able to look up a single invitation by its
-- unguessable token to accept it; done via a SECURITY DEFINER RPC, not direct table access,
-- so no public select policy is added here.

-- ---------------------------------------------------------------------
-- owners
-- ---------------------------------------------------------------------
alter table owners enable row level security;
create policy owners_staff_select on owners for select
  using (is_org_member(organisation_id));
create policy owners_staff_write on owners for insert with check (has_permission(organisation_id, 'owners.manage'));
create policy owners_staff_update on owners for update
  using (has_permission(organisation_id, 'owners.manage')) with check (has_permission(organisation_id, 'owners.manage'));

alter table owner_contacts enable row level security;
create policy owner_contacts_select on owner_contacts for select
  using (exists (select 1 from owners o where o.id = owner_id and is_org_member(o.organisation_id)));
create policy owner_contacts_write on owner_contacts for all
  using (exists (select 1 from owners o where o.id = owner_id and has_permission(o.organisation_id, 'owners.manage')))
  with check (exists (select 1 from owners o where o.id = owner_id and has_permission(o.organisation_id, 'owners.manage')));

alter table owner_bank_accounts enable row level security;
create policy owner_bank_accounts_select on owner_bank_accounts for select
  using (exists (select 1 from owners o where o.id = owner_id and has_permission(o.organisation_id, 'finance.bank_details.view')));
create policy owner_bank_accounts_write on owner_bank_accounts for all
  using (exists (select 1 from owners o where o.id = owner_id and has_permission(o.organisation_id, 'finance.bank_details.manage')))
  with check (exists (select 1 from owners o where o.id = owner_id and has_permission(o.organisation_id, 'finance.bank_details.manage')));

-- ---------------------------------------------------------------------
-- properties / buildings / units / ownership mapping / property_documents
-- Portal owners additionally see only properties/units they own.
-- ---------------------------------------------------------------------
alter table properties enable row level security;
create policy properties_staff_select on properties for select
  using (is_org_member(organisation_id));
create policy properties_owner_portal_select on properties for select
  using (exists (
    select 1 from property_owners po join organisation_members om on om.owner_id = po.owner_id
    where po.property_id = properties.id and om.profile_id = auth.uid() and om.is_active
  ));
create policy properties_manage on properties for insert with check (has_permission(organisation_id, 'properties.manage'));
create policy properties_update on properties for update
  using (has_permission(organisation_id, 'properties.manage')) with check (has_permission(organisation_id, 'properties.manage'));

alter table buildings enable row level security;
create policy buildings_select on buildings for select
  using (exists (select 1 from properties p where p.id = property_id and is_org_member(p.organisation_id)));
create policy buildings_write on buildings for all
  using (exists (select 1 from properties p where p.id = property_id and has_permission(p.organisation_id, 'properties.manage')))
  with check (exists (select 1 from properties p where p.id = property_id and has_permission(p.organisation_id, 'properties.manage')));

alter table units enable row level security;
create policy units_staff_select on units for select using (is_org_member(organisation_id));
create policy units_owner_portal_select on units for select
  using (exists (
    select 1 from unit_owners uo join organisation_members om on om.owner_id = uo.owner_id
    where uo.unit_id = units.id and om.profile_id = auth.uid() and om.is_active
  ) or exists (
    select 1 from property_owners po join organisation_members om on om.owner_id = po.owner_id
    where po.property_id = units.property_id and om.profile_id = auth.uid() and om.is_active
  ));
create policy units_tenant_portal_select on units for select
  using (exists (
    select 1 from leases l join organisation_members om on om.tenant_id = l.tenant_id
    where l.unit_id = units.id and om.profile_id = auth.uid() and om.is_active
  ));
create policy units_manage on units for insert with check (has_permission(organisation_id, 'properties.manage'));
create policy units_update on units for update
  using (has_permission(organisation_id, 'properties.manage')) with check (has_permission(organisation_id, 'properties.manage'));

alter table property_owners enable row level security;
create policy property_owners_select on property_owners for select
  using (exists (select 1 from properties p where p.id = property_id and is_org_member(p.organisation_id)));
create policy property_owners_write on property_owners for all
  using (exists (select 1 from properties p where p.id = property_id and has_permission(p.organisation_id, 'properties.manage')))
  with check (exists (select 1 from properties p where p.id = property_id and has_permission(p.organisation_id, 'properties.manage')));

alter table unit_owners enable row level security;
create policy unit_owners_select on unit_owners for select
  using (exists (select 1 from units u where u.id = unit_id and is_org_member(u.organisation_id)));
create policy unit_owners_write on unit_owners for all
  using (exists (select 1 from units u where u.id = unit_id and has_permission(u.organisation_id, 'properties.manage')))
  with check (exists (select 1 from units u where u.id = unit_id and has_permission(u.organisation_id, 'properties.manage')));

alter table property_documents enable row level security;
create policy property_documents_select on property_documents for select
  using (exists (select 1 from properties p where p.id = property_id and is_org_member(p.organisation_id)));
create policy property_documents_write on property_documents for all
  using (exists (select 1 from properties p where p.id = property_id and has_permission(p.organisation_id, 'properties.manage')))
  with check (exists (select 1 from properties p where p.id = property_id and has_permission(p.organisation_id, 'properties.manage')));

-- ---------------------------------------------------------------------
-- tenants (staff + the tenant's own portal access)
-- ---------------------------------------------------------------------
alter table tenants enable row level security;
create policy tenants_staff_select on tenants for select using (is_org_member(organisation_id));
create policy tenants_self_select on tenants for select
  using (exists (select 1 from organisation_members om where om.tenant_id = tenants.id and om.profile_id = auth.uid() and om.is_active));
create policy tenants_manage on tenants for insert with check (has_permission(organisation_id, 'tenants.manage'));
create policy tenants_update on tenants for update
  using (has_permission(organisation_id, 'tenants.manage')) with check (has_permission(organisation_id, 'tenants.manage'));

alter table tenant_contacts enable row level security;
create policy tenant_contacts_select on tenant_contacts for select
  using (exists (select 1 from tenants t where t.id = tenant_id and (is_org_member(t.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = t.id and om.profile_id = auth.uid()))));
create policy tenant_contacts_write on tenant_contacts for all
  using (exists (select 1 from tenants t where t.id = tenant_id and has_permission(t.organisation_id, 'tenants.manage')))
  with check (exists (select 1 from tenants t where t.id = tenant_id and has_permission(t.organisation_id, 'tenants.manage')));

alter table tenant_documents enable row level security;
create policy tenant_documents_select on tenant_documents for select
  using (exists (select 1 from tenants t where t.id = tenant_id and (is_org_member(t.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = t.id and om.profile_id = auth.uid()))));
create policy tenant_documents_write on tenant_documents for insert
  with check (exists (select 1 from tenants t where t.id = tenant_id and (has_permission(t.organisation_id, 'tenants.manage')
    or exists (select 1 from organisation_members om where om.tenant_id = t.id and om.profile_id = auth.uid()))));

alter table occupants enable row level security;
create policy occupants_select on occupants for select
  using (exists (select 1 from tenants t where t.id = tenant_id and (is_org_member(t.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = t.id and om.profile_id = auth.uid()))));
create policy occupants_write on occupants for all
  using (exists (select 1 from tenants t where t.id = tenant_id and has_permission(t.organisation_id, 'tenants.manage')))
  with check (exists (select 1 from tenants t where t.id = tenant_id and has_permission(t.organisation_id, 'tenants.manage')));

-- ---------------------------------------------------------------------
-- leases + related, with tenant/owner portal read access
-- ---------------------------------------------------------------------
alter table leases enable row level security;
create policy leases_staff_select on leases for select using (is_org_member(organisation_id));
create policy leases_tenant_select on leases for select
  using (exists (select 1 from organisation_members om where om.tenant_id = leases.tenant_id and om.profile_id = auth.uid() and om.is_active));
create policy leases_owner_select on leases for select
  using (exists (select 1 from organisation_members om where om.owner_id = leases.owner_id and om.profile_id = auth.uid() and om.is_active));
create policy leases_manage on leases for insert with check (has_permission(organisation_id, 'leases.manage'));
create policy leases_update on leases for update
  using (has_permission(organisation_id, 'leases.manage')) with check (has_permission(organisation_id, 'leases.manage'));

alter table lease_parties enable row level security;
create policy lease_parties_select on lease_parties for select
  using (exists (select 1 from leases l where l.id = lease_id and is_org_member(l.organisation_id)));
create policy lease_parties_write on lease_parties for all
  using (exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')))
  with check (exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')));

alter table lease_documents enable row level security;
create policy lease_documents_select on lease_documents for select
  using (exists (select 1 from leases l where l.id = lease_id and (is_org_member(l.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = l.tenant_id and om.profile_id = auth.uid()))));
create policy lease_documents_write on lease_documents for all
  using (exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')))
  with check (exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')));

alter table lease_events enable row level security;
create policy lease_events_select on lease_events for select
  using (exists (select 1 from leases l where l.id = lease_id and is_org_member(l.organisation_id)));

alter table lease_renewal_offers enable row level security;
create policy renewal_offers_staff_select on lease_renewal_offers for select
  using (exists (select 1 from leases l where l.id = lease_id and is_org_member(l.organisation_id)));
create policy renewal_offers_tenant_select on lease_renewal_offers for select
  using (exists (select 1 from leases l join organisation_members om on om.tenant_id = l.tenant_id
    where l.id = lease_id and om.profile_id = auth.uid() and om.is_active));
create policy renewal_offers_staff_write on lease_renewal_offers for insert
  with check (exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')));
create policy renewal_offers_tenant_respond on lease_renewal_offers for update
  using (exists (select 1 from leases l join organisation_members om on om.tenant_id = l.tenant_id
    where l.id = lease_id and om.profile_id = auth.uid() and om.is_active)
    or exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')));

-- ---------------------------------------------------------------------
-- rent_schedules / rent_instalments / charges / credits
-- ---------------------------------------------------------------------
alter table rent_schedules enable row level security;
create policy rent_schedules_select on rent_schedules for select
  using (exists (select 1 from leases l where l.id = lease_id and is_org_member(l.organisation_id)));
create policy rent_schedules_write on rent_schedules for insert
  with check (exists (select 1 from leases l where l.id = lease_id and has_permission(l.organisation_id, 'leases.manage')));

alter table rent_instalments enable row level security;
create policy rent_instalments_staff_select on rent_instalments for select using (is_org_member(organisation_id));
create policy rent_instalments_tenant_select on rent_instalments for select
  using (exists (select 1 from leases l join organisation_members om on om.tenant_id = l.tenant_id
    where l.id = lease_id and om.profile_id = auth.uid() and om.is_active));
create policy rent_instalments_owner_select on rent_instalments for select
  using (exists (select 1 from leases l join organisation_members om on om.owner_id = l.owner_id
    where l.id = lease_id and om.profile_id = auth.uid() and om.is_active));
create policy rent_instalments_write on rent_instalments for update
  using (has_permission(organisation_id, 'payments.manage')) with check (has_permission(organisation_id, 'payments.manage'));

alter table charges enable row level security;
create policy charges_select on charges for select using (is_org_member(organisation_id));
create policy charges_write on charges for all
  using (has_permission(organisation_id, 'payments.manage')) with check (has_permission(organisation_id, 'payments.manage'));

alter table credits enable row level security;
create policy credits_select on credits for select using (is_org_member(organisation_id));
create policy credits_write on credits for all
  using (has_permission(organisation_id, 'payments.manage')) with check (has_permission(organisation_id, 'payments.manage'));

-- ---------------------------------------------------------------------
-- payments / allocations / evidence / provider events / bank accounts / receipts
-- ---------------------------------------------------------------------
alter table bank_accounts enable row level security;
create policy bank_accounts_select on bank_accounts for select using (is_org_member(organisation_id));
create policy bank_accounts_write on bank_accounts for all
  using (has_permission(organisation_id, 'finance.bank_details.manage')) with check (has_permission(organisation_id, 'finance.bank_details.manage'));

alter table payments enable row level security;
create policy payments_staff_select on payments for select using (is_org_member(organisation_id));
create policy payments_tenant_select on payments for select
  using (exists (select 1 from organisation_members om where om.tenant_id = payments.tenant_id and om.profile_id = auth.uid() and om.is_active));
create policy payments_tenant_insert on payments for insert
  with check (
    status = 'pending_verification' and method in ('bank_transfer', 'cash')
    and exists (select 1 from organisation_members om where om.tenant_id = payments.tenant_id and om.profile_id = auth.uid() and om.is_active)
  );
create policy payments_staff_write on payments for insert with check (has_permission(organisation_id, 'payments.manage'));
create policy payments_staff_update on payments for update
  using (has_permission(organisation_id, 'payments.manage')) with check (has_permission(organisation_id, 'payments.manage'));

alter table payment_allocations enable row level security;
create policy payment_allocations_select on payment_allocations for select
  using (exists (select 1 from payments p where p.id = payment_id and is_org_member(p.organisation_id)));
create policy payment_allocations_write on payment_allocations for all
  using (exists (select 1 from payments p where p.id = payment_id and has_permission(p.organisation_id, 'payments.manage')))
  with check (exists (select 1 from payments p where p.id = payment_id and has_permission(p.organisation_id, 'payments.manage')));

alter table payment_evidence enable row level security;
create policy payment_evidence_select on payment_evidence for select
  using (exists (select 1 from payments p where p.id = payment_id and (is_org_member(p.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = p.tenant_id and om.profile_id = auth.uid()))));
create policy payment_evidence_insert on payment_evidence for insert
  with check (exists (select 1 from payments p where p.id = payment_id and (has_permission(p.organisation_id, 'payments.manage')
    or exists (select 1 from organisation_members om where om.tenant_id = p.tenant_id and om.profile_id = auth.uid()))));

alter table payment_provider_events enable row level security;
create policy provider_events_admin_select on payment_provider_events for select
  using (exists (select 1 from payments p where p.id = payment_id and has_permission(p.organisation_id, 'payments.manage')));
-- inserts happen exclusively via the service-role webhook handler, which bypasses RLS.

alter table receipts enable row level security;
create policy receipts_select on receipts for select
  using (is_org_member(organisation_id) or exists (
    select 1 from payments p join organisation_members om on om.tenant_id = p.tenant_id
    where p.id = payment_id and om.profile_id = auth.uid()
  ));

-- ---------------------------------------------------------------------
-- cheques
-- ---------------------------------------------------------------------
alter table cheques enable row level security;
create policy cheques_select on cheques for select using (is_org_member(organisation_id));
create policy cheques_write on cheques for all
  using (has_permission(organisation_id, 'payments.manage')) with check (has_permission(organisation_id, 'payments.manage'));

alter table cheque_events enable row level security;
create policy cheque_events_select on cheque_events for select
  using (exists (select 1 from cheques c where c.id = cheque_id and is_org_member(c.organisation_id)));

alter table cheque_images enable row level security;
create policy cheque_images_select on cheque_images for select
  using (exists (select 1 from cheques c where c.id = cheque_id and is_org_member(c.organisation_id)));
create policy cheque_images_write on cheque_images for insert
  with check (exists (select 1 from cheques c where c.id = cheque_id and has_permission(c.organisation_id, 'payments.manage')));

-- ---------------------------------------------------------------------
-- maintenance
-- ---------------------------------------------------------------------
alter table maintenance_categories enable row level security;
create policy maint_categories_select on maintenance_categories for select
  using (organisation_id is null or is_org_member(organisation_id));

alter table maintenance_requests enable row level security;
create policy maint_requests_staff_select on maintenance_requests for select using (is_org_member(organisation_id));
create policy maint_requests_tenant_select on maintenance_requests for select
  using (exists (select 1 from organisation_members om where om.tenant_id = maintenance_requests.tenant_id and om.profile_id = auth.uid() and om.is_active));
create policy maint_requests_tenant_insert on maintenance_requests for insert
  with check (exists (select 1 from organisation_members om where om.tenant_id = maintenance_requests.tenant_id and om.profile_id = auth.uid() and om.is_active));
create policy maint_requests_staff_write on maintenance_requests for insert with check (has_permission(organisation_id, 'maintenance.manage'));
create policy maint_requests_update on maintenance_requests for update
  using (has_permission(organisation_id, 'maintenance.manage')) with check (has_permission(organisation_id, 'maintenance.manage'));

alter table maintenance_comments enable row level security;
create policy maint_comments_select on maintenance_comments for select
  using (exists (select 1 from maintenance_requests mr where mr.id = maintenance_request_id and (
    is_org_member(mr.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = mr.tenant_id and om.profile_id = auth.uid())
  )) and (
    is_internal = false or exists (select 1 from maintenance_requests mr where mr.id = maintenance_request_id and is_org_member(mr.organisation_id))
  ));
create policy maint_comments_insert on maintenance_comments for insert
  with check (exists (select 1 from maintenance_requests mr where mr.id = maintenance_request_id and (
    is_org_member(mr.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = mr.tenant_id and om.profile_id = auth.uid())
  )));

alter table maintenance_attachments enable row level security;
create policy maint_attachments_select on maintenance_attachments for select
  using (exists (select 1 from maintenance_requests mr where mr.id = maintenance_request_id and (
    is_org_member(mr.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = mr.tenant_id and om.profile_id = auth.uid())
  )));
create policy maint_attachments_insert on maintenance_attachments for insert
  with check (exists (select 1 from maintenance_requests mr where mr.id = maintenance_request_id and (
    is_org_member(mr.organisation_id)
    or exists (select 1 from organisation_members om where om.tenant_id = mr.tenant_id and om.profile_id = auth.uid())
  )));

alter table work_orders enable row level security;
create policy work_orders_staff_select on work_orders for select using (is_org_member(organisation_id));
create policy work_orders_vendor_select on work_orders for select using (is_vendor_member(vendor_id));
create policy work_orders_staff_write on work_orders for insert with check (has_permission(organisation_id, 'maintenance.manage'));
create policy work_orders_staff_update on work_orders for update
  using (has_permission(organisation_id, 'maintenance.manage')) with check (has_permission(organisation_id, 'maintenance.manage'));
create policy work_orders_vendor_update on work_orders for update
  using (is_vendor_member(vendor_id)) with check (is_vendor_member(vendor_id));

alter table work_order_events enable row level security;
create policy wo_events_select on work_order_events for select
  using (exists (select 1 from work_orders wo where wo.id = work_order_id and (is_org_member(wo.organisation_id) or is_vendor_member(wo.vendor_id))));
create policy wo_events_insert on work_order_events for insert
  with check (exists (select 1 from work_orders wo where wo.id = work_order_id and (has_permission(wo.organisation_id, 'maintenance.manage') or is_vendor_member(wo.vendor_id))));

-- ---------------------------------------------------------------------
-- vendors
-- ---------------------------------------------------------------------
alter table vendors enable row level security;
create policy vendors_staff_select on vendors for select using (is_org_member(organisation_id));
create policy vendors_self_select on vendors for select using (is_vendor_member(id));
create policy vendors_write on vendors for all
  using (has_permission(organisation_id, 'vendors.manage')) with check (has_permission(organisation_id, 'vendors.manage'));

alter table vendor_contacts enable row level security;
create policy vendor_contacts_select on vendor_contacts for select
  using (exists (select 1 from vendors v where v.id = vendor_id and (is_org_member(v.organisation_id) or is_vendor_member(v.id))));
create policy vendor_contacts_write on vendor_contacts for all
  using (exists (select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')))
  with check (exists (select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')));

alter table vendor_members enable row level security;
create policy vendor_members_select on vendor_members for select
  using (exists (select 1 from vendors v where v.id = vendor_id and (is_org_member(v.organisation_id) or is_vendor_member(v.id))));
create policy vendor_members_write on vendor_members for all
  using (exists (select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')))
  with check (exists (select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')));

alter table vendor_documents enable row level security;
create policy vendor_documents_select on vendor_documents for select
  using (exists (select 1 from vendors v where v.id = vendor_id and (is_org_member(v.organisation_id) or is_vendor_member(v.id))));

alter table vendor_invoices enable row level security;
create policy vendor_invoices_select on vendor_invoices for select
  using (exists (select 1 from vendors v where v.id = vendor_id and (is_org_member(v.organisation_id) or is_vendor_member(v.id))));
create policy vendor_invoices_insert on vendor_invoices for insert
  with check (exists (select 1 from vendors v where v.id = vendor_id and is_vendor_member(v.id)));
create policy vendor_invoices_staff_update on vendor_invoices for update
  using (exists (select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')))
  with check (exists (select 1 from vendors v where v.id = vendor_id and has_permission(v.organisation_id, 'vendors.manage')));

-- ---------------------------------------------------------------------
-- finance
-- ---------------------------------------------------------------------
alter table expense_categories enable row level security;
create policy expense_categories_select on expense_categories for select
  using (organisation_id is null or is_org_member(organisation_id));

alter table property_expenses enable row level security;
create policy property_expenses_select on property_expenses for select using (is_org_member(organisation_id));
create policy property_expenses_owner_select on property_expenses for select
  using (exists (select 1 from organisation_members om where om.owner_id = property_expenses.owner_id and om.profile_id = auth.uid() and om.is_active));
create policy property_expenses_write on property_expenses for all
  using (has_permission(organisation_id, 'finance.expenses.manage')) with check (has_permission(organisation_id, 'finance.expenses.manage'));

alter table management_fees enable row level security;
create policy management_fees_select on management_fees for select using (is_org_member(organisation_id));
create policy management_fees_write on management_fees for all
  using (has_permission(organisation_id, 'finance.settings.manage')) with check (has_permission(organisation_id, 'finance.settings.manage'));

alter table owner_transactions enable row level security;
create policy owner_transactions_staff_select on owner_transactions for select using (is_org_member(organisation_id));
create policy owner_transactions_owner_select on owner_transactions for select
  using (exists (select 1 from organisation_members om where om.owner_id = owner_transactions.owner_id and om.profile_id = auth.uid() and om.is_active));

alter table owner_statements enable row level security;
create policy owner_statements_staff_select on owner_statements for select using (is_org_member(organisation_id));
create policy owner_statements_owner_select on owner_statements for select
  using (exists (select 1 from organisation_members om where om.owner_id = owner_statements.owner_id and om.profile_id = auth.uid() and om.is_active));
create policy owner_statements_write on owner_statements for all
  using (has_permission(organisation_id, 'finance.statements.manage')) with check (has_permission(organisation_id, 'finance.statements.manage'));

alter table owner_statement_items enable row level security;
create policy owner_statement_items_select on owner_statement_items for select
  using (exists (select 1 from owner_statements os where os.id = owner_statement_id and (
    is_org_member(os.organisation_id) or exists (select 1 from organisation_members om where om.owner_id = os.owner_id and om.profile_id = auth.uid())
  )));

-- ---------------------------------------------------------------------
-- communication / documents / audit / system
-- ---------------------------------------------------------------------
alter table notifications enable row level security;
create policy notifications_self on notifications for select using (profile_id = auth.uid());
create policy notifications_self_update on notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

alter table notification_preferences enable row level security;
create policy notification_prefs_self on notification_preferences for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

alter table communication_logs enable row level security;
create policy communication_logs_select on communication_logs for select
  using (has_permission(organisation_id, 'settings.manage') or profile_id = auth.uid());

alter table document_categories enable row level security;
create policy document_categories_select on document_categories for select using (true);

alter table documents enable row level security;
create policy documents_select on documents for select using (is_org_member(organisation_id));
create policy documents_write on documents for insert with check (is_org_member(organisation_id));
create policy documents_delete on documents for delete using (has_permission(organisation_id, 'documents.manage'));

alter table document_templates enable row level security;
create policy document_templates_select on document_templates for select
  using (is_sample = true or organisation_id is null or is_org_member(organisation_id));
create policy document_templates_write on document_templates for all
  using (organisation_id is not null and has_permission(organisation_id, 'settings.manage'))
  with check (organisation_id is not null and has_permission(organisation_id, 'settings.manage'));

alter table audit_logs enable row level security;
create policy audit_logs_select on audit_logs for select
  using (is_platform_super_admin() or has_role(organisation_id, 'org_owner', 'org_admin'));

alter table feature_flags enable row level security;
create policy feature_flags_select on feature_flags for select
  using (organisation_id is null or is_org_member(organisation_id));
create policy feature_flags_admin_write on feature_flags for all
  using (is_platform_super_admin() or has_role(organisation_id, 'org_owner', 'org_admin'))
  with check (is_platform_super_admin() or has_role(organisation_id, 'org_owner', 'org_admin'));

alter table integration_connections enable row level security;
create policy integration_connections_select on integration_connections for select
  using (has_permission(organisation_id, 'settings.manage'));
create policy integration_connections_write on integration_connections for all
  using (has_permission(organisation_id, 'settings.manage')) with check (has_permission(organisation_id, 'settings.manage'));

alter table webhook_events enable row level security;
create policy webhook_events_platform_only on webhook_events for select using (is_platform_super_admin());

alter table app_settings enable row level security;
create policy app_settings_select on app_settings for select
  using (organisation_id is null or is_org_member(organisation_id));
create policy app_settings_write on app_settings for all
  using (organisation_id is not null and has_permission(organisation_id, 'settings.manage'))
  with check (organisation_id is not null and has_permission(organisation_id, 'settings.manage'));

-- ---------------------------------------------------------------------
-- plans / subscriptions: plans are publicly readable (needed for
-- onboarding/pricing UI); subscription rows are org + platform admin only.
-- ---------------------------------------------------------------------
alter table plans enable row level security;
create policy plans_select on plans for select using (true);
create policy plans_platform_write on plans for all using (is_platform_super_admin()) with check (is_platform_super_admin());

alter table organisation_subscriptions enable row level security;
create policy org_subs_select on organisation_subscriptions for select
  using (is_platform_super_admin() or has_role(organisation_id, 'org_owner', 'org_admin'));
create policy org_subs_platform_write on organisation_subscriptions for all
  using (is_platform_super_admin()) with check (is_platform_super_admin());

alter table subscription_events enable row level security;
create policy sub_events_select on subscription_events for select
  using (is_platform_super_admin() or exists (
    select 1 from organisation_subscriptions os where os.id = organisation_subscription_id and has_role(os.organisation_id, 'org_owner', 'org_admin')
  ));
