import type { EscrowRoles } from "../types";

export const ROLE_LABELS: Record<keyof EscrowRoles, string> = {
  approver: "Approver",
  serviceProvider: "Service provider",
  releaseSigner: "Release signer",
  disputeResolver: "Dispute resolver",
  receiver: "Receiver",
  platformAddress: "Platform address",
};

export function formatAmount(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function createMilestoneId() {
  return `ms-${crypto.randomUUID()}`;
}
