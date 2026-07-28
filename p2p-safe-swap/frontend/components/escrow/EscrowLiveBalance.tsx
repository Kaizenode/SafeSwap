"use client";

import { AlertCircle, RefreshCw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscrowBalance } from "@/frontend/lib/escrow-balance";

export interface EscrowLiveBalanceProps {
  contractId: string;
  currency?: string;
  label?: string;
  className?: string;
}

function formatBalance(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
}

export function EscrowLiveBalance({
  contractId,
  currency,
  label = "Escrow balance (live)",
  className,
}: EscrowLiveBalanceProps) {
  const { balance, isLoading, error, refetch } = useEscrowBalance(contractId);

  return (
    <section
      aria-label={label}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border bg-card p-4",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Wallet size={18} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>

        {isLoading && balance === null && !error ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : error ? (
          <span className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle size={14} aria-hidden="true" />
            <span>{error}</span>
          </span>
        ) : balance === null ? (
          <span className="text-sm text-muted-foreground">Unavailable</span>
        ) : (
          <span
            aria-live="polite"
            className="text-lg font-semibold text-foreground tabular-nums"
          >
            {formatBalance(balance)}
            {currency ? (
              <span className="ml-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {currency}
              </span>
            ) : null}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          void refetch();
        }}
        disabled={isLoading}
        aria-label="Refresh escrow balance"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground",
          "transition-colors hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <RefreshCw
          size={14}
          aria-hidden="true"
          className={cn(isLoading && "animate-spin")}
        />
      </button>
    </section>
  );
}
