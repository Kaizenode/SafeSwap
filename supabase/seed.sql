-- supabase/seed.sql
--
-- Local-dev seed data for Sprint 2 UI work. Run automatically by the
-- Supabase CLI after `supabase db reset` (default behavior for a file at
-- this exact path — no config.toml entry required unless seeding has been
-- explicitly disabled there).
--
-- 5 fake users + 5 open CRC sell orders, covering both payment methods
-- (bank_transfer_cr, sinpe_movil, and one order offering both) so
-- /p2p/orders has a non-empty, visually varied list to render against
-- once Sprint 2 wires it up.
--
-- Addresses are NOT valid Stellar strkeys (no real checksum) — they're
-- just G-prefixed, fixed-length placeholders for local dev. Never use
-- data from this file outside a local/dev database.
-- Closes: https://github.com/Kaizenode/SafeSwap/issues/365

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
insert into users (address, display_name, preferred_mode, verified, ops_count, rating_avg)
values
  ('GALICE2222222222222222222222222222222222222222222222222', 'Alice',   'sell', true,  14, 4.80),
  ('GBOBXX2222222222222222222222222222222222222222222222222', 'Bob',     'sell', true,   6, 4.50),
  ('GCARLA22222222222222222222222222222222222222222222222222', 'Carla',  'sell', false,  0, null),
  ('GDIEGO222222222222222222222222222222222222222222222222222', 'Diego', 'buy',  true,  22, 4.90),
  ('GELENA222222222222222222222222222222222222222222222222222', 'Elena', 'sell', true,   3, 5.00)
on conflict (address) do nothing;

-- ---------------------------------------------------------------------------
-- orders — 5 open CRC sell orders, mixed payment methods
-- ---------------------------------------------------------------------------
insert into orders (maker_address, mode, fiat, price, available, min_limit, max_limit, payment_methods, window_minutes, status)
values
  ('GALICE2222222222222222222222222222222222222222222222222',   'sell', 'CRC', 518.50, 500,  10000, 250000, array['bank_transfer_cr'],                     30, 'open'),
  ('GBOBXX2222222222222222222222222222222222222222222222222',   'sell', 'CRC', 520.00, 1000, 25000, 500000, array['sinpe_movil'],                          15, 'open'),
  ('GCARLA22222222222222222222222222222222222222222222222222',  'sell', 'CRC', 517.25, 250,  10000, 100000, array['bank_transfer_cr', 'sinpe_movil'],      60, 'open'),
  ('GELENA222222222222222222222222222222222222222222222222222', 'sell', 'CRC', 519.75, 750,  15000, 400000, array['sinpe_movil'],                          30, 'open'),
  ('GALICE2222222222222222222222222222222222222222222222222',   'sell', 'CRC', 521.00, 300,  10000, 150000, array['bank_transfer_cr'],                     45, 'open');
