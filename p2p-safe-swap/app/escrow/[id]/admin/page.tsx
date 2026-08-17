"use client";

import { use, useCallback, useState } from "react";
import { useWallet } from "@/frontend/lib/wallet-context";
import { ResolveDisputeDialog } from "@/frontend/components/chat";
import { useEscrowBalance } from "@/frontend/lib/escrow-balance";
import {
  EscrowResolveDisputeError,
  resolveEscrowDispute,
  type EscrowResolveDisputeStatus,
} from "@/frontend/lib/escrow-resolve-dispute";
import type { ResolveDisputeInput } from "@/frontend/lib/escrow-resolve-dispute";

interface EscrowAdminResolveDisputePageProps {
  params: Promise<{ id: string }>;
}

export default function EscrowAdminResolveDisputePage({
  params,
}: EscrowAdminResolveDisputePageProps) {
  const { id: contractId } = use(params);
  const { publicKey, signTransaction } = useWallet();
  const { balance: escrowBalance, isLoading: isLoadingBalance } =
    useEscrowBalance(contractId);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [resolveStatus, setResolveStatus] = useState<EscrowResolveDisputeStatus>("idle");
  const [resolveError, setResolveError] = useState<string | null>(null);

  const canResolveDispute = Boolean(publicKey);

  const handleOpenResolveDialog = useCallback(() => {
    setResolveError(null);
    setDialogOpen(true);
  }, []);

  const handleCloseResolveDialog = useCallback(() => {
    if (resolveStatus === "requesting-signature" || resolveStatus === "submitting") return;
    setDialogOpen(false);
    setResolveError(null);
  }, [resolveStatus]);

  const handleResolveDispute = useCallback(
    async (input: ResolveDisputeInput) => {
      if (!publicKey) {
        const message = "Connect your Stellar wallet before resolving a dispute";
        setResolveError(message);
        throw new EscrowResolveDisputeError(message);
      }

      // Use the fetched balance or fallback to 0 for demo
      const balance = escrowBalance || 0;

      setResolveError(null);

      try {
        await resolveEscrowDispute(input, balance, signTransaction, setResolveStatus);

        setDialogOpen(false);
      } catch (error) {
        const message =
          error instanceof EscrowResolveDisputeError
            ? error.message
            : "Unable to resolve dispute";
        setResolveError(message);
        throw error instanceof EscrowResolveDisputeError
          ? error
          : new EscrowResolveDisputeError(message);
      }
    },
    [publicKey, escrowBalance, signTransaction]
  );

  if (!publicKey) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center p-4">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Connect your Stellar wallet to resolve disputes.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col p-4">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-4 text-lg font-semibold text-foreground">Resolve Dispute</h1>

          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contract ID
              </span>
              <span className="break-all font-mono text-sm text-foreground">{contractId}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Escrow Balance
              </span>
              {isLoadingBalance ? (
                <span className="text-sm text-muted-foreground">Loading…</span>
              ) : escrowBalance !== null ? (
                <span className="font-mono text-sm font-semibold text-foreground">
                  {escrowBalance.toFixed(6)} USDC
                </span>
              ) : (
                <span className="text-sm text-destructive">Unable to load balance</span>
              )}
            </div>
          </div>

          <button
            onClick={handleOpenResolveDialog}
            disabled={!canResolveDispute || isLoadingBalance}
            className="w-full rounded-xl bg-primary px-4 py-2 font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingBalance ? "Loading…" : "Open Resolution Dialog"}
          </button>
        </div>
      </div>

      <ResolveDisputeDialog
        open={isDialogOpen}
        onClose={handleCloseResolveDialog}
        onSubmit={handleResolveDispute}
        contractId={contractId}
        disputeResolver={publicKey}
        onChainBalance={escrowBalance || 0}
        isSubmitting={resolveStatus === "requesting-signature" || resolveStatus === "submitting"}
        submitError={resolveError}
        status={resolveStatus}
      />
    </main>
  );
}
