-- 0001_initial_schema.sql
-- Five MVP tables: users, orders, trades, messages, ratings.
-- Indexes and updated_at triggers included.
-- Spec: docs/SPRINT-1-ISSUES.md Issue #9 / PRD-MVP.md §7
-- Closes: https://github.com/Kaizenode/SafeSwap/issues/369

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger function (shared by orders + trades)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table if not exists users (
  address        text        primary key,            -- G… Stellar public key
  display_name   text,
  preferred_mode text        check (preferred_mode in ('buy', 'sell')),
  email          text        unique,                 -- optional; only set when opting into notifications
  avatar_seed    text,
  verified       boolean     not null default false,
  ops_count      int         not null default 0,
  rating_avg     numeric(3,2),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id              uuid        primary key default gen_random_uuid(),
  maker_address   text        not null references users(address),
  mode            text        not null check (mode in ('buy', 'sell')),   -- MVP UI only exposes 'sell'
  fiat            text        not null check (fiat = 'CRC'),              -- MVP: CRC only
  price           numeric     not null,                                   -- CRC per USDC
  available       numeric     not null,                                   -- USDC remaining
  min_limit       numeric     not null,                                   -- CRC
  max_limit       numeric     not null,                                   -- CRC
  payment_methods text[]      not null
    check (payment_methods <@ array['bank_transfer_cr', 'sinpe_movil']),
  window_minutes  int,
  status          text        not null
    check (status in ('open', 'paused', 'filled', 'cancelled', 'expired')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes for orders
create index if not exists orders_status_price_idx      on orders (status, price);
create index if not exists orders_maker_address_idx     on orders (maker_address);

-- updated_at trigger for orders
create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
create table if not exists trades (
  id                 uuid        primary key default gen_random_uuid(),
  order_id           uuid        not null references orders(id),
  buyer_address      text        not null references users(address),
  seller_address     text        not null references users(address),
  amount_usdc        numeric     not null,
  amount_fiat        numeric     not null,                              -- CRC, derived at creation from order.price
  payment_method     text        not null
    check (payment_method in ('bank_transfer_cr', 'sinpe_movil')),
  payment_reference  text,                                             -- buyer-supplied reference on "I've paid"
  contract_id        text,                                             -- Stellar C… once deployed
  status             text        not null
    check (status in (
      'pending_escrow',
      'funded',
      'fiat_sent',
      'approved',
      'released',
      'disputed',
      'resolved',
      'cancelled'
    )),
  tx_hashes          jsonb,                                            -- {deploy, fund, milestone, approve, release, dispute, resolve}
  dispute_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Indexes for trades
create index if not exists trades_buyer_address_created_at_idx
  on trades (buyer_address, created_at desc);

create index if not exists trades_seller_address_created_at_idx
  on trades (seller_address, created_at desc);

-- Unique partial index: a contract_id must be globally unique, but only when set
create unique index if not exists trades_contract_id_unique_idx
  on trades (contract_id)
  where contract_id is not null;

-- updated_at trigger for trades
create trigger trades_set_updated_at
  before update on trades
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id             uuid        primary key default gen_random_uuid(),
  trade_id       uuid        not null references trades(id),
  author_address text,
  kind           text        not null check (kind in ('text', 'payment_confirmation', 'system')),
  body           jsonb       not null,
  created_at     timestamptz not null default now()
);

-- Index for messages: chat pagination
create index if not exists messages_trade_id_created_at_idx
  on messages (trade_id, created_at);

-- ---------------------------------------------------------------------------
-- ratings
-- ---------------------------------------------------------------------------
create table if not exists ratings (
  id             uuid        primary key default gen_random_uuid(),
  trade_id       uuid        not null references trades(id),
  rater_address  text        not null,
  ratee_address  text        not null,
  score          int         not null check (score between 1 and 5),
  comment        text,
  created_at     timestamptz not null default now(),
  unique (trade_id, rater_address)
);

-- TODO (Sprint 4 / F10): add an AFTER INSERT trigger on ratings that
-- recalculates users.rating_avg and increments users.ops_count for the
-- ratee_address whenever a new rating row is inserted on a released trade.
-- Example skeleton:
--   create function refresh_user_rating() returns trigger language plpgsql as $$
--   begin
--     update users
--        set rating_avg = (select avg(score) from ratings where ratee_address = new.ratee_address),
--            ops_count   = (select count(*)   from ratings where ratee_address = new.ratee_address)
--      where address = new.ratee_address;
--     return new;
--   end; $$;
--   create trigger ratings_refresh_user_rating after insert on ratings ...
