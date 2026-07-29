"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { P2POrderList } from "@/frontend/components/p2p";
import { ChatScreen } from "@/frontend/components/chat/chat-screen";
import { RaiseDisputeDialog } from "@/frontend/components/chat";
import type { OrderMode, P2POrder } from "@/frontend/components/p2p";
import type { ChatMessage } from "@/frontend/components/chat/types";
import {
  deployEscrow,
  type EscrowDeploymentStatus,
} from "@/frontend/lib/escrow-deployment";
import {
  EscrowDisputeError,
  raiseEscrowDispute,
  type EscrowDisputeStatus,
} from "@/frontend/lib/escrow-dispute";
import { useWallet } from "@/frontend/lib/wallet-context";

const USDC_TRUSTLINE = {
  address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  symbol: "USDC",
};

const PLATFORM_FEE = 1;

const MOCK_ORDERS: P2POrder[] = [
  {
    id: "ord-diego-v",
    user: {
      name: "Diego V.",
      initials: "DV",
      verified: true,
      rating: 4.95,
      opsCount: 612,
      address: "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ",
    },
    price: 0.9201,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 5000,
    limits: { min: 200, max: 3000 },
    windowMinutes: 20,
    paymentMethods: ["SEPA", "Wise"],
    escrowAmount: 500,
    trustline: USDC_TRUSTLINE,
  },
  {
    id: "ord-ana-c",
    user: {
      name: "Ana C.",
      initials: "AC",
      verified: true,
      rating: 4.85,
      opsCount: 198,
      address: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    },
    price: 0.9195,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 980,
    limits: { min: 50, max: 600 },
    windowMinutes: 15,
    paymentMethods: ["Bizum"],
    escrowAmount: 200,
    trustline: USDC_TRUSTLINE,
  },
  {
    id: "ord-carlos-l",
    user: {
      name: "Carlos L.",
      initials: "CL",
      verified: false,
      rating: 4.6,
      opsCount: 41,
      address: "GBVVJJFLRPJMXOEKXPJDGA7CXHEFCRYMXZFYWJFX7EGBF6ENCF3KSPA",
    },
    price: 0.9188,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 220,
    limits: { min: 20, max: 200 },
    windowMinutes: 10,
    paymentMethods: ["Revolut"],
    escrowAmount: 100,
    trustline: USDC_TRUSTLINE,
  },
];

const BEST_PRICE = 0.9201;

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    type: "text",
    text: "Hi, I want to buy 1000 EUR",
    author: "counterpart",
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: "msg-2",
    type: "request",
    amount: 1000,
    currency: "EUR",
    memo: "Payment for crypto swap",
    status: "pending",
    author: "self",
    timestamp: new Date(Date.now() - 1800000),
  },
  {
    id: "msg-3",
    type: "payment",
    amount: 912,
    currency: "USDT",
    memo: "Your crypto",
    status: "pending",
    author: "counterpart",
    timestamp: new Date(),
  },
];

