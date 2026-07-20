"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Wallet,
  Clock,
  ArrowRight,
  Info,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/frontend/components/ui/Button/Button";
import { Reveal } from "@/frontend/components/motion/reveal";

// Mock orders matching app/p2p/orders/page.tsx
const MOCK_ORDERS = [
  {
    id: "ord-diego-v",
    user: {
      name: "Diego V.",
      initials: "DV",
      verified: true,
      rating: 4.95,
      opsCount: 612,
      address: "GA71C7656EC7ab88b098defB751B7401B5f6d8976F",
    },
    price: 0.9201,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 5000,
    limits: { min: 200, max: 3000 },
    windowMinutes: 20,
    paymentMethods: ["SEPA", "Wise"],
  },
  {
    id: "ord-ana-c",
    user: {
      name: "Ana C.",
      initials: "AC",
      verified: true,
      rating: 4.85,
      opsCount: 198,
      address: "GB4F2B1c9A6E1d8c0F3a5B7d9E1f2A3b4C5d6E7f80",
    },
    price: 0.9195,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 980,
    limits: { min: 50, max: 600 },
    windowMinutes: 15,
    paymentMethods: ["Bizum"],
  },
  {
    id: "ord-carlos-l",
    user: {
      name: "Carlos L.",
      initials: "CL",
      verified: false,
      rating: 4.6,
      opsCount: 41,
      address: "GD8A1bC2dE3fF4a5B6c7D8e9F0a1B2c3D4e5F6a7B8",
    },
    price: 0.9188,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 220,
    limits: { min: 20, max: 200 },
    windowMinutes: 10,
    paymentMethods: ["Revolut"],
  },
];

