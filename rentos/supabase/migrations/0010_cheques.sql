-- =====================================================================
-- 0010_cheques.sql — cheques, cheque_events, cheque_images
-- =====================================================================

create table cheques (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lease_id uuid not null references leases(id),
  rent_instalment_id uuid references rent_instalments(id),
  cheque_number text not null,
  bank_name text not null,
  payer_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  cheque_date date not null,
  received_date date not null default current_date,
  status cheque_status not null default 'received',
  internal_notes text,
  payment_id uuid references payments(id), -- set once cleared and a payment record is created
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_cheques_updated_at before update on cheques
  for each row execute function set_updated_at();
create index idx_cheques_org on cheques(organisation_id);
create index idx_cheques_lease on cheques(lease_id);
create index idx_cheques_status on cheques(status);
create index idx_cheques_date on cheques(cheque_date);
create index idx_cheques_number on cheques(cheque_number);

alter table payments add constraint fk_payments_cheque
  foreign key (cheque_id) references cheques(id) on delete set null;

create table cheque_events (
  id uuid primary key default gen_random_uuid(),
  cheque_id uuid not null references cheques(id) on delete cascade,
  from_status cheque_status,
  to_status cheque_status not null,
  notes text,
  actor_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_cheque_events_cheque on cheque_events(cheque_id);

create table cheque_images (
  id uuid primary key default gen_random_uuid(),
  cheque_id uuid not null references cheques(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index idx_cheque_images_cheque on cheque_images(cheque_id);

-- Valid cheque lifecycle transitions, enforced regardless of caller.
create or replace function enforce_cheque_status_transition()
returns trigger language plpgsql as $$
declare
  allowed boolean;
begin
  if tg_op = 'INSERT' then return new; end if;
  if old.status = new.status then return new; end if;
  allowed := case old.status
    when 'received' then new.status in ('stored', 'due_soon', 'submitted', 'cancelled')
    when 'stored' then new.status in ('due_soon', 'submitted', 'cancelled')
    when 'due_soon' then new.status in ('submitted', 'cancelled')
    when 'submitted' then new.status in ('cleared', 'bounced', 'cancelled')
    when 'bounced' then new.status in ('replaced', 'cancelled')
    when 'cleared' then false
    when 'replaced' then false
    when 'cancelled' then false
    else false
  end;
  if not allowed then
    raise exception 'Invalid cheque status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
create trigger trg_cheque_status_transition before update of status on cheques
  for each row execute function enforce_cheque_status_transition();

create or replace function log_cheque_event()
returns trigger language plpgsql as $$
begin
  insert into cheque_events (cheque_id, from_status, to_status, actor_id)
  values (new.id, case when tg_op = 'UPDATE' then old.status else null end, new.status, auth.uid());
  return new;
end;
$$;
create trigger trg_log_cheque_event after insert or update of status on cheques
  for each row execute function log_cheque_event();

-- Clearing a cheque creates the confirmed payment + allocation automatically.
-- Called from application code (server action) rather than purely by trigger,
-- so the caller can choose the allocation target(s); this helper covers the
-- common single-instalment case.
create or replace function clear_cheque_to_payment(p_cheque_id uuid, p_actor uuid)
returns uuid language plpgsql as $$
declare
  v_cheque cheques%rowtype;
  v_payment_id uuid;
begin
  select * into v_cheque from cheques where id = p_cheque_id for update;
  if not found then raise exception 'Cheque % not found', p_cheque_id; end if;
  if v_cheque.status <> 'submitted' then
    raise exception 'Cheque must be submitted before it can clear (current status: %)', v_cheque.status;
  end if;

  insert into payments (
    organisation_id, lease_id, tenant_id, amount, method, status,
    reference, payer_name, paid_at, cheque_id, confirmed_by, confirmed_at, created_by
  )
  select v_cheque.organisation_id, v_cheque.lease_id, l.tenant_id, v_cheque.amount,
         'cheque', 'confirmed', v_cheque.cheque_number, v_cheque.payer_name,
         current_date, v_cheque.id, p_actor, now(), p_actor
  from leases l where l.id = v_cheque.lease_id
  returning id into v_payment_id;

  if v_cheque.rent_instalment_id is not null then
    insert into payment_allocations (payment_id, rent_instalment_id, amount)
    values (v_payment_id, v_cheque.rent_instalment_id, v_cheque.amount);
  end if;

  update cheques set status = 'cleared', payment_id = v_payment_id where id = p_cheque_id;

  return v_payment_id;
end;
$$;