export default function OrdersPage() {
  const router = useRouter();
  const { publicKey, signTransaction } = useWallet();
  const [mode, setMode] = useState<OrderMode>("buy");
  const [orders, setOrders] = useState<P2POrder[]>(MOCK_ORDERS);
  const [deployStatus, setDeployStatus] = useState<
    Record<string, EscrowDeploymentStatus>
  >({});
  const [deployError, setDeployError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [disputedOrders, setDisputedOrders] = useState<Record<string, boolean>>({});
  const [disputeDialogOrderId, setDisputeDialogOrderId] = useState<string | null>(null);
  const [disputeStatus, setDisputeStatus] = useState<EscrowDisputeStatus>("idle");
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const handleAcceptOrder = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      if (!order.escrowAmount || !order.trustline) {
        console.error("[escrow-deployment] Order is missing escrowAmount or trustline", order);
        return;
      }

      if (!publicKey) {
        setDeployError("Connect your Stellar wallet before accepting an order");
        return;
      }

      const sellerAddress = publicKey;
      const buyerAddress = publicKey;

      setDeployError(null);
      setDeployStatus((prev) => ({ ...prev, [orderId]: "deploying" }));

      try {
        const { contractId } = await deployEscrow(
          {
            signer: sellerAddress,
            orderId: order.id,
            buyerAddress,
            sellerAddress,
            amount: order.escrowAmount,
            platformFee: PLATFORM_FEE,
            trustline: order.trustline,
          },
          signTransaction,
          (status) => setDeployStatus((prev) => ({ ...prev, [orderId]: status }))
        );

        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, escrowContractId: contractId } : o))
        );

        window.localStorage.setItem(
          `safeswap.trade.contractId.${orderId}`,
          contractId
        );
      } catch (error) {
        setDeployStatus((prev) => ({ ...prev, [orderId]: "failed" }));
        const message = error instanceof Error ? error.message : "Failed to deploy escrow";
        setDeployError(message);
        console.error(`[escrow-deployment] Failed to deploy escrow for order ${orderId}:`, error);
      }
    },
    [orders, publicKey, signTransaction]
  );

  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId)
    : null;

  const handleOpenDispute = useCallback((orderId: string) => {
    setDisputeError(null);
    setDisputeStatus("idle");
    setDisputeDialogOrderId(orderId);
  }, []);

  const handleCloseDispute = useCallback(() => {
    if (disputeStatus === "requesting-signature" || disputeStatus === "submitting") return;
    setDisputeDialogOrderId(null);
    setDisputeError(null);
  }, [disputeStatus]);

  const handleSubmitDispute = useCallback(
    async (reason: string) => {
      const order = disputeDialogOrderId
        ? orders.find((o) => o.id === disputeDialogOrderId)
        : null;

      if (!order?.escrowContractId) {
        setDisputeError("The escrow contract has not been deployed yet");
        throw new EscrowDisputeError("The escrow contract has not been deployed yet");
      }

      if (!publicKey) {
        setDisputeError("Connect your Stellar wallet before opening a dispute");
        throw new EscrowDisputeError("Connect your Stellar wallet before opening a dispute");
      }

      setDisputeError(null);

      try {
        await raiseEscrowDispute(
          {
            contractId: order.escrowContractId,
            signer: publicKey,
            reason,
          },
          signTransaction,
          setDisputeStatus
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `msg-dispute-${Date.now()}`,
            type: "text",
            text: `[Dispute opened] ${reason.trim()}`,
            author: "self",
            timestamp: new Date(),
          },
        ]);
        setDisputedOrders((prev) => ({ ...prev, [order.id]: true }));
        setDisputeDialogOrderId(null);
      } catch (error) {
        const message =
          error instanceof EscrowDisputeError
            ? error.message
            : "Unable to open dispute";
        setDisputeError(message);
        throw error instanceof EscrowDisputeError ? error : new EscrowDisputeError(message);
      }
    },
    [disputeDialogOrderId, orders, publicKey, signTransaction]
  );

  const isSubmittingDispute =
    disputeStatus === "requesting-signature" || disputeStatus === "submitting";

  if (selectedOrder) {
    const isSelectedDisputed = Boolean(disputedOrders[selectedOrder.id]);
    const canRaiseDispute =
      Boolean(selectedOrder.escrowContractId) && Boolean(publicKey);

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <ChatScreen
          counterpartAddress={selectedOrder.user.address}
          messages={messages}
          onSendMessage={(text) => {
            const newMessage: ChatMessage = {
              id: `msg-${Date.now()}`,
              type: "text",
              text,
              author: "self",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, newMessage]);
          }}
          onSendPayment={() => {
            console.log("Send payment");
          }}
          onAcceptPaymentRequest={(messageId) => {
            console.log("✅ Step 1: Pagar button clicked for message:", messageId);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId && msg.type === "request"
                  ? { ...msg, status: "completed" as const }
                  : msg
              )
            );
          }}
          onRejectPaymentRequest={(messageId) => {
            console.log("Reject payment request:", messageId);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId && msg.type === "request"
                  ? { ...msg, status: "rejected" as const }
                  : msg
              )
            );
          }}
          onViewReceipt={(messageId) => {
            console.log("View receipt:", messageId);
          }}
          onRaiseDispute={() => handleOpenDispute(selectedOrder.id)}
          canRaiseDispute={canRaiseDispute}
          isDisputed={isSelectedDisputed}
          onBack={() => {
            setSelectedOrderId(null);
          }}
          lang="en"
        />

        <RaiseDisputeDialog
          open={disputeDialogOrderId === selectedOrder.id}
          onClose={handleCloseDispute}
          onSubmit={handleSubmitDispute}
          isSubmitting={isSubmittingDispute}
          submitError={disputeError}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {Object.entries(deployStatus).some(([, status]) => status !== "idle") && (
        <div className="bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
          {Object.entries(deployStatus).map(([id, status]) => (
            <span key={id} className="mr-4">
              {id}: <strong>{status}</strong>
            </span>
          ))}
        </div>
      )}
      {deployError ? (
        <p
          role="alert"
          className="bg-destructive/10 px-4 py-2 text-xs text-destructive"
        >
          {deployError}
        </p>
      ) : null}

      {orders
        .filter((o) => o.escrowContractId)
        .map((o) => (
          <div
            key={`deployed-${o.id}`}
            className="flex flex-col gap-2 bg-primary/10 px-4 py-3 text-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-primary">
                Escrow deployed for {o.id}
              </span>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(o.escrowContractId ?? "")
                }
                className="rounded-full border border-primary/40 px-2 py-1 text-[0.65rem] font-medium text-primary hover:bg-primary/10"
              >
                Copy contractId
              </button>
            </div>
            <code className="break-all font-mono text-[0.7rem] text-foreground">
              {o.escrowContractId}
            </code>
            <button
              type="button"
              onClick={() => router.push(`/trades/${o.id}`)}
              className="self-start text-[0.7rem] font-medium text-primary underline underline-offset-2"
            >
              Continue to trade →
            </button>
          </div>
        ))}

      <P2POrderList
        orders={orders}
        bestPrice={BEST_PRICE}
        mode={mode}
        onModeChange={setMode}
        onBuy={(orderId) => {
          if (mode === "sell") {
            void handleAcceptOrder(orderId);
          }
          setSelectedOrderId(orderId);
        }}
        onOpenDetail={(orderId) => router.push(`/p2p/orders/${orderId}`)}
      />
    </main>
  );
}
