"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button/Button";
import { WalletBadge } from "@/frontend/components/ui/wallet-badge";
import { Reveal } from "@/frontend/components/motion/reveal";
import {
  EscrowStepper,
  type EscrowStep,
} from "@/frontend/components/trade/escrow-stepper";
import { EscrowLiveBalance } from "@/frontend/components/escrow/EscrowLiveBalance";
import {
  EscrowReleaseError,
  releaseEscrowFunds,
  type EscrowReleaseStatus,
} from "@/frontend/lib/escrow-release";
import {
  EscrowFundingError,
  fundDeployedEscrow,
  type EscrowFundingStatus,
} from "@/frontend/lib/escrow-funding";
import {
  approveEscrowMilestone,
  EscrowApproveMilestoneError,
  type EscrowApproveMilestoneStatus,
} from "@/frontend/lib/escrow-approve-milestone";
import { useWallet } from "@/frontend/lib/wallet-context";

interface TradeStatusPageProps {
  params: Promise<{ id: string }>;
}

const TRADE_AMOUNT = 240;
const TRADE_CURRENCY = "USDC";
const MILESTONE_INDEXES = [0];

function initialSteps(): EscrowStep[] {
  return [
    {
      key: "initiated",
      label: "Initiated",
      description: "Escrow contract created on Stellar",
      status: "completed",
    },
    {
      key: "funded",
      label: "Funded",
      description: "USDC locked in the contract",
      status: "current",
    },
    {
      key: "approved",
      label: "Milestone approved",
      description: "Seller confirms fiat received",
      status: "pending",
    },
    {
      key: "released",
      label: "Released",
      description: "Funds released to buyer",
      status: "pending",
    },
  ];
}

