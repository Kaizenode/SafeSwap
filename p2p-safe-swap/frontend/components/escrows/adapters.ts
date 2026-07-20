import type { Transaction } from "@/frontend/components/ui/transaction-list";
import type { P2POrder } from "@/frontend/components/p2p/types";
import type { EscrowStatus, IndexerEscrow } from "./types";
import { deriveEscrowStatus, directionForSigner, roleOfSigner } from "./status";

// Adapters map an indexer escrow onto the existing UI view-models.
//
// Both output types are the existing shapes PLUS a derived `status` and
// `contractId`, so the current components keep rendering while the pages gain
// live escrow status. Extend the shared `Transaction` / `P2POrder` types (and
// their components) to display `status` as a follow-up UI step.

export type EscrowTransaction = Transaction & {
  status: EscrowStatus;
  contractId?: string;
};

export type EscrowOrder = P2POrder & {
  status: EscrowStatus;
  contractId?: string;
};

function shortAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** The other side of the trade, relative to the connected wallet. */
function counterpartyAddress(escrow: IndexerEscrow, signer: string): string {
  const isReceiver = roleOfSigner(escrow, signer) === "receiver";
  return isReceiver ? escrow.roles.serviceProvider : escrow.roles.receiver;
}

/** Escrow → transactions-list row. */
export function escrowToTransaction(
  escrow: IndexerEscrow,
  signer: string
): EscrowTransaction {
  return {
    id: escrow.contractId ?? escrow.engagementId,
    contractId: escrow.contractId,
    address: shortAddress(counterpartyAddress(escrow, signer)),
    memo: escrow.title,
    amount: escrow.amount,
    date: escrow.createdAt,
    type: directionForSigner(escrow, signer),
    status: deriveEscrowStatus(escrow),
  };
}

/**
 * Escrow → orders-list card.
 *
 * Marketplace-only fields (price, currencyPair, rating, opsCount, verified,
 * windowMinutes, paymentMethods) are NOT part of on-chain escrow data — they
 * are set to safe placeholders here. The meaningful, live fields are `status`,
 * `available` (current balance), amount limits, and the counterparty address.
 */
export function escrowToOrder(
  escrow: IndexerEscrow,
  signer: string
): EscrowOrder {
  const counterparty = counterpartyAddress(escrow, signer);
  return {
    id: escrow.contractId ?? escrow.engagementId,
    contractId: escrow.contractId,
    status: deriveEscrowStatus(escrow),
    user: {
      name: escrow.title || shortAddress(counterparty),
      initials: shortAddress(counterparty).slice(0, 2).toUpperCase(),
      verified: false,
      rating: 0,
      opsCount: 0,
      address: counterparty,
    },
    price: 0, // not on-chain
    currencyPair: { base: escrow.trustline.symbol, quote: escrow.trustline.symbol },
    available: escrow.balance ?? escrow.amount,
    limits: { min: 0, max: escrow.amount },
    windowMinutes: 0, // not on-chain
    paymentMethods: [], // not on-chain
  };
}
