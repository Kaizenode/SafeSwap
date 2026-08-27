import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  approveEscrowMilestone,
  EscrowApproveMilestoneError,
} from "../frontend/lib/escrow-approve-milestone";
import type { ApproveMilestoneInput } from "../frontend/lib/escrow-approve-milestone";

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_INPUT: ApproveMilestoneInput = {
  contractId: "CONTRACT123",
  approver: "GAPPROVER123",
  milestoneIndexes: [0],
};

const UNSIGNED_XDR = "AAAAAGphbmljZQAAAAAAAAA...";
const SIGNED_XDR = "SIGNED_XDR_BASE64";
const SUBMIT_RESPONSE = { status: "SUCCESS", txHash: "abc123" };

function mockSignTransaction(signedXdr: string = SIGNED_XDR) {
  return vi.fn().mockResolvedValue(signedXdr);
}

/**
 * Build a mock `fetch` that handles both the approve-milestones endpoint
 * (returning `unsignedXdr`) and the send-transaction endpoint (returning
 * a success receipt). Each call returns a Response-like object with `.ok`,
 * `.status`, and `.json()`.
 */
function mockFetchFullFlow() {
  return vi.fn().mockImplementation(async (url: string) => {
    if (typeof url === "string" && url.includes("approve-milestones")) {
      return {
        ok: true,
        json: () => Promise.resolve({ unsignedXdr: UNSIGNED_XDR }),
      };
    }
    if (typeof url === "string" && url.includes("send-transaction")) {
      return {
        ok: true,
        json: () => Promise.resolve(SUBMIT_RESPONSE),
      };
    }
    return { ok: false, status: 500, json: () => Promise.resolve({ error: "Unknown" }) };
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("approveEscrowMilestone", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls the correct endpoint with the correct payload", async () => {
    const fetchSpy = mockFetchFullFlow();
    globalThis.fetch = fetchSpy;
    const signTransaction = mockSignTransaction();

    await approveEscrowMilestone(VALID_INPUT, signTransaction);

    // First call is the approve-milestones endpoint
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/escrow/single-release/v2/approve-milestones");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body).toEqual({
      contractId: "CONTRACT123",
      approver: "GAPPROVER123",
      milestoneIndexes: [0],
    });
  });

  it("sends milestoneIndexes as an array of numbers", async () => {
    const fetchSpy = mockFetchFullFlow();
    globalThis.fetch = fetchSpy;
    const signTransaction = mockSignTransaction();

    await approveEscrowMilestone(
      { ...VALID_INPUT, milestoneIndexes: [0, 1, 2] },
      signTransaction
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.milestoneIndexes).toEqual([0, 1, 2]);
    expect(Array.isArray(body.milestoneIndexes)).toBe(true);
  });

  it("calls signTransaction with the unsignedXdr from the API", async () => {
    globalThis.fetch = mockFetchFullFlow();
    const signTransaction = mockSignTransaction("SIGNED_RESULT");

    await approveEscrowMilestone(VALID_INPUT, signTransaction);

    expect(signTransaction).toHaveBeenCalledOnce();
    expect(signTransaction).toHaveBeenCalledWith(UNSIGNED_XDR);
  });

  it("submits the signed transaction via send-transaction", async () => {
    const fetchSpy = mockFetchFullFlow();
    globalThis.fetch = fetchSpy;
    const signTransaction = mockSignTransaction();

    await approveEscrowMilestone(VALID_INPUT, signTransaction);

    // Second call is the send-transaction endpoint
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    const [url, opts] = fetchSpy.mock.calls[1];
    expect(url).toBe("/api/stellar/send-transaction");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body);
    expect(body.signedXdr).toBe(SIGNED_XDR);
  });

  it("reports status changes through onStatusChange", async () => {
    globalThis.fetch = mockFetchFullFlow();
    const signTransaction = mockSignTransaction();
    const onStatusChange = vi.fn();

    await approveEscrowMilestone(VALID_INPUT, signTransaction, onStatusChange);

    expect(onStatusChange).toHaveBeenCalledWith("requesting-signature");
    expect(onStatusChange).toHaveBeenCalledWith("submitting");
    expect(onStatusChange).toHaveBeenCalledWith("approved");
  });

  it("reports 'failed' and throws on API error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal server error" }),
    });
    const signTransaction = mockSignTransaction();
    const onStatusChange = vi.fn();

    await expect(
      approveEscrowMilestone(VALID_INPUT, signTransaction, onStatusChange)
    ).rejects.toThrow(EscrowApproveMilestoneError);

    expect(onStatusChange).toHaveBeenCalledWith("failed");
  });

  it("reports 'failed' and throws when API returns no unsignedXdr", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const signTransaction = mockSignTransaction();
    const onStatusChange = vi.fn();

    await expect(
      approveEscrowMilestone(VALID_INPUT, signTransaction, onStatusChange)
    ).rejects.toThrow("did not return an approve transaction");

    expect(onStatusChange).toHaveBeenCalledWith("failed");
  });

  it("throws EscrowApproveMilestoneError when wallet rejects signing", async () => {
    globalThis.fetch = mockFetchFullFlow();
    const signTransaction = vi.fn().mockRejectedValue(new Error("User rejected"));

    await expect(
      approveEscrowMilestone(VALID_INPUT, signTransaction)
    ).rejects.toThrow(EscrowApproveMilestoneError);
  });

  it("throws EscrowApproveMilestoneError when send-transaction fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("approve-milestones")) {
        return { ok: true, json: () => Promise.resolve({ unsignedXdr: UNSIGNED_XDR }) };
      }
      if (typeof url === "string" && url.includes("send-transaction")) {
        return { ok: false, status: 400, json: () => Promise.resolve({ error: "Submission failed" }) };
      }
      return { ok: false, status: 500, json: () => Promise.resolve({}) };
    });
    const signTransaction = mockSignTransaction();

    await expect(
      approveEscrowMilestone(VALID_INPUT, signTransaction)
    ).rejects.toThrow(EscrowApproveMilestoneError);
  });

  it("throws when contractId is empty", async () => {
    const signTransaction = mockSignTransaction();

    await expect(
      approveEscrowMilestone({ ...VALID_INPUT, contractId: "" }, signTransaction)
    ).rejects.toThrow(EscrowApproveMilestoneError);
  });

  it("throws when approver is empty", async () => {
    const signTransaction = mockSignTransaction();

    await expect(
      approveEscrowMilestone({ ...VALID_INPUT, approver: "" }, signTransaction)
    ).rejects.toThrow(EscrowApproveMilestoneError);
  });

  it("throws when milestoneIndexes is empty", async () => {
    const signTransaction = mockSignTransaction();

    await expect(
      approveEscrowMilestone({ ...VALID_INPUT, milestoneIndexes: [] }, signTransaction)
    ).rejects.toThrow(EscrowApproveMilestoneError);
  });
});
