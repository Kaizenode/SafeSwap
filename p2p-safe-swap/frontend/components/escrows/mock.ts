import type { IndexerEscrow, Roles } from "./types";

// Deterministic mock escrows shaped exactly like the indexer response, so the
// UI + adapters can be built and tested before the real endpoint is wired
// (blocked on #306 / PR #324). Swap these out in client.ts, not here.

const SIGNER = "GBUSER000000000000000000000000000000000000000000000000000SELF";

function roles(overrides: Partial<Roles>): Roles {
  return {
    approver: "GBAPPROVER00000000000000000000000000000000000000000000000000",
    serviceProvider: "GBSERVICE0000000000000000000000000000000000000000000000000",
    platformAddress: "GBPLATFORM000000000000000000000000000000000000000000000000",
    releaseSigner: "GBRELEASE0000000000000000000000000000000000000000000000000",
    disputeResolver: "GBDISPUTE0000000000000000000000000000000000000000000000000",
    receiver: "GBRECEIVER000000000000000000000000000000000000000000000000",
    ...overrides,
  };
}

const USDC = { symbol: "USDC", address: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", name: "USD Coin" };

/** MOCK_ESCROWS[i].signer is SELF, so this wallet participates in every record. */
export const MOCK_SIGNER = SIGNER;

export const MOCK_ESCROWS: IndexerEscrow[] = [
  {
    signer: SIGNER,
    user: SIGNER,
    contractId: "CONTRACT_PENDING_0001",
    engagementId: "eng-001",
    title: "USDC buy from Diego V.",
    description: "P2P USDC purchase, SEPA",
    roles: roles({ receiver: SIGNER }), // signer receives → "in"
    amount: 250,
    platformFee: 1.5,
    balance: 0, // not funded → pending
    milestones: [{ description: "Fiat sent", status: "pending" }],
    flags: {},
    trustline: USDC,
    isActive: true,
    createdAt: "2026-07-19T09:12:00.000Z",
    updatedAt: "2026-07-19T09:12:00.000Z",
    type: "single-release",
  },
  {
    signer: SIGNER,
    user: SIGNER,
    contractId: "CONTRACT_FUNDED_0002",
    engagementId: "eng-002",
    title: "USDC sell to Ana C.",
    description: "P2P USDC sale, Bizum",
    roles: roles({ serviceProvider: SIGNER }), // signer pays in → "out"
    amount: 600,
    platformFee: 3,
    balance: 600, // funded, not released
    milestones: [{ description: "Escrow funded", status: "funded" }],
    flags: {},
    trustline: USDC,
    isActive: true,
    createdAt: "2026-07-18T14:15:00.000Z",
    updatedAt: "2026-07-18T16:02:00.000Z",
    type: "single-release",
  },
  {
    signer: SIGNER,
    user: SIGNER,
    contractId: "CONTRACT_DISPUTED_0003",
    engagementId: "eng-003",
    title: "USDC buy from Carlos L.",
    description: "P2P USDC purchase, Revolut",
    roles: roles({ receiver: SIGNER }),
    amount: 120,
    platformFee: 0.6,
    balance: 120,
    milestones: [{ description: "Payment disputed", status: "disputed", evidence: "receipt.png" }],
    flags: { disputed: true },
    disputeStartedBy: SIGNER,
    trustline: USDC,
    isActive: true,
    createdAt: "2026-07-17T19:30:00.000Z",
    updatedAt: "2026-07-18T08:44:00.000Z",
    type: "single-release",
  },
  {
    signer: SIGNER,
    user: SIGNER,
    contractId: "CONTRACT_RELEASED_0004",
    engagementId: "eng-004",
    title: "USDC sell to Sofía P.",
    description: "P2P USDC sale, Wise",
    roles: roles({ serviceProvider: SIGNER }),
    amount: 5000,
    platformFee: 25,
    balance: 0, // released → balance drained
    milestones: [{ description: "Funds released", status: "released", approved: true }],
    flags: { released: true, approved: true },
    trustline: USDC,
    isActive: false,
    createdAt: "2026-07-01T11:00:00.000Z",
    updatedAt: "2026-07-02T10:10:00.000Z",
    type: "single-release",
  },
];
