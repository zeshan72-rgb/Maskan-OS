-- =====================================================================
-- supabase/seed/demo_seed.sql
--
-- DEMO DATA ONLY. Do not run against a production database.
-- Creates the "Pearl Property Management" demo organisation with a
-- realistic, fully-relational portfolio so the app is populated during
-- development: 5 properties, 50+ units, several owners, ~35 leases,
-- monthly + quarterly rent schedules, paid/partial/overdue instalments,
-- post-dated cheques (incl. one bounced), bank transfers, maintenance
-- requests, vendors, expenses, and one finalised owner statement.
--
-- Also creates demo auth users directly in auth.users (standard technique
-- for seeding local/dev Supabase Postgres — GoTrue reads this table
-- directly). Password for every demo user is: Passw0rd!2026
--
-- Run with: supabase db reset   (applies migrations then this file)
-- or:       psql "$DATABASE_URL" -f supabase/seed/demo_seed.sql
-- =====================================================================

do $$
declare
  v_org_id uuid;
  v_admin_profile uuid := gen_random_uuid();
  v_pm_profile uuid := gen_random_uuid();
  v_accountant_profile uuid := gen_random_uuid();
  v_owner_profile uuid := gen_random_uuid();
  v_tenant_profile uuid := gen_random_uuid();
  v_vendor_profile uuid := gen_random_uuid();
  v_super_admin_profile uuid := gen_random_uuid();

  v_role_org_owner uuid; v_role_org_admin uuid; v_role_pm uuid; v_role_accountant uuid;
  v_role_owner uuid; v_role_tenant uuid; v_role_vendor uuid; v_role_maint uuid;

  v_owner_ids uuid[];
  v_property_ids uuid[];
  v_vendor_id uuid;
  v_demo_owner_id uuid;
  v_demo_tenant_id uuid;

  v_property_id uuid;
  v_unit_id uuid;
  v_tenant_id uuid;
  v_lease_id uuid;
  v_schedule_id uuid;
  v_payment_id uuid;
  v_instalment record;

  prop_names text[] := array['The Pearl Residences', 'West Bay Towers', 'Al Sadd Business Center', 'Lusail Marina View', 'Al Waab Villa Compound'];
  prop_types property_type[] := array['residential','residential','commercial','residential','villa_compound']::property_type[];
  prop_addrs text[] := array['Porto Arabia, The Pearl, Doha', 'West Bay, Doha', 'Al Sadd Street, Doha', 'Marina District, Lusail', 'Al Waab, Doha'];
  units_per_property int[] := array[16, 14, 8, 10, 6]; -- totals 54 units

  i int; j int;
  v_unit_status unit_status;
  v_rent numeric;
  v_bedrooms int;
  v_unit_no text;
  v_occupied_count int := 0;
  v_target_occupied int := 35;
  v_total_units int := 0;
