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
  },
  helper: {
    getMultipleEscrowBalance: (addresses: string[]) =>
      request("/helper/get-multiple-escrow-balance", {
        method: "POST",
        body: JSON.stringify({ addresses }),
      }),
  },
};
