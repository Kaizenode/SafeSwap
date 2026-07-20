// Types for the Trustless Work indexer endpoint
//   GET /helper/get-escrows-by-signer  →  GetEscrowsFromIndexerResponse[]
//
// Sourced from the official Trustless Work docs (single-release / v1 shape):
//   https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/types
//
// NOTE: These live here (not in lib/trustless-work.ts) on purpose — the API
// client is being rewritten under issue #306 / PR #324. Keeping the feature
// types local avoids a collision; move/re-export once that lands.

export type EscrowType = "single-release" | "multi-release";

export type Role =
  | "approver"
  | "serviceProvider"
  | "platformAddress"
  | "releaseSigner"
  | "disputeResolver"
  | "receiver";

export type Roles = {
  approver: string;
  serviceProvider: string;
  platformAddress: string;
  releaseSigner: string;
  disputeResolver: string;
  receiver: string;
};

export type SingleReleaseMilestone = {
  description: string;
  status?: string;
  evidence?: string;
  approved?: boolean;
};

export type Flags = {
  disputed?: boolean;
  released?: boolean;
  resolved?: boolean;
  approved?: boolean;
};

export type Trustline = {
  symbol: string;
  address: string;
  name?: string;
};

/**
 * One escrow record as returned by the indexer.
 * `createdAt` / `updatedAt` are typed `Date` in the docs but arrive as ISO
 * strings over the wire — treat them as strings and parse when needed.
 */
export type IndexerEscrow = {
  signer?: string;
  contractId?: string;
  engagementId: string;
  title: string;
  description: string;
  roles: Roles;
  amount: number;
  platformFee: number;
  balance?: number;
  milestones: SingleReleaseMilestone[];
  flags?: Flags;
  trustline: Trustline;
  receiverMemo?: number;
  disputeStartedBy?: string;
  fundedBy?: string;
  isActive?: boolean;
  approverFunds?: string;
  receiverFunds?: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  type: EscrowType;
};

/**
 * Derived, UI-facing escrow status. NOT a field on the response — computed
 * from `flags` + `balance` (see status.ts). Mirrors the four states the
 * acceptance criteria call for.
 */
export type EscrowStatus = "pending" | "funded" | "disputed" | "released";

/**
 * Query params for GET /helper/get-escrows-by-signer.
 * `signer` is required (the connected wallet); everything else filters/sorts.
 * Pagination is page-based (no cursor, no total in the response).
 */
export type GetEscrowsBySignerParams = {
  signer: string;
  type?: EscrowType;
  status?: EscrowStatus;
  role?: Role;
  engagementId?: string;
  isActive?: boolean;
  orderBy?: "createdAt" | "updatedAt" | "amount";
  orderDirection?: "asc" | "desc";
  page?: number;
  title?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  validateOnChain?: boolean;
};
