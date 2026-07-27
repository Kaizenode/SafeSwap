"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletBadge } from "@/frontend/components/ui/wallet-badge";
import { truncateAddress } from "./utils";

export interface ChatHeaderProps {
  counterpartAddress: string;
  isOnline?: boolean;
  onBack?: () => void;
  onRaiseDispute?: () => void;
  canRaiseDispute?: boolean;
  className?: string;
}

export function ChatHeader({
  counterpartAddress,
  isOnline = true,
  onBack,
  onRaiseDispute,
  canRaiseDispute = true,
  className,
}: ChatHeaderProps) {
  const [copied, setCopied] = useState(false);
  const truncated = truncateAddress(counterpartAddress);

  const handleCopy = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(counterpartAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [counterpartAddress]);

  return (
    <header
      data-slot="chat-header"
      className={cn(
        "flex items-center gap-3 border-b border-border bg-background px-4 py-3",
        className
      )}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors",
            "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : null}

      <WalletBadge address={counterpartAddress} size="sm" />

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="truncate text-sm font-semibold text-foreground"
          title={counterpartAddress}
        >
          {truncated}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-block size-1.5 rounded-full",
              isOnline ? "bg-primary" : "bg-muted-foreground/40"
            )}
            aria-hidden="true"
          />
          {isOnline ? "Active now" : "Offline"}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Address copied" : "Copy address"}
        aria-live="polite"
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          copied && "text-primary"
        )}
      >
        {copied ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      {onRaiseDispute ? (
        <button
          type="button"
          onClick={onRaiseDispute}
          disabled={!canRaiseDispute}
          aria-label="Open dispute"
          title="Open dispute"
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-destructive transition-colors",
            "hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          )}
        >
          <AlertTriangle size={18} aria-hidden="true" />
        </button>
      ) : null}
    </header>
  );
}