export default function OrderEscrowPage() {
  const { id } = useParams();
  const router = useRouter();

  // Find or generate order
  const order = MOCK_ORDERS.find((o) => o.id === id) || {
    id: String(id),
    user: {
      name: "Custom Dealer",
      initials: "CD",
      verified: true,
      rating: 4.9,
      opsCount: 120,
      address: "GACUSTOMDEALER123456789012345678901234567890",
    },
    price: 0.92,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 2500,
    limits: { min: 100, max: 2500 },
    windowMinutes: 15,
    paymentMethods: ["SEPA"],
  };

  // State Management
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState(1250.0); // Initial balance in USDC
  const [orderStatus, setOrderStatus] = useState<"pending_funding" | "funded" | "milestones_approved" | "completed">("funded");
  const [contractId, setContractId] = useState(`CC${id?.toString().toUpperCase().replace(/[^A-Z0-9]/g, "") || "MOCK"}777SWAP`);
  const [releaseSigner, setReleaseSigner] = useState("");
  const [milestonesApproved, setMilestonesApproved] = useState(false);
  
  // Milestones list
  const [milestones, setMilestones] = useState([
    { id: 1, name: "Asset transfer verification", desc: "Verify quote asset availability", approved: false },
    { id: 2, name: "Escrow lock confirmation", desc: "Confirm smart contract locking on Stellar", approved: false },
  ]);

  // UI Flow States
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Dev & Simulation Toggles
  const [simulateWalletReject, setSimulateWalletReject] = useState(false);
  const [simulateApiError, setSimulateApiError] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[System] Initialized escrow details view."]);

  // Auto connect/set release signer when wallet connects
  useEffect(() => {
    if (walletConnected && walletAddress) {
      setReleaseSigner(walletAddress);
      addLog(`[Wallet] Connected with address: ${walletAddress}`);
    } else {
      setReleaseSigner("");
    }
  }, [walletConnected, walletAddress]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  // Connect Wallet Action
  const connectWallet = async () => {
    setLoading(true);
    setLoadingText("Connecting Freighter Wallet...");
    setErrorMsg(null);

    try {
      // Try real Freighter API first
      const { isConnected, requestAccess } = await import("@stellar/freighter-api");
      
      if (await isConnected()) {
        const addressInfo = await requestAccess();
        const address = typeof addressInfo === "string" ? addressInfo : addressInfo?.address;
        if (address) {
          setWalletConnected(true);
          setWalletAddress(address);
          addLog("[Freighter] Wallet access granted.");
          setLoading(false);
          return;
        }
      }
    } catch (e: any) {
      console.warn("Freighter not available or rejected. Falling back to simulation.", e.message);
    }

    // Simulation fallback
    setTimeout(() => {
      if (simulateWalletReject) {
        setErrorMsg("Wallet connection rejected by user.");
        addLog("[Freighter] Connection rejected.");
        setLoading(false);
      } else {
        const mockAddress = `GB${Math.random().toString(36).substring(2, 10).toUpperCase()}3XWPFQ7T`;
        setWalletConnected(true);
        setWalletAddress(mockAddress);
        addLog(`[Simulated Wallet] Connected with address: ${mockAddress}`);
        setLoading(false);
      }
    }, 1000);
  };

  // Disconnect Wallet Action
  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    addLog("[Wallet] Disconnected.");
  };

  // Milestone Approval Action
  const approveMilestones = async () => {
    if (!walletConnected) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    
    setLoading(true);
    setLoadingText("Initializing milestone approval...");
    setErrorMsg(null);
    setSuccessMsg(null);
    addLog("[API] POST /escrow/single-release/v2/approve-milestones starting...");

    try {
      if (simulateApiError) {
        throw new Error("Failed to approve milestones: Escrow contract not found or invalid approver.");
      }

      // Call API
      const res = await fetch("/escrow/single-release/v2/approve-milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          approver: walletAddress,
          milestones: [0, 1] // Approve both milestones
        }),
      });

      const data = await res.json();
      
      if (!res.ok || data.status === "FAILED") {
        throw new Error(data.message || "Failed to approve milestones.");
      }

      addLog(`[API] Milestone approval XDR generated: ${data.unsignedXdr.substring(0, 20)}...`);
      setLoadingText("Signing transaction via Freighter...");

      // Signing
      let signedXdr = "";
      if (window.hasOwnProperty("stellar") && !simulateWalletReject) {
        const { signTransaction } = await import("@stellar/freighter-api");
        const signed = await signTransaction(data.unsignedXdr, { networkPassphrase: "Test SDF Network ; September 2015" });
        signedXdr = typeof signed === "string" ? signed : signed.signedTxXdr;
        addLog("[Freighter] Transaction signed successfully.");
      } else {
        // Simulation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (simulateWalletReject) {
          throw new Error("Transaction signing rejected by user.");
        }
        signedXdr = data.unsignedXdr + "-signed";
        addLog("[Simulated Wallet] Transaction signed.");
      }

      setLoadingText("Submitting signed transaction...");
      addLog("[API] POST /stellar/send-transaction starting...");

      // Submit Transaction
      const submitRes = await fetch("/stellar/send-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXdr }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok || submitData.status === "FAILED") {
        throw new Error(submitData.message || "Submission failed.");
      }

      addLog(`[API] Transaction confirmed. Hash: ${submitData.txHash}`);
      
      // Update Milestones State
      setMilestones((prev) => prev.map((m) => ({ ...m, approved: true })));
      setMilestonesApproved(true);
      setOrderStatus("milestones_approved");
      setSuccessMsg("Milestones successfully approved on-chain!");
      addLog("[System] Milestones status updated: Approved.");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      addLog(`[Error] Milestone approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fund Release Action
  const releaseFunds = async () => {
    if (!walletConnected) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    if (!milestonesApproved) {
      setErrorMsg("Cannot release funds: milestones must be approved first.");
      addLog("[Error] Blocked: Release funds triggered before milestone approvals.");
      return;
    }

    setLoading(true);
    setLoadingText("Initializing fund release...");
    setErrorMsg(null);
    setSuccessMsg(null);
    addLog("[API] POST /escrow/single-release/v2/release-funds starting...");

    try {
      if (simulateApiError) {
        throw new Error("Failed to release funds: Not all milestones approved on-chain.");
      }

      // Call API
      const res = await fetch("/escrow/single-release/v2/release-funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          releaseSigner: walletAddress
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === "FAILED") {
        throw new Error(data.message || "Failed to release funds.");
      }

      addLog(`[API] Release funds XDR generated: ${data.unsignedXdr.substring(0, 20)}...`);
      setLoadingText("Signing transaction via Freighter...");

      // Signing
      let signedXdr = "";
      if (window.hasOwnProperty("stellar") && !simulateWalletReject) {
        const { signTransaction } = await import("@stellar/freighter-api");
        const signed = await signTransaction(data.unsignedXdr, { networkPassphrase: "Test SDF Network ; September 2015" });
        signedXdr = typeof signed === "string" ? signed : signed.signedTxXdr;
        addLog("[Freighter] Transaction signed successfully.");
      } else {
        // Simulation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (simulateWalletReject) {
          throw new Error("Transaction signing rejected by user.");
        }
        signedXdr = data.unsignedXdr + "-signed";
        addLog("[Simulated Wallet] Transaction signed.");
      }

      setLoadingText("Submitting signed transaction...");
      addLog("[API] POST /stellar/send-transaction starting...");

      // Submit Transaction
      const submitRes = await fetch("/stellar/send-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedXdr }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok || submitData.status === "FAILED") {
        throw new Error(submitData.message || "Submission failed.");
      }

      addLog(`[API] Transaction confirmed. Hash: ${submitData.txHash}`);
      
      // Update Order State to Completed
      setOrderStatus("completed");
      
      // Update Balance (USDT size gets released to buyer's balance)
      const releasedAmount = order.available;
      setWalletBalance((prev) => prev + releasedAmount);
      setSuccessMsg(`Escrow completed! ${releasedAmount} USDC released to your wallet.`);
      addLog(`[System] Escrow Completed. Balance increased by +${releasedAmount} USDC.`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      addLog(`[Error] Fund release failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (orderStatus) {
      case "pending_funding":
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">Waiting for Funding</span>;
      case "funded":
        return <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold">Escrow Locked</span>;
      case "milestones_approved":
        return <span className="bg-mint/15 text-mint border border-mint/20 px-3 py-1 rounded-full text-xs font-semibold">Milestones Approved</span>;
      case "completed":
        return <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-semibold">Completed & Released</span>;
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-4 py-6 select-none pb-20">
      
      {/* Top Header */}
      <header className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/p2p/orders")}
          type="button"
          aria-label="Back to orders"
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>

        <h1 className="text-lg font-bold text-foreground">Escrow Order Details</h1>

        <div className="size-10 flex items-center justify-center">
          <ShieldCheck className="size-5 text-primary" />
        </div>
      </header>

      {/* Global Alerts */}
      <AnimatePresence mode="popLayout">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <XCircle className="size-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Action Failed</span>
              <p className="mt-0.5 text-xs opacity-90">{errorMsg}</p>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-xs hover:underline cursor-pointer">Dismiss</button>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-500"
          >
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Success</span>
              <p className="mt-0.5 text-xs opacity-90">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-xs hover:underline cursor-pointer">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-5">
        
        {/* Wallet Connection Card */}
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                  <Wallet className="size-5 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Stellar Wallet</h2>
                  <p className="text-xs text-muted-foreground">
                    {walletConnected
                      ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 6)}`
                      : "Not connected"}
                  </p>
                </div>
              </div>
              {walletConnected ? (
                <button
                  onClick={disconnectWallet}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-destructive hover:text-white transition-all cursor-pointer"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer"
                >
                  Connect
                </button>
              )}
            </div>

            {walletConnected && (
              <div className="mt-4 border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Buyer Balance</span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
                </span>
              </div>
            )}
          </div>
        </Reveal>

        {/* Escrow Details Card */}
        <Reveal delay={0.05}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escrow Contract</span>
                <h3 className="mt-1 font-mono text-sm font-semibold text-foreground">{contractId}</h3>
              </div>
              {getStatusBadge()}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-y-4 gap-x-2 border-t border-border pt-4 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Counterparty (Seller)</span>
                <p className="mt-0.5 font-semibold text-foreground truncate">{order.user.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Order Amount</span>
                <p className="mt-0.5 font-bold text-foreground">{order.available} USDC</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Price Rate</span>
                <p className="mt-0.5 font-semibold text-foreground">{order.price} EUR/USDC</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Window Limit</span>
                <p className="mt-0.5 flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="size-3 text-muted-foreground" />
                  {order.windowMinutes} min
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Milestones Tracker */}
        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold text-foreground mb-4">Contract Milestones</h4>
            <div className="flex flex-col gap-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
                  <div className="mt-0.5 shrink-0">
                    {m.approved ? (
                      <CheckCircle2 className="size-5 text-mint" />
                    ) : (
                      <div className="size-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                        <span className="size-2 rounded-full bg-transparent" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">{m.name}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                  <div className="ml-auto text-xs font-semibold">
                    {m.approved ? (
                      <span className="text-mint">Approved</span>
                    ) : (
                      <span className="text-amber-500">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Milestones Action */}
            <div className="mt-5">
              <Button
                variant={milestonesApproved ? "ghost" : "primary"}
                label={milestonesApproved ? "Milestones Approved ✓" : "Approve Milestones"}
                disabled={loading || milestonesApproved || !walletConnected}
                onClick={approveMilestones}
              />
              {!walletConnected && (
                <p className="text-[10px] text-amber-500 text-center mt-2 flex items-center justify-center gap-1">
                  <Info className="size-3" /> Connect wallet to approve milestones
                </p>
              )}
            </div>
          </div>
        </Reveal>

        {/* Fund Release Card */}
        <Reveal delay={0.15}>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4">
            <div>
              <h4 className="text-sm font-bold text-foreground">Release Escrow Funds</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Release the locked USDC to the buyer. This will execute the smart contract call on the Stellar blockchain.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                label={orderStatus === "completed" ? "Released Successfully ✓" : "Release Funds to Buyer"}
                disabled={loading || orderStatus === "completed" || !milestonesApproved || !walletConnected}
                onClick={releaseFunds}
              />
              
              {/* Conditional Hint Message */}
              {!milestonesApproved && walletConnected && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500">
                  <Info className="size-4 shrink-0" />
                  <p>Fund release is locked until all milestones are approved.</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* Console Log Terminal */}
        <Reveal delay={0.2}>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <RefreshCw className="size-3 text-primary animate-spin-slow" />
                Live API Logs
              </span>
              <button onClick={() => setLogs([])} className="text-[10px] text-muted-foreground hover:underline cursor-pointer">Clear</button>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-black/10 dark:bg-black/30 p-2 font-mono text-[10px] text-muted-foreground leading-relaxed flex flex-col gap-1">
              {logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">{log}</div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Dev Sandbox & Test Suite Simulator */}
        <Reveal delay={0.25}>
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
            <h5 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider mb-3">
              <TrendingUp className="size-3.5" />
              Dev Sandbox / Test Suite
            </h5>
            
            <p className="text-xs text-muted-foreground mb-4">
              Toggle the settings below to simulate errors or custom wallet states, ensuring both success and failure cases are testable in any environment.
            </p>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={simulateWalletReject}
                  onChange={(e) => {
                    setSimulateWalletReject(e.target.checked);
                    addLog(`[Sandbox] Simulating Wallet rejection: ${e.target.checked}`);
                  }}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                Simulate User Rejecting Wallet Sign
              </label>

              <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={simulateApiError}
                  onChange={(e) => {
                    setSimulateApiError(e.target.checked);
                    addLog(`[Sandbox] Simulating API / Escrow failure: ${e.target.checked}`);
                  }}
                  className="rounded border-border text-primary focus:ring-primary size-4"
                />
                Simulate Escrow Milestone/API Failure
              </label>

              <div className="mt-2 pt-2 border-t border-primary/10 flex gap-2">
                <button
                  onClick={() => {
                    setMilestonesApproved(false);
                    setMilestones(m => m.map(item => ({ ...item, approved: false })));
                    setOrderStatus("funded");
                    addLog("[Sandbox] Reset milestones and escrow status.");
                  }}
                  className="flex-1 rounded-lg bg-card hover:bg-muted border border-border px-3 py-1.5 text-[10px] font-semibold text-foreground transition-all cursor-pointer"
                >
                  Reset Milestones
                </button>
                <button
                  onClick={() => {
                    setWalletBalance(1250.0);
                    addLog("[Sandbox] Reset wallet balance.");
                  }}
                  className="flex-1 rounded-lg bg-card hover:bg-muted border border-border px-3 py-1.5 text-[10px] font-semibold text-foreground transition-all cursor-pointer"
                >
                  Reset Balance
                </button>
              </div>
            </div>
          </div>
        </Reveal>

      </div>

      {/* Global Loading Spinner Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-3 text-sm font-semibold text-foreground">{loadingText}</p>
        </div>
      )}
    </div>
  );
}