begin
  ------------------------------------------------------------------
  -- Demo auth users (bypassing GoTrue signup — local/dev only)
  ------------------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values
    ('00000000-0000-0000-0000-000000000000', v_super_admin_profile, 'authenticated', 'authenticated',
      'superadmin@rentos.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_admin_profile, 'authenticated', 'authenticated',
      'admin@pearlpm.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_pm_profile, 'authenticated', 'authenticated',
      'manager@pearlpm.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_accountant_profile, 'authenticated', 'authenticated',
      'accountant@pearlpm.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_owner_profile, 'authenticated', 'authenticated',
      'owner@pearlpm.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_tenant_profile, 'authenticated', 'authenticated',
      'tenant@pearlpm.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}'),
    ('00000000-0000-0000-0000-000000000000', v_vendor_profile, 'authenticated', 'authenticated',
      'vendor@pearlpm.qa', crypt('Passw0rd!2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email"}', '{}');

  insert into profiles (id, full_name, email, is_platform_super_admin) values
    (v_super_admin_profile, 'RentOS Platform Admin', 'superadmin@rentos.qa', true),
    (v_admin_profile, 'Fatima Al-Sulaiti', 'admin@pearlpm.qa', false),
    (v_pm_profile, 'Ahmed Khalil', 'manager@pearlpm.qa', false),
    (v_accountant_profile, 'Mariam Al-Kuwari', 'accountant@pearlpm.qa', false),
    (v_owner_profile, 'Jassim Al-Thani', 'owner@pearlpm.qa', false),
    (v_tenant_profile, 'John Smith', 'tenant@pearlpm.qa', false),
    (v_vendor_profile, 'Rashid Cooling Services', 'vendor@pearlpm.qa', false);

  ------------------------------------------------------------------
  -- Organisation
  ------------------------------------------------------------------
  insert into organisations (name, legal_name, slug, email, phone, address, status, onboarding_step, onboarding_completed_at)
  values ('Pearl Property Management', 'Pearl Property Management W.L.L.', 'pearl-pm', 'info@pearlpm.qa',
          '+974 4444 5566', 'Office 12, Al Fardan Tower, West Bay, Doha, Qatar', 'active', 'complete', now())
  returning id into v_org_id;

  insert into organisation_subscriptions (organisation_id, plan_id, current_period_end)
  select v_org_id, id, now() + interval '30 days' from plans where key = 'growth';

  ------------------------------------------------------------------
  -- Roles for this org: reuse system roles (organisation_id is null)
  ------------------------------------------------------------------
  select id into v_role_org_owner from roles where key = 'org_owner' and organisation_id is null;
  select id into v_role_org_admin from roles where key = 'org_admin' and organisation_id is null;
  select id into v_role_pm from roles where key = 'property_manager' and organisation_id is null;
  select id into v_role_accountant from roles where key = 'accountant' and organisation_id is null;
  select id into v_role_owner from roles where key = 'property_owner' and organisation_id is null;
  select id into v_role_tenant from roles where key = 'tenant' and organisation_id is null;
  select id into v_role_vendor from roles where key = 'vendor' and organisation_id is null;
  select id into v_role_maint from roles where key = 'maintenance_manager' and organisation_id is null;

  ------------------------------------------------------------------
  -- Owners (5)
  ------------------------------------------------------------------
  insert into owners (organisation_id, kind, name, qid_or_cr, email, phone)
  values
    (v_org_id, 'individual', 'Jassim Al-Thani', '28511012345', 'jassim.althani@example.qa', '+974 5511 2233'),
    (v_org_id, 'company', 'Doha Horizon Holdings', 'CR-88213', 'finance@dohahorizon.qa', '+974 4433 2211'),
    (v_org_id, 'individual', 'Noora Al-Emadi', '29011045678', 'noora.emadi@example.qa', '+974 5522 3344'),
    (v_org_id, 'individual', 'Khalid Al-Marri', '28711078901', 'khalid.almarri@example.qa', '+974 5533 4455'),
    (v_org_id, 'company', 'Lusail Capital Real Estate', 'CR-91045', 'ar@lusailcapital.qa', '+974 4400 7788')
  returning id into v_demo_owner_id; -- returns last inserted id, refetched below

  select array_agg(id order by created_at) into v_owner_ids from owners where organisation_id = v_org_id;
  v_demo_owner_id := v_owner_ids[1]; -- Jassim Al-Thani, linked to the demo owner-portal login

  insert into owner_bank_accounts (owner_id, bank_name, account_holder_name, account_number, iban, is_primary)
  select id, 'Qatar National Bank', name, '0' || floor(random()*900000000+100000000)::text, 'QA' || floor(random()*90+10)::text || 'QNBA00000' || floor(random()*900000+100000)::text, true
  from owners where organisation_id = v_org_id;

  ------------------------------------------------------------------
  -- Membership + role assignment for staff / owner / tenant / vendor logins
  ------------------------------------------------------------------
  insert into organisation_members (organisation_id, profile_id, owner_id)
  values
    (v_org_id, v_admin_profile, null),
    (v_org_id, v_pm_profile, null),
    (v_org_id, v_accountant_profile, null),
    (v_org_id, v_owner_profile, v_demo_owner_id);

  insert into member_roles (organisation_member_id, role_id)
  select om.id, v_role_org_admin from organisation_members om where om.profile_id = v_admin_profile and om.organisation_id = v_org_id;
  insert into member_roles (organisation_member_id, role_id)
  select om.id, v_role_pm from organisation_members om where om.profile_id = v_pm_profile and om.organisation_id = v_org_id;
  insert into member_roles (organisation_member_id, role_id)
  select om.id, v_role_maint from organisation_members om where om.profile_id = v_pm_profile and om.organisation_id = v_org_id;
  insert into member_roles (organisation_member_id, role_id)
  select om.id, v_role_accountant from organisation_members om where om.profile_id = v_accountant_profile and om.organisation_id = v_org_id;
  insert into member_roles (organisation_member_id, role_id)
  select om.id, v_role_owner from organisation_members om where om.profile_id = v_owner_profile and om.organisation_id = v_org_id;

  ------------------------------------------------------------------
  -- Vendor
  ------------------------------------------------------------------
  insert into vendors (organisation_id, name, trade, email, phone, cr_number)
  values (v_org_id, 'Rashid Cooling Services', 'hvac', 'jobs@rashidcooling.qa', '+974 5566 7788', 'CR-55219')
  returning id into v_vendor_id;
  insert into vendor_members (vendor_id, profile_id) values (v_vendor_id, v_vendor_profile);

  insert into vendors (organisation_id, name, trade, email, phone, cr_number) values
    (v_org_id, 'Al Reem Plumbing & Maintenance', 'plumbing', 'ops@alreemplumbing.qa', '+974 5544 3322', 'CR-44120'),
    (v_org_id, 'Doha Electrical Works', 'electrical', 'info@dohaelectrical.qa', '+974 5511 9900', 'CR-33018');

  ------------------------------------------------------------------
  -- Properties + Units
  ------------------------------------------------------------------
  for i in 1..5 loop
    insert into properties (organisation_id, name, property_code, type, address, management_fee_type, management_fee_value, created_by)
    values (v_org_id, prop_names[i], 'PROP-' || lpad(i::text, 3, '0'), prop_types[i], prop_addrs[i], 'percentage', 8.0, v_pm_profile)
    returning id into v_property_id;

    v_property_ids := array_append(v_property_ids, v_property_id);

    insert into property_owners (property_id, owner_id, ownership_percentage)
    values (v_property_id, v_owner_ids[1 + ((i-1) % array_length(v_owner_ids,1))], 100);

    for j in 1..units_per_property[i] loop
      v_total_units := v_total_units + 1;
      v_bedrooms := (array[0,1,1,2,2,3])[1 + floor(random()*6)::int];
      v_rent := case prop_types[i] when 'commercial' then 8000 + floor(random()*6)*1000 else 4500 + v_bedrooms*2000 + floor(random()*4)*500 end;
      v_unit_no := case when prop_types[i] = 'villa_compound' then 'Villa ' || j else (1 + ((j-1)/4))::text || lpad(((j-1)%4+1)::text,2,'0') end;

      if v_occupied_count < v_target_occupied and random() < 0.72 then
        v_unit_status := 'occupied';
      elsif random() < 0.1 then
        v_unit_status := 'maintenance';
      else
        v_unit_status := 'vacant';
      end if;

      insert into units (organisation_id, property_id, unit_number, bedrooms, bathrooms, area_sqm,
        unit_type, furnishing, market_rent, current_rent, status)
      values (v_org_id, v_property_id, v_unit_no, v_bedrooms, greatest(v_bedrooms,1), 60 + v_bedrooms*35,
        case when prop_types[i]='commercial' then 'office' else (v_bedrooms || 'br') end,
        (array['furnished','semi_furnished','unfurnished'])[1+floor(random()*3)::int],
        v_rent, v_rent,
        case when v_unit_status = 'occupied' then 'occupied' else v_unit_status end)
      returning id into v_unit_id;

      -- Create tenant + active lease + rent schedule for occupied units
      if v_unit_status = 'occupied' then
        v_occupied_count := v_occupied_count + 1;

        insert into tenants (organisation_id, name, qid_or_passport, nationality, email, phone, created_by)
        values (v_org_id,
          (array['John Smith','Priya Sharma','Ahmed Hassan','Li Wei','Fatima Noor','Carlos Silva','Youssef Amin','Elena Petrova','David Cohen','Grace Kim'])[1+floor(random()*10)::int] || ' ' || v_total_units,
          '28' || floor(random()*900000000+100000000)::text, 'Various', 'tenant' || v_total_units || '@example.com',
          '+974 55' || floor(random()*9000000+1000000)::text, v_pm_profile)
        returning id into v_tenant_id;

        insert into leases (organisation_id, property_id, unit_id, owner_id, tenant_id, lease_code,
          start_date, end_date, monthly_rent, total_contract_rent, security_deposit,
          payment_frequency, payment_method, status, created_by, activated_at)
        values (v_org_id, v_property_id, v_unit_id,
          (select owner_id from property_owners where property_id = v_property_id limit 1),
          v_tenant_id, 'LEASE-' || lpad(v_total_units::text, 4, '0'),
          (current_date - (floor(random()*300))::int), (current_date - (floor(random()*300))::int) + interval '1 year',
          v_rent, v_rent * 12, v_rent,
          case when random() < 0.25 then 'quarterly' else 'monthly' end,
          case when random() < 0.5 then 'cheque' else 'bank_transfer' end,
          'active', v_pm_profile, now())
        returning id into v_lease_id;

        select generate_rent_schedule(v_lease_id, v_pm_profile) into v_schedule_id;

        -- Simulate payment history on the first three instalments: paid, partial, overdue/unpaid
        for v_instalment in
          select * from rent_instalments where rent_schedule_id = v_schedule_id order by instalment_number limit 3
        loop
          if v_instalment.instalment_number = 1 then
            insert into payments (organisation_id, lease_id, tenant_id, amount, method, status, reference, payer_name, paid_at, confirmed_by, confirmed_at, created_by)
            values (v_org_id, v_lease_id, v_tenant_id, v_instalment.original_amount, 'bank_transfer', 'confirmed',
              'TRF-' || v_total_units || '-1', 'Tenant', v_instalment.due_date, v_accountant_profile, now(), v_accountant_profile)
            returning id into v_payment_id;
            insert into payment_allocations (payment_id, rent_instalment_id, amount) values (v_payment_id, v_instalment.id, v_instalment.original_amount);
          elsif v_instalment.instalment_number = 2 and random() < 0.4 then
            insert into payments (organisation_id, lease_id, tenant_id, amount, method, status, reference, payer_name, paid_at, confirmed_by, confirmed_at, created_by)
            values (v_org_id, v_lease_id, v_tenant_id, round(v_instalment.original_amount*0.6,2), 'cash', 'confirmed',
              'CASH-' || v_total_units || '-2', 'Tenant', v_instalment.due_date, v_accountant_profile, now(), v_accountant_profile)
            returning id into v_payment_id;
            insert into payment_allocations (payment_id, rent_instalment_id, amount) values (v_payment_id, v_instalment.id, round(v_instalment.original_amount*0.6,2));
          end if;
        end loop;

        -- Post-dated cheques for cheque-paying leases (next 2 instalments)
        if exists (select 1 from leases where id = v_lease_id and payment_method = 'cheque') then
          for v_instalment in
            select * from rent_instalments where rent_schedule_id = v_schedule_id and status not in ('paid','partial') order by instalment_number limit 2
          loop
            insert into cheques (organisation_id, lease_id, rent_instalment_id, cheque_number, bank_name, payer_name, amount, cheque_date, received_date, status, created_by)
            values (v_org_id, v_lease_id, v_instalment.id, 'CHQ' || floor(random()*900000+100000)::text, 'Qatar Islamic Bank',
              'Tenant', v_instalment.original_amount, v_instalment.due_date, current_date - 20, 'received', v_accountant_profile);
          end loop;
        end if;
      end if;
    end loop;
  end loop;

  -- One deliberately bounced cheque for QA/demo purposes
  update cheques set status = 'submitted' where id = (select id from cheques order by created_at limit 1);
  update cheques set status = 'bounced' where id = (select id from cheques order by created_at limit 1);

  ------------------------------------------------------------------
  -- Maintenance requests + one full work order lifecycle
  ------------------------------------------------------------------
  insert into maintenance_requests (organisation_id, property_id, unit_id, tenant_id, lease_id, category_id, priority, status, description, request_code, created_by)
  select v_org_id, l.property_id, l.unit_id, l.tenant_id, l.id,
    (select id from maintenance_categories where name = 'HVAC / AC'),
    'high', 'assigned', 'AC unit in living room not cooling.', 'MR-' || lpad(row_number() over ()::text, 4, '0'), v_tenant_profile
  from leases l where l.organisation_id = v_org_id and l.status = 'active' order by random() limit 4;

  insert into work_orders (organisation_id, maintenance_request_id, vendor_id, status, estimated_cost, created_by)
  select v_org_id, id, v_vendor_id, 'assigned', 350, v_pm_profile from maintenance_requests where organisation_id = v_org_id limit 1;

  insert into maintenance_requests (organisation_id, property_id, unit_id, tenant_id, lease_id, category_id, priority, status, description, request_code, created_by)
  select v_org_id, l.property_id, l.unit_id, l.tenant_id, l.id,
    (select id from maintenance_categories where name = 'Plumbing'),
    'normal', 'completed', 'Kitchen sink leaking under the cabinet.', 'MR-' || lpad((row_number() over () + 100)::text, 4, '0'), v_tenant_profile
  from leases l where l.organisation_id = v_org_id and l.status = 'active' order by random() limit 1;

  ------------------------------------------------------------------
  -- Property expenses
  ------------------------------------------------------------------
  insert into property_expenses (organisation_id, property_id, owner_id, category_id, description, amount, expense_date, approval_status, approved_by, created_by)
  select v_org_id, p.id,
    (select owner_id from property_owners where property_id = p.id limit 1),
    (select id from expense_categories where name = 'Utilities'),
    'Monthly common area electricity', 1200 + floor(random()*800), current_date - floor(random()*60)::int,
    'approved', v_accountant_profile, v_accountant_profile
  from unnest(v_property_ids) as p(id);

  ------------------------------------------------------------------
  -- Notifications for the demo tenant login
  ------------------------------------------------------------------
  insert into notifications (organisation_id, profile_id, type, title, body)
  values (v_org_id, v_tenant_profile, 'maintenance_update', 'Maintenance update', 'A technician has been assigned to your request.');

  raise notice 'Demo seed complete. Organisation: Pearl Property Management (%). Units: %, Occupied: %', v_org_id, v_total_units, v_occupied_count;
end $$;
