"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/Button/Button";
import { WalletBadge } from "@/frontend/components/ui/wallet-badge";

export interface WalletSummaryProps extends React.ComponentProps<"section"> {
  address: string;
  balance: number;
  onSend?: () => void;
  onReceive?: () => void;
  onDeposit?: () => void;
}

function truncateAddress(address: string, head = 4, tail = 4): string {
  if (address.length <= head + tail + 1) {
    return address;
  }

  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

function formatBalance(balance: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}

export function WalletSummary({
  address,
  balance,
  onSend,
  onReceive,
  onDeposit,
  className,
  ...props
}: WalletSummaryProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopy = React.useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [address]);

  const actions = [
    { key: "send", label: "Send", icon: ArrowUpRight, onClick: onSend },
    { key: "receive", label: "Receive", icon: ArrowDownLeft, onClick: onReceive },
    { key: "deposit", label: "Deposit", icon: Plus, onClick: onDeposit },
  ] as const;

  return (
    <section
      data-slot="wallet-summary"
      className={cn(
        "flex w-full flex-col gap-6 rounded-2xl border border-border bg-card p-5",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <WalletBadge address={address} size="md" />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            My Stellar address
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {truncateAddress(address)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy address"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <Check className="size-4 text-primary" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? "Address copied to clipboard" : ""}
      </p>

      <div>
        <p className="text-sm text-muted-foreground">Available balance</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-foreground">
            {formatBalance(balance)}
          </span>
          <span className="text-sm font-semibold text-muted-foreground">
            USDC
          </span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map(({ key, label, icon: Icon, onClick }) => (
          <div key={key} className="flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground"
            >
              <Icon className="size-5" />
            </span>
            {/*
              `ghost` ships zinc `dark:` utilities, and this app switches themes
              with a `.dark` class (next-themes) rather than the OS preference,
              so those utilities never apply. Override with semantic tokens so
              contrast holds in both themes without touching Button.
            */}
            <Button
              variant="ghost"
              size="sm"
              label={label}
              onClick={onClick}
              className="w-full border-border text-foreground hover:bg-muted hover:text-foreground"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
