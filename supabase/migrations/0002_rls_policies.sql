-- 0002_rls_policies.sql
-- RLS policies for all tables. Without these the anon key can read/write anything.
-- Spec: docs/SPRINT-1-ISSUES.md Issue #10 / PRD-MVP.md §7

-- users ------------------------------------------------------------------------
alter table users enable row level security;

create policy users_select_self on users
  for select
  using (address = auth.jwt() ->> 'address');

create policy users_update_self on users
  for update
  using (address = auth.jwt() ->> 'address')
  with check (address = auth.jwt() ->> 'address');

create policy users_insert_service_role on users
  for insert
  with check (auth.role() = 'service_role');

-- orders -----------------------------------------------------------------------
alter table orders enable row level security;

create policy orders_select_public on orders
  for select
  using (true);

create policy orders_insert_maker on orders
  for insert
  with check (maker_address = auth.jwt() ->> 'address');

create policy orders_update_maker on orders
  for update
  using (maker_address = auth.jwt() ->> 'address')
  with check (maker_address = auth.jwt() ->> 'address');

create policy orders_delete_maker on orders
  for delete
  using (maker_address = auth.jwt() ->> 'address');

-- trades -----------------------------------------------------------------------
alter table trades enable row level security;

create policy trades_select_participant on trades
  for select
  using (
    buyer_address = auth.jwt() ->> 'address'
    or seller_address = auth.jwt() ->> 'address'
  );

create policy trades_update_participant on trades
  for update
  using (
    buyer_address = auth.jwt() ->> 'address'
    or seller_address = auth.jwt() ->> 'address'
  )
  with check (
    buyer_address = auth.jwt() ->> 'address'
    or seller_address = auth.jwt() ->> 'address'
  );

create policy trades_insert_service_role on trades
  for insert
  with check (auth.role() = 'service_role');

-- messages ---------------------------------------------------------------------
alter table messages enable row level security;

create policy messages_select_participant on messages
  for select
  using (
    exists (
      select 1 from trades t
      where t.id = messages.trade_id
        and (
          t.buyer_address = auth.jwt() ->> 'address'
          or t.seller_address = auth.jwt() ->> 'address'
        )
    )
  );

create policy messages_insert_participant on messages
  for insert
  with check (
    exists (
      select 1 from trades t
      where t.id = messages.trade_id
        and (
          t.buyer_address = auth.jwt() ->> 'address'
          or t.seller_address = auth.jwt() ->> 'address'
        )
    )
  );

-- ratings ----------------------------------------------------------------------
alter table ratings enable row level security;

create policy ratings_select_public on ratings
  for select
  using (true);

create policy ratings_insert_participant_on_released_trade on ratings
  for insert
  with check (
    exists (
      select 1 from trades t
      where t.id = ratings.trade_id
        and t.status = 'released'
        and (
          t.buyer_address = auth.jwt() ->> 'address'
          or t.seller_address = auth.jwt() ->> 'address'
        )
    )
  );
