import type { EscrowStatus, IndexerEscrow, Role } from "./types";

/**
 * Derive the UI status from an escrow's on-chain flags + balance.
 *
 * The indexer does NOT return a single `status` string, so we compute it.
 * Precedence (provisional — reconcile against the real `SingleReleaseEscrowStatus`
 * enum once the #306/#324 client lands):
 *   released  → funds have been released to the receiver
 *   disputed  → an open, unresolved dispute
 *   funded    → USDC is locked in the contract but not yet released
 *   pending   → deployed but not yet funded
 */
export function deriveEscrowStatus(escrow: IndexerEscrow): EscrowStatus {
  const flags = escrow.flags ?? {};

  if (flags.released) return "released";
  if (flags.disputed && !flags.resolved) return "disputed";
  if ((escrow.balance ?? 0) > 0) return "funded";
  return "pending";
}

/**
 * Which role the connected wallet plays in a given escrow, if any.
 * Used to decide transaction direction (in/out) on the transactions list.
 */
export function roleOfSigner(
  escrow: IndexerEscrow,
  signer: string
): Role | null {
  const { roles } = escrow;
  const match = (Object.keys(roles) as Role[]).find(
    (role) => roles[role]?.toLowerCase() === signer.toLowerCase()
  );
  return match ?? null;
}

/**
 * Direction of funds relative to the connected wallet.
 * The receiver is money-in; every other funding role (approver / service
 * provider paying into escrow) is money-out.
 */
export function directionForSigner(
  escrow: IndexerEscrow,
  signer: string
): "in" | "out" {
  return roleOfSigner(escrow, signer) === "receiver" ? "in" : "out";
}
