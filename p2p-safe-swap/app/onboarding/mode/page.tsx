"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Check, ShieldCheck, Loader2 } from "lucide-react";
import { useWallet } from "@/frontend/lib/wallet-context";
import { Wordmark } from "@/frontend/components/brand/Logo";
import { cn } from "@/lib/utils";

type ModeChoice = "buy" | "sell";

export default function OnboardingModePage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [selectedMode, setSelectedMode] = useState<ModeChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMode = async (mode: ModeChoice) => {
    setSelectedMode(mode);
    setIsSubmitting(true);
    setError(null);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("safeswap.preferred_mode", mode);
      }

      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_mode: mode,
          address: publicKey,
        }),
      });

      router.push(`/p2p/orders?mode=${mode}`);
    } catch (err) {
      console.error("[onboarding/mode] Error saving mode preference:", err);
      setError("Failed to save mode preference. Proceeding anyway...");
      setTimeout(() => {
        router.push(`/p2p/orders?mode=${mode}`);
      }, 1000);
    }
  };

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      {/* Ambient background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <Wordmark className="mb-8" />

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          First-time Setup
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          How do you want to use <span className="text-grad">SafeSwap?</span>
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
          Choose your primary mode to customize your default marketplace view. You can easily switch anytime.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Mode cards */}
        <div className="mt-10 grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          {/* BUY CARD */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSelectMode("buy")}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border border-border bg-card p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background",
              selectedMode === "buy" && "border-primary ring-2 ring-primary"
            )}
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowDownLeft className="size-6" />
            </div>

            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Buyer Intent
            </div>

            <h2 className="text-xl font-bold text-foreground">Buy USDC</h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Exchange local fiat (CRC) via SINPE or bank transfer to acquire USDC delivered directly into your wallet.
            </p>

            <div className="mt-6 flex w-full items-center justify-between border-t border-border/60 pt-4">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                Select Buy Mode
              </span>
              {isSubmitting && selectedMode === "buy" ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full border border-border group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Check className="size-3" />
                </div>
              )}
            </div>
          </button>

          {/* SELL CARD */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSelectMode("sell")}
            className={cn(
              "group relative flex flex-col items-start rounded-2xl border border-border bg-card p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background",
              selectedMode === "sell" && "border-primary ring-2 ring-primary"
            )}
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowUpRight className="size-6" />
            </div>

            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
              Seller Intent
            </div>

            <h2 className="text-xl font-bold text-foreground">Sell USDC</h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Convert your USDC balance to receive local fiat (CRC) directly into your bank or SINPE account.
            </p>

            <div className="mt-6 flex w-full items-center justify-between border-t border-border/60 pt-4">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                Select Sell Mode
              </span>
              {isSubmitting && selectedMode === "sell" ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full border border-border group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Check className="size-3" />
                </div>
              )}
            </div>
          </button>
        </div>

        {publicKey && (
          <p className="mt-8 text-xs text-muted-foreground">
            Connected Wallet: <span className="font-mono text-foreground">{publicKey.slice(0, 6)}...{publicKey.slice(-4)}</span>
          </p>
        )}
      </div>
    </main>
  );
}
