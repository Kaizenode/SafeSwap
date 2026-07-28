"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button/Button";
import type { Escrow, EscrowDistribution, EscrowStatus } from "./types";
import {
  EscrowDisputeResolutionError,
  resolveEscrowDispute,
  type EscrowDisputeResolutionStatus,
  type SignEscrowTransaction,
} from "@/frontend/lib/escrow-dispute-resolution";

function createDefaultSignTransaction(): SignEscrowTransaction {
  return async () => {
    throw new Error("Wallet signing is not yet integrated. Please connect a Stellar wallet.");
  };
}

export interface ResolveDisputePanelProps {
  escrow: Escrow;
  isModerator: boolean;
  currentWalletAddress?: string;
  signTransaction?: SignEscrowTransaction;
  onResolved?: (escrow: Escrow) => void;
}

export function ResolveDisputePanel({
  escrow,
  isModerator,
  currentWalletAddress,
  signTransaction,
  onResolved,
}: ResolveDisputePanelProps) {
  const [distributions, setDistributions] = useState<EscrowDistribution[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [status, setStatus] = useState<EscrowDisputeResolutionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const totalDistribution = useMemo(
    () => distributions.reduce((sum, distribution) => sum + distribution.amount, 0),
    [distributions]
  );

  const canSubmit =
    isResolver &&
    distributions.length > 0 &&
    status !== "requesting-signature" &&
    status !== "submitting";
  const isResolver =
    isModerator ||
    (Boolean(currentWalletAddress?.trim()) &&
      Boolean(escrow.roles.disputeResolver?.trim()) &&
      currentWalletAddress?.trim() === escrow.roles.disputeResolver.trim());

  function addDistribution() {
    const trimmedAddress = newAddress.trim();
    const parsedAmount = Number(newAmount);

    if (!trimmedAddress || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Add a recipient address and a positive amount before adding a distribution");
      return;
    }

    setDistributions((prev) => [...prev, { address: trimmedAddress, amount: parsedAmount }]);
    setNewAddress("");
    setNewAmount("");
    setError(null);
  }

  function removeDistribution(index: number) {
    setDistributions((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleResolve() {
    if (!isResolver) {
      setError("Only the dispute resolver wallet can resolve this escrow");
      return;
    }

    setError(null);

    try {
      await resolveEscrowDispute(
        {
          contractId: escrow.contractId,
          disputeResolver: escrow.roles.disputeResolver,
          distributions,
        },
        signTransaction ?? createDefaultSignTransaction(),
        setStatus
      );

      onResolved?.({
        ...escrow,
        status: "resolved" as EscrowStatus,
        resolutionDistributions: distributions,
      });
    } catch (submissionError) {
      const message =
        submissionError instanceof EscrowDisputeResolutionError
          ? submissionError.message
          : "Unable to resolve the dispute";
      setError(message);
      setStatus("failed");
    }
  }

  if (!isResolver) {
    return null;
  }

  return (
    <section
      aria-label="Resolve dispute"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">Resolve dispute</h2>
          <p className="text-sm text-muted-foreground">
            Distribute the escrow balance to the resolved recipients and submit the moderator transaction.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/60 p-3">
        <label htmlFor="distribution-address" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recipient address
        </label>
        <input
          id="distribution-address"
          type="text"
          value={newAddress}
          onChange={(event) => setNewAddress(event.target.value)}
          placeholder="Stellar address"
          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <label htmlFor="distribution-amount" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Amount
        </label>
        <input
          id="distribution-amount"
          type="number"
          inputMode="decimal"
          step="any"
          value={newAmount}
          onChange={(event) => setNewAmount(event.target.value)}
          placeholder="0.00"
          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <button
          type="button"
          onClick={addDistribution}
          className="flex items-center justify-center gap-2 rounded-xl border border-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-black"
        >
          <Plus size={16} aria-hidden="true" />
          Add distribution
        </button>
      </div>

      {distributions.length > 0 && (
        <div className="flex flex-col gap-2">
          {distributions.map((distribution, index) => (
            <div key={`${distribution.address}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{distribution.address}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{distribution.amount}</span>
              </div>
              <button
                type="button"
                onClick={() => removeDistribution(index)}
                aria-label={`Remove distribution ${index + 1}`}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total distribution</span>
        <span className="font-semibold text-foreground tabular-nums">{totalDistribution.toFixed(2)}</span>
      </div>

      {escrow.status === "resolved" && escrow.resolutionDistributions?.length ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          <span className="font-medium">Resolved distribution</span>
          {escrow.resolutionDistributions.map((distribution, index) => (
            <div key={`${distribution.address}-${index}`} className="flex items-center justify-between gap-2">
              <span className="truncate">{distribution.address}</span>
              <span className="font-semibold tabular-nums">{distribution.amount}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        label={status === "submitting" ? "Submitting…" : "Resolve dispute"}
        onClick={handleResolve}
        disabled={!canSubmit}
        className="w-full"
      />
    </section>
  );
}
