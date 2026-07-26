import type { EscrowStatus, Flags, IndexerEscrow, Role } from "./types";

// Flags may be top-level (single-release) or per milestone (multi-release).
function collectFlags(escrow: IndexerEscrow): Flags[] {
  const sets: Flags[] = [];
  if (escrow.flags) sets.push(escrow.flags);
  for (const milestone of escrow.milestones ?? []) {
    if (milestone.flags) sets.push(milestone.flags);
  }
  return sets;
}

// Precedence: disputed > released > funded (balance > 0) > pending.
export function deriveEscrowStatus(escrow: IndexerEscrow): EscrowStatus {
  const flagSets = collectFlags(escrow);
  const milestones = escrow.milestones ?? [];

  if (flagSets.some((f) => f.disputed && !f.resolved)) return "disputed";

  const topReleased = Boolean(escrow.flags?.released);
  const allMilestonesReleased =
    milestones.length > 0 && milestones.every((m) => m.flags?.released);
  if (topReleased || allMilestonesReleased) return "released";

  if ((escrow.balance ?? 0) > 0) return "funded";
  return "pending";
}

// Receiver may be in roles or per milestone.
function receiverAddresses(escrow: IndexerEscrow): string[] {
  const addrs: string[] = [];
  if (escrow.roles.receiver) addrs.push(escrow.roles.receiver);
  for (const milestone of escrow.milestones ?? []) {
    if (milestone.receiver) addrs.push(milestone.receiver);
  }
  return addrs;
}

// Which role the connected wallet plays, if any.
export function roleOfSigner(escrow: IndexerEscrow, signer: string): Role | null {
  const target = signer.toLowerCase();

  if (receiverAddresses(escrow).some((a) => a.toLowerCase() === target)) {
    return "receiver";
  }

  const match = (Object.keys(escrow.roles) as Role[]).find(
    (role) => escrow.roles[role]?.toLowerCase() === target
  );
  return match ?? null;
}

export function directionForSigner(
  escrow: IndexerEscrow,
  signer: string
): "in" | "out" {
  return roleOfSigner(escrow, signer) === "receiver" ? "in" : "out";
}
