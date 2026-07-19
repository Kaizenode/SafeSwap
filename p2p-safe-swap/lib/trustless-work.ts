const BASE_URL = "https://dev.api.trustlesswork.com";

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

export interface SendTransactionRequest {
  signedXdr: string;
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

    initialize: (body: Record<string, unknown>) =>
      request("/escrow/initialize-escrow", {
        method: "POST",
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

    completeEscrow: (body: Record<string, unknown>) =>
      request("/escrow/complete-escrow", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    disputeEscrow: (body: Record<string, unknown>) =>
      request("/escrow/dispute-escrow", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    resolveDispute: (body: Record<string, unknown>) =>
      request("/escrow/resolve-dispute", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  stellar: {
    sendTransaction: (body: SendTransactionRequest) =>
      request("/helper/send-transaction", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
