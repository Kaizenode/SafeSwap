const BASE_URL =
  process.env.TW_NETWORK === "mainnet"
    ? "https://api.trustlesswork.com"
    : "https://dev.api.trustlesswork.com";

export class TrustlessWorkApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: string
  ) {
    super(`Trustless Work API error ${status}: ${details}`);
    this.name = "TrustlessWorkApiError";
  }
}

export type EscrowRoles = {
  approver: string;
  serviceProvider: string;
  platformAddress: string;
  releaseSigner: string;
  disputeResolver: string;
  receiver: string;
};

export type EscrowTrustline = {
  address: string;
  symbol: string;
};

export interface EscrowMilestone {
  description: string;
  status?: string;
  approved?: boolean;
}

export interface DeploySingleReleaseV2Request {
  signer: string;
  engagementId: string;
  title: string;
  description: string;
  roles: EscrowRoles;
  amount: number;
  platformFee: number;
  milestones: EscrowMilestone[];
  trustline: EscrowTrustline;
}

export interface DeploySingleReleaseV2Response {
  unsignedTransaction?: string;
  contractId?: string;
  status?: string;
}

// ─── Fund ────────────────────────────────────────────────────────────────────

export interface FundSingleReleaseEscrowRequest {
  contractId: string;
  signer: string;
  amount: string | number;
}

export interface FundSingleReleaseEscrowResponse {
  unsignedTransaction?: string;
  status?: string;
}

// ─── Dispute ─────────────────────────────────────────────────────────────────

export const DISPUTE_REASON_MAX_LENGTH = 500;

/**
 * Trustless Work's dev API only accepts `contractId` and `signer` — `reason`
 * is enforced at our API boundary and persisted client-side as a chat
 * message. See #312 and the endpoint probe results.
 */
export interface DisputeSingleReleaseEscrowRequest {
  contractId: string;
  signer: string;
}

export interface DisputeSingleReleaseEscrowResponse {
  unsignedTransaction?: string;
  status?: string;
}

export interface SendTransactionRequest {
  signedXdr: string;
}

// ─── Milestones / release ──────────────────────────────────────────────────

export interface ApproveMilestoneRequest {
  contractId: string;
  milestoneIndex: string;
  approver: string;
}

export interface ChangeMilestoneStatusRequest {
  contractId: string;
  milestoneIndex: string;
  newEvidence: string;
  newStatus: string;
  serviceProvider: string;
}

export interface ReleaseFundsRequest {
  contractId: string;
  releaseSigner: string;
}

export interface ResolveDisputeRequest {
  contractId: string;
  disputeResolver: string;
  distributions: Array<{ address: string; amount: number }>;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export interface GetEscrowsBySignerParams {
  signer?: string;
  role?: string;
  roleAddress?: string;
  status?: string;
  type?: "single-release" | "multi-release";
  engagementId?: string;
  title?: string;
  isActive?: boolean;
  validateOnChain?: boolean;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  orderBy?: "createdAt" | "updatedAt" | "amount";
  orderDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  contractID?: string;
}

function toQueryString<T extends object>(params: T): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, unknown][]) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      // Bracket notation so the server parses this as an array even with a single item.
      for (const item of value) search.append(`${key}[]`, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function getHeaders() {
  const apiKey = process.env.TW_API_KEY;
  if (!apiKey) throw new Error("TW_API_KEY is not set");

  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new TrustlessWorkApiError(res.status, error);
  }

  return res.json() as Promise<T>;
}

export const trustlessWork = {
  escrow: {
    deploySingleReleaseV2: (body: DeploySingleReleaseV2Request) =>
      request<DeploySingleReleaseV2Response>("/deployer/single-release", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (body: object) =>
      request<{ unsignedXdr: string }>("/escrow/single-release/update-escrow", {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    getByContractId: (contractId: string) =>
      request(`/escrow/get-escrow-by-contract-id?contractId=${contractId}`),

    fundEscrow: (body: Record<string, unknown>) =>
      request("/escrow/fund-escrow", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    fundSingleReleaseV2: (body: FundSingleReleaseEscrowRequest) =>
      request<FundSingleReleaseEscrowResponse>(
        "/escrow/single-release/fund-escrow",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),

    releaseFunds: (body: ReleaseFundsRequest) =>
      request<{ unsignedTransaction?: string; status?: string }>(
        "/escrow/single-release/release-funds",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),

    approveMilestone: (body: ApproveMilestoneRequest) =>
      request<{ unsignedTransaction?: string; status?: string }>(
        "/escrow/single-release/approve-milestone",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),

    changeMilestoneStatus: (body: ChangeMilestoneStatusRequest) =>
      request<{ unsignedTransaction?: string; status?: string }>(
        "/escrow/single-release/change-milestone-status",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),

    disputeSingleReleaseV2: (body: DisputeSingleReleaseEscrowRequest) =>
      request<DisputeSingleReleaseEscrowResponse>(
        "/escrow/single-release/dispute-escrow",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),

    disputeEscrow: (body: Record<string, unknown>) =>
      request("/escrow/dispute-escrow", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    resolveDispute: (body: ResolveDisputeRequest) =>
      request<{ unsignedTransaction?: string; status?: string }>(
        "/escrow/single-release/resolve-dispute",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),
  },

  stellar: {
    sendTransaction: (body: SendTransactionRequest) =>
      request("/helper/send-transaction", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  helper: {
    getEscrowsBySigner: (params: GetEscrowsBySignerParams) =>
      request(`/helper/get-escrows-by-signer${toQueryString(params)}`),

    getMultipleEscrowBalance: (addresses: string[]) =>
      request(`/helper/get-multiple-escrow-balance${toQueryString({ addresses })}`),
  },
};
