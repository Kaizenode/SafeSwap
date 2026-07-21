const BASE_URL = "https://dev.api.trustlesswork.com";

function getHeaders() {
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY;
  if (!apiKey) throw new Error("TRUSTLESS_WORK_API_KEY is not set");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`Trustless Work API error ${res.status}: ${error}`);
  }

  return res.json() as Promise<T>;
}

export interface ApproveMilestonesParams {
  contractId: string;
  approver: string;
  milestoneIndexes?: number[];
}

export interface ApproveMilestonesResponse {
  unsignedXdr: string;
  [key: string]: unknown;
}

export interface SendTransactionResponse {
  status?: string;
  txHash?: string;
  [key: string]: unknown;
}

export const trustlessWork = {
  escrow: {
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

    approveMilestones: (body: ApproveMilestonesParams) =>
      request<ApproveMilestonesResponse>(
        "/escrow/single-release/v2/approve-milestones",
        {
          method: "POST",
          body: JSON.stringify({
            contractId: body.contractId,
            approver: body.approver,
            milestoneIndexes: body.milestoneIndexes ?? [0],
          }),
        }
      ),

    sendTransaction: (signedXdr: string) =>
      request<SendTransactionResponse>("/escrow/send-transaction", {
        method: "POST",
        body: JSON.stringify({ signedXdr }),
      }),
  },
};

export async function signAndSendTransaction(
  unsignedXdr: string
): Promise<SendTransactionResponse> {
  let signedXdr: string = unsignedXdr;

  if (typeof window !== "undefined") {
    try {
      const freighter = (window as any).freighter;
      if (freighter && typeof freighter.signTransaction === "function") {
        signedXdr = await freighter.signTransaction(unsignedXdr, {
          network: "TESTNET",
        });
      } else if (
        (window as any).stellar &&
        typeof (window as any).stellar.signTransaction === "function"
      ) {
        signedXdr = await (window as any).stellar.signTransaction(unsignedXdr);
      } else {
        const freighterApi = await import("@stellar/freighter-api").catch(
          () => null
        );
        if (
          freighterApi &&
          typeof freighterApi.signTransaction === "function"
        ) {
          const result = await freighterApi.signTransaction(unsignedXdr, {
            networkPassphrase: "Test SDF Network ; November 2015",
          });
          if (typeof result === "string") {
            signedXdr = result;
          } else if (result && (result as any).signedTxXdr) {
            signedXdr = (result as any).signedTxXdr;
          }
        }
      }
    } catch (err) {
      console.warn("Wallet signing prompt failed or cancelled:", err);
      throw err;
    }
  }

  return await trustlessWork.escrow.sendTransaction(signedXdr);
}

