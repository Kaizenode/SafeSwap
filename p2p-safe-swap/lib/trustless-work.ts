const BASE_URL = "https://dev.api.trustlesswork.com";

function getHeaders() {
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY;
  if (!apiKey) throw new Error("TRUSTLESS_WORK_API_KEY is not set");

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
    throw new Error(`Trustless Work API error ${res.status}: ${error}`);
  }

  return res.json() as Promise<T>;
}

export const trustlessWork = {
  deploy: (body: Record<string, unknown>) =>
    request("/deploy", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  fund: (body: Record<string, unknown>) =>
    request("/fund", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  changeMilestoneStatus: (body: Record<string, unknown>) =>
    request("/change-milestone-status", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  approveMilestones: (body: Record<string, unknown>) =>
    request("/approve-milestones", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  releaseFunds: (body: Record<string, unknown>) =>
    request("/release-funds", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (body: Record<string, unknown>) =>
    request("/update", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  dispute: (body: Record<string, unknown>) =>
    request("/dispute", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  resolveDispute: (body: Record<string, unknown>) =>
    request("/resolve-dispute", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  sendTransaction: (body: Record<string, unknown>) =>
    request("/send-transaction", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getEscrowsBySigner: (signer: string) =>
    request(`/get-escrows-by-signer?signer=${signer}`),

  getMultipleEscrowBalance: (body: Record<string, unknown>) =>
    request("/get-multiple-escrow-balance", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
