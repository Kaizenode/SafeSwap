import type { Transaction } from "@/frontend/components/ui/transaction-list";
import type { P2POrder } from "@/frontend/components/p2p/types";
import type { EscrowStatus, IndexerEscrow, Timestamp } from "./types";
import { deriveEscrowStatus, directionForSigner, roleOfSigner } from "./status";

// Map an indexer escrow onto the existing UI view-models, adding a derived
// `status`. Helpers tolerate the real API shape (per-milestone amount/receiver,
// Firestore timestamps).

export type EscrowTransaction = Transaction & {
  status: EscrowStatus;
  contractId?: string;
};

export type EscrowOrder = P2POrder & {
  status: EscrowStatus;
  contractId?: string;
};

function shortAddress(address: string): string {
  if (!address) return "—";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

// Top-level amount when present, else the sum of milestone amounts.
function escrowAmount(escrow: IndexerEscrow): number {
  if (typeof escrow.amount === "number") return escrow.amount;
  return (escrow.milestones ?? []).reduce(
    (sum, m) => sum + (typeof m.amount === "number" ? m.amount : 0),
    0
  );
}

// ISO string or Firestore timestamp → ISO string.
function toIsoDate(value: Timestamp | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000).toISOString();
  }
  return "";
}

function receiverAddress(escrow: IndexerEscrow): string {
  if (escrow.roles.receiver) return escrow.roles.receiver;
  return (escrow.milestones ?? []).find((m) => m.receiver)?.receiver ?? "";
}

// The other side of the trade, relative to the connected wallet.
function counterpartyAddress(escrow: IndexerEscrow, signer: string): string {
  const isReceiver = roleOfSigner(escrow, signer) === "receiver";
  return isReceiver ? escrow.roles.serviceProvider ?? "" : receiverAddress(escrow);
}

export function escrowToTransaction(
  escrow: IndexerEscrow,
  signer: string
): EscrowTransaction {
  return {
    id: escrow.contractId ?? escrow.engagementId,
    contractId: escrow.contractId,
    address: shortAddress(counterpartyAddress(escrow, signer)),
    memo: escrow.title,
    amount: escrowAmount(escrow),
    date: toIsoDate(escrow.createdAt),
    type: directionForSigner(escrow, signer),
    status: deriveEscrowStatus(escrow),
  };
}

// Marketplace-only fields (price, rating, opsCount, verified, windowMinutes,
// paymentMethods) are not on-chain, so they get safe placeholders. The live
// fields are status, available (balance), amount limits, and counterparty.
export function escrowToOrder(
  escrow: IndexerEscrow,
  signer: string
): EscrowOrder {
  const counterparty = counterpartyAddress(escrow, signer);
  const amount = escrowAmount(escrow);
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
    price: 0,
    currencyPair: { base: escrow.trustline.symbol, quote: escrow.trustline.symbol },
    available: escrow.balance ?? amount,
    limits: { min: 0, max: amount },
    windowMinutes: 0,
    paymentMethods: [],
  };
}
