// tests/rls.test.ts
// Integration tests for supabase/migrations/0002_rls_policies.sql.
// Runs against a local `supabase start` instance (see README "Running RLS tests").
//
// Each test authenticates as a wallet address by minting a JWT signed with the
// project's SUPABASE_JWT_SECRET and passing it as the anon client's bearer
// token — this is how the app's custom wallet-nonce auth reaches
// `auth.jwt() ->> 'address'` inside RLS policies, since auth isn't Supabase Auth.

import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY = process.env.SUPABASE_ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!

const ALICE = 'GALICE0000000000000000000000000000000000000000000000000ALICE'
const BOB = 'GBOB00000000000000000000000000000000000000000000000000000BOB0'
const EVE = 'GEVE00000000000000000000000000000000000000000000000000000EVE0'

function clientAs(address: string): SupabaseClient {
  const token = jwt.sign(
    { address, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 },
    JWT_SECRET
  )
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

let orderId: string
let tradeId: string

beforeAll(async () => {
  // Seed via service role (bypasses RLS) so tests target policy behavior, not setup.
  await service.from('users').upsert([
    { address: ALICE, display_name: 'Alice' },
    { address: BOB, display_name: 'Bob' },
    { address: EVE, display_name: 'Eve' },
  ])

  const { data: order } = await service
    .from('orders')
    .insert({
      maker_address: ALICE,
      mode: 'sell',
      fiat: 'CRC',
      price: 520,
      available: 100,
      min_limit: 1000,
      max_limit: 50000,
      payment_methods: ['sinpe_movil'],
      window_minutes: 30,
      status: 'open',
    })
    .select()
    .single()
  orderId = order!.id

  const { data: trade } = await service
    .from('trades')
    .insert({
      order_id: orderId,
      buyer_address: BOB,
      seller_address: ALICE,
      amount_usdc: 10,
      amount_fiat: 5200,
      payment_method: 'sinpe_movil',
      status: 'funded',
    })
    .select()
    .single()
  tradeId = trade!.id
})

describe('users RLS', () => {
  it('deny: anon cannot select another user row', async () => {
    const { data } = await clientAs(BOB).from('users').select('*').eq('address', ALICE)
    expect(data).toEqual([])
  })

  it('allow: user can select own row', async () => {
    const { data, error } = await clientAs(ALICE).from('users').select('*').eq('address', ALICE)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('deny: user cannot update another user row', async () => {
    const { data } = await clientAs(EVE)
      .from('users')
      .update({ display_name: 'Hacked' })
      .eq('address', ALICE)
      .select()
    expect(data).toEqual([])
  })

  it('allow: user can update own row', async () => {
    const { data, error } = await clientAs(ALICE)
      .from('users')
      .update({ display_name: 'Alice Updated' })
      .eq('address', ALICE)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe('orders RLS', () => {
  it('allow: anon can select public orders', async () => {
    const { data, error } = await clientAs(EVE).from('orders').select('*').eq('id', orderId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it("deny: anon key cannot update someone else's order", async () => {
    const { data } = await clientAs(EVE)
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .select()
    expect(data).toEqual([])
  })

  it('allow: maker can update own order', async () => {
    const { data, error } = await clientAs(ALICE)
      .from('orders')
      .update({ status: 'paused' })
      .eq('id', orderId)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe('trades RLS', () => {
  it("deny: anon key cannot read another user's trade", async () => {
    const { data } = await clientAs(EVE).from('trades').select('*').eq('id', tradeId)
    expect(data).toEqual([])
  })

  it('allow: participant (buyer) can read the trade', async () => {
    const { data, error } = await clientAs(BOB).from('trades').select('*').eq('id', tradeId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('deny: non-participant cannot update the trade', async () => {
    const { data } = await clientAs(EVE)
      .from('trades')
      .update({ status: 'disputed' })
      .eq('id', tradeId)
      .select()
    expect(data).toEqual([])
  })

  it('allow: participant (seller) can update the trade', async () => {
    const { data, error } = await clientAs(ALICE)
      .from('trades')
      .update({ status: 'fiat_sent' })
      .eq('id', tradeId)
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe('messages RLS', () => {
  it('deny: non-participant cannot insert a message', async () => {
    const { data } = await clientAs(EVE)
      .from('messages')
      .insert({ trade_id: tradeId, author_address: EVE, kind: 'text', body: { text: 'hi' } })
      .select()
    expect(data).toBeNull()
  })

  it('allow: participant can insert and select messages', async () => {
    const { data: inserted, error } = await clientAs(BOB)
      .from('messages')
      .insert({ trade_id: tradeId, author_address: BOB, kind: 'text', body: { text: 'paid!' } })
      .select()
    expect(error).toBeNull()
    expect(inserted).toHaveLength(1)

    const { data: read } = await clientAs(ALICE).from('messages').select('*').eq('trade_id', tradeId)
    expect(read!.length).toBeGreaterThan(0)
  })

  it('deny: non-participant cannot select messages', async () => {
    const { data } = await clientAs(EVE).from('messages').select('*').eq('trade_id', tradeId)
    expect(data).toEqual([])
  })
})

describe('ratings RLS', () => {
  it('deny: rating insert fails while trade is not released', async () => {
    const { data } = await clientAs(BOB)
      .from('ratings')
      .insert({ trade_id: tradeId, rater_address: BOB, ratee_address: ALICE, score: 5 })
      .select()
    expect(data).toBeNull()
  })

  it('allow: participant can rate once trade is released', async () => {
    await service.from('trades').update({ status: 'released' }).eq('id', tradeId)

    const { data, error } = await clientAs(BOB)
      .from('ratings')
      .insert({ trade_id: tradeId, rater_address: BOB, ratee_address: ALICE, score: 5 })
      .select()
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('allow: anyone can select ratings', async () => {
    const { data, error } = await clientAs(EVE).from('ratings').select('*').eq('trade_id', tradeId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
  })
})