function shortAddress(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function contractIdStorageKey(tradeId: string) {
  return `safeswap.trade.contractId.${tradeId}`;
}

export default function TradeStatusPage({ params }: TradeStatusPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { publicKey, signTransaction } = useWallet();

  const [contractId, setContractId] = React.useState<string>("");
  const [contractIdInput, setContractIdInput] = React.useState<string>("");
  const [steps, setSteps] = React.useState<EscrowStep[]>(initialSteps);

  const [fundStatus, setFundStatus] = React.useState<EscrowFundingStatus>("idle");
  const [approveStatus, setApproveStatus] =
    React.useState<EscrowApproveMilestoneStatus>("idle");
  const [releaseStatus, setReleaseStatus] =
    React.useState<EscrowReleaseStatus>("idle");

  const [actionError, setActionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(contractIdStorageKey(id));
    if (stored) {
      setContractId(stored);
      setContractIdInput(stored);
    }
  }, [id]);

  const persistContractId = React.useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setContractId(trimmed);
      if (trimmed) {
        window.localStorage.setItem(contractIdStorageKey(id), trimmed);
      } else {
        window.localStorage.removeItem(contractIdStorageKey(id));
      }
    },
    [id]
  );

  const currentStepKey = steps.find((s) => s.status === "current")?.key;
  const isFunded = currentStepKey === "approved" || currentStepKey === "released" ||
    steps.find((s) => s.key === "funded")?.status === "completed";
  const isApproved =
    steps.find((s) => s.key === "approved")?.status === "completed";
  const isReleased =
    steps.find((s) => s.key === "released")?.status === "completed";

  const isSubmittingFund =
    fundStatus === "requesting-signature" || fundStatus === "submitting";
  const isSubmittingApprove =
    approveStatus === "requesting-signature" || approveStatus === "submitting";
  const isSubmittingRelease =
    releaseStatus === "requesting-signature" || releaseStatus === "submitting";

  const anySubmitting = isSubmittingFund || isSubmittingApprove || isSubmittingRelease;

  const walletConnected = Boolean(publicKey);
  const contractReady = Boolean(contractId);

  const advanceStep = React.useCallback(
    (fromKey: string, toKey: string, toDescription?: string) => {
      setSteps((prev) =>
        prev.map((step) => {
          if (step.key === fromKey) {
            return { ...step, status: "completed" };
          }
          if (step.key === toKey) {
            return {
              ...step,
              status: "current",
              ...(toDescription ? { description: toDescription } : {}),
              timestamp: new Date().toISOString(),
            };
          }
          return step;
        })
      );
    },
    []
  );

  const completeStep = React.useCallback((key: string, description?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.key === key
          ? {
              ...step,
              status: "completed",
              ...(description ? { description } : {}),
              timestamp: new Date().toISOString(),
            }
          : step
      )
    );
  }, []);

  const handleSaveContractId = () => {
    setActionError(null);
    persistContractId(contractIdInput);
  };

  const handleFund = React.useCallback(async () => {
    if (!publicKey || !contractId) return;
    setActionError(null);
    try {
      await fundDeployedEscrow(
        { contractId, signer: publicKey, amount: TRADE_AMOUNT },
        signTransaction,
        setFundStatus
      );
      completeStep("funded");
      advanceStep("funded", "approved");
    } catch (error) {
      const message =
        error instanceof EscrowFundingError
          ? error.message
          : "Unable to fund escrow";
      setActionError(message);
    }
  }, [publicKey, contractId, signTransaction, advanceStep, completeStep]);

  const handleApprove = React.useCallback(async () => {
    if (!publicKey || !contractId) return;
    setActionError(null);
    try {
      await approveEscrowMilestone(
        {
          contractId,
          approver: publicKey,
          milestoneIndexes: MILESTONE_INDEXES,
        },
        signTransaction,
        setApproveStatus
      );
      completeStep("approved", "Milestone approved by seller");
      advanceStep("approved", "released");
    } catch (error) {
      const message =
        error instanceof EscrowApproveMilestoneError
          ? error.message
          : "Unable to approve milestone";
      setActionError(message);
    }
  }, [publicKey, contractId, signTransaction, advanceStep, completeStep]);

  const handleRelease = React.useCallback(async () => {
    if (!publicKey || !contractId) return;
    setActionError(null);
    try {
      await releaseEscrowFunds(
        { contractId, releaseSigner: publicKey },
        signTransaction,
        setReleaseStatus
      );
      completeStep("released", "Funds released to buyer");
    } catch (error) {
      const message =
        error instanceof EscrowReleaseError ? error.message : "Unable to release funds";
      setActionError(message);
    }
  }, [publicKey, contractId, signTransaction, completeStep]);

  const handleDispute = () => {
    router.push(`/chat/${id}`);
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-5" />
        </button>

        <h1 className="text-lg font-semibold text-foreground">Trade status</h1>

        <button
          type="button"
          aria-label="Open chat with counterparty"
          onClick={() => router.push(`/chat/${id}`)}
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MessageCircle className="size-5" />
        </button>
      </header>

      <Reveal className="flex flex-col gap-6">
        <section
          aria-label="Trade summary"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            {publicKey ? <WalletBadge address={publicKey} /> : null}
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-semibold text-foreground">
                {publicKey ? "You" : "Wallet not connected"}
              </span>
              <span className="text-xs text-muted-foreground">
                {publicKey ? shortAddress(publicKey) : "Connect Freighter to continue"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-bold tabular-nums text-foreground leading-none">
                {TRADE_AMOUNT.toLocaleString("en-US")}
              </span>
              <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {TRADE_CURRENCY}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="text-xs font-medium text-muted-foreground">Contract</span>
            <code
              className="ml-auto font-mono text-xs text-foreground"
              title={contractId || "Not set"}
            >
              {contractId ? shortAddress(contractId) : "—"}
            </code>
            {contractId ? (
              <button
                type="button"
                onClick={() => {
                  persistContractId("");
                  setContractIdInput("");
                  setSteps(initialSteps());
                  setActionError(null);
                }}
                className="text-[0.65rem] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Change
              </button>
            ) : null}
          </div>
        </section>

        {!contractReady ? (
          <section
            aria-label="Escrow contract"
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5"
          >
            <label
              htmlFor="contract-id"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Escrow contract ID
            </label>
            <p className="text-xs text-muted-foreground">
              Paste the contractId returned when the escrow was deployed
              (from /p2p/orders).
            </p>
            <input
              id="contract-id"
              type="text"
              value={contractIdInput}
              onChange={(e) => setContractIdInput(e.target.value)}
              placeholder="C…"
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              variant="primary"
              size="md"
              label="Save contract"
              onClick={handleSaveContractId}
              disabled={!contractIdInput.trim()}
              className="self-end"
            />
          </section>
        ) : null}

        {isFunded && contractId ? (
          <EscrowLiveBalance contractId={contractId} currency={TRADE_CURRENCY} />
        ) : null}

        <section
          aria-labelledby="escrow-stepper-heading"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2
            id="escrow-stepper-heading"
            className="mb-4 text-sm font-semibold text-foreground"
          >
            Escrow progress
          </h2>
          <EscrowStepper steps={steps} />
        </section>

        <div className="flex flex-col gap-3">
          {!walletConnected ? (
            <p role="note" className="text-xs text-muted-foreground">
              Connect your Stellar wallet to interact with the escrow.
            </p>
          ) : null}
          {actionError ? (
            <p role="alert" className="text-xs text-destructive">
              {actionError}
            </p>
          ) : null}

          {!isFunded ? (
            <Button
              variant="primary"
              size="lg"
              label={isSubmittingFund ? "Funding…" : "Fund escrow"}
              onClick={handleFund}
              aria-label="Fund escrow"
              disabled={!walletConnected || !contractReady || anySubmitting}
              className="w-full"
            />
          ) : null}

          {isFunded && !isApproved ? (
            <Button
              variant="primary"
              size="lg"
              label={isSubmittingApprove ? "Approving…" : "Approve milestone"}
              onClick={handleApprove}
              aria-label="Approve milestone"
              disabled={!walletConnected || !contractReady || anySubmitting}
              className="w-full"
            />
          ) : null}

          {isApproved && !isReleased ? (
            <Button
              variant="primary"
              size="lg"
              label={isSubmittingRelease ? "Releasing…" : "Release funds"}
              onClick={handleRelease}
              aria-label="Release funds"
              disabled={!walletConnected || !contractReady || anySubmitting}
              className="w-full"
            />
          ) : null}

          {isReleased ? (
            <p
              role="status"
              className="rounded-xl bg-primary/10 px-4 py-3 text-center text-sm font-semibold text-primary"
            >
              Trade completed — funds released
            </p>
          ) : null}

          <Button
            variant="danger"
            size="lg"
            label="Open dispute"
            onClick={handleDispute}
            aria-label="Open dispute"
            disabled={!contractReady || isReleased}
            className="w-full"
          />
        </div>
      </Reveal>
    </div>
  );
}
