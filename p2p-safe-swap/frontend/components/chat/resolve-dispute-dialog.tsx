"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/Button/Button";
import {
  EscrowResolveDisputeError,
  type ResolveDisputeInput,
  type EscrowResolveDisputeStatus,
} from "@/frontend/lib/escrow-resolve-dispute";
import type { DistributionEntry } from "@/frontend/lib/escrow-balance";

export interface ResolveDisputeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ResolveDisputeInput) => Promise<void>;
  contractId: string;
  disputeResolver: string;
  onChainBalance: number;
  isSubmitting?: boolean;
  submitError?: string | null;
  status?: EscrowResolveDisputeStatus;
  className?: string;
}

export function ResolveDisputeDialog({
  open,
  onClose,
  onSubmit,
  contractId,
  disputeResolver,
  onChainBalance,
  isSubmitting = false,
  submitError,
  status = "idle",
  className,
}: ResolveDisputeDialogProps) {
  const [distributions, setDistributions] = useState<DistributionEntry[]>([
    { address: "", amount: 0 },
  ]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      setDistributions([{ address: "", amount: 0 }]);
      setValidationError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  const distributedTotal = useMemo(
    () => distributions.reduce((sum, entry) => sum + entry.amount, 0),
    [distributions]
  );

  const difference = useMemo(
    () => distributedTotal - onChainBalance,
    [distributedTotal, onChainBalance]
  );

  const isDistributionValid =
    Math.abs(difference) < 1e-6 &&
    distributions.every((d) => d.address.trim().length > 0 && d.amount > 0);

  const canSubmit = isDistributionValid && !isSubmitting;
  const displayedError = validationError ?? submitError ?? null;

  if (!open) return null;

  function updateDistribution(index: number, field: "address" | "amount", value: unknown) {
    const updated = [...distributions];
    if (field === "address") {
      updated[index].address = String(value);
    } else {
      updated[index].amount = Number(value);
    }
    setDistributions(updated);
    if (validationError) setValidationError(null);
  }

  function addDistribution() {
    setDistributions([...distributions, { address: "", amount: 0 }]);
  }

  function removeDistribution(index: number) {
    if (distributions.length > 1) {
      setDistributions(distributions.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit() {
    if (isSubmitting || !canSubmit) return;

    // Validate all fields
    for (const entry of distributions) {
      if (!entry.address.trim()) {
        setValidationError("All distribution entries must have a valid address");
        return;
      }
      if (entry.amount <= 0) {
        setValidationError("All distribution amounts must be positive");
        return;
      }
    }

    if (Math.abs(difference) >= 1e-6) {
      setValidationError(
        `Distributions total ${distributedTotal.toFixed(6)} does not match escrow balance ${onChainBalance.toFixed(6)}`
      );
      return;
    }

    setValidationError(null);

    try {
      await onSubmit({
        contractId,
        disputeResolver,
        distributions,
      });
    } catch (error) {
      if (error instanceof EscrowResolveDisputeError) {
        setValidationError(error.message);
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-6 backdrop-blur-sm sm:items-center",
        className
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <AlertTriangle size={18} />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-base font-semibold text-foreground">
                Resolve dispute
              </h2>
              <p id={descriptionId} className="text-xs text-muted-foreground">
                Distribute the escrowed funds between the parties.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Escrow Balance
            </span>
            <span className="font-mono text-sm font-semibold text-foreground">
              {onChainBalance.toFixed(6)} USDC
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Distributions Total
            </span>
            <span
              className={cn(
                "font-mono text-sm font-semibold",
                isDistributionValid
                  ? "text-foreground"
                  : "text-destructive"
              )}
            >
              {distributedTotal.toFixed(6)} USDC
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Fund Distributions
          </label>

          <div className="flex flex-col gap-2">
            {distributions.map((entry, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Recipient address (G...)"
                  value={entry.address}
                  onChange={(e) => updateDistribution(idx, "address", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="Amount (USDC)"
                    value={entry.amount || ""}
                    onChange={(e) => updateDistribution(idx, "amount", e.target.value)}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl border border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {distributions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDistribution(idx)}
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addDistribution}
            disabled={isSubmitting}
            className="px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Add Distribution
          </button>
        </div>

        {displayedError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>{displayedError}</p>
          </div>
        )}

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            size="md"
            label="Cancel"
            onClick={onClose}
            disabled={isSubmitting}
            className="sm:min-w-28"
          />
          <Button
            variant="primary"
            size="md"
            label={
              status === "requesting-signature"
                ? "Signing…"
                : status === "submitting"
                  ? "Submitting…"
                  : "Resolve dispute"
            }
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            className="sm:min-w-32"
          />
        </footer>
      </div>
    </div>
  );
}
