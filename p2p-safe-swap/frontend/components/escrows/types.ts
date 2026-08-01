// Types for GET /helper/get-escrows-by-signer.
// Shapes match the live API, which differs from the docs: on multi-release
// records `flags`, `amount`, and `receiver` live per milestone (top-level is
// null/absent), and timestamps are Firestore objects. Helpers tolerate both.

export type EscrowType = "single-release" | "multi-release";

export type Role =
  | "approver"
  | "serviceProvider"
  | "platformAddress"
  | "releaseSigner"
  | "disputeResolver"
  | "receiver";

export type Roles = Partial<Record<Role, string>>;

export type Flags = {
  disputed?: boolean;
  released?: boolean;
  resolved?: boolean;
  approved?: boolean;
};

export type Milestone = {
  description: string;
  amount?: number;
  status?: string;
  evidence?: string;
  approved?: boolean;
  flags?: Flags;
  receiver?: string;
};

export type SingleReleaseMilestone = Milestone;

export type Trustline = {
  symbol: string;
  address: string;
  contractId?: string;
  name?: string;
};

export type FirestoreTimestamp = { _seconds: number; _nanoseconds: number };
export type Timestamp = string | FirestoreTimestamp;

export type IndexerEscrow = {
  signer?: string;
  contractId?: string;
  contractBaseId?: string;
  engagementId: string;
  title: string;
  description: string;
  roles: Roles;
  amount?: number | null;
  platformFee?: number;
  balance?: number;
  milestones: Milestone[];
  flags?: Flags | null;
  trustline: Trustline;
  receiverMemo?: number;
  disputeStartedBy?: string;
  fundedBy?: string;
  isActive?: boolean;
  user?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  type: EscrowType;
};

// Derived from flags + balance (see status.ts); not a field on the response.
export type EscrowStatus = "pending" | "funded" | "disputed" | "released";

// `signer` required; the rest filter/sort. Pagination is page-based.
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
