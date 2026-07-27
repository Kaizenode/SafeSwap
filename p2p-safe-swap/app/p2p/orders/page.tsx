"use client";

import { useCallback, useState } from "react";
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

const USDC_TRUSTLINE = {
  address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  symbol: "USDC",
};

const PLATFORM_FEE = 1;

const PLACEHOLDER_BUYER_ADDRESS = "PLACEHOLDER_BUYER_STELLAR_ADDRESS";
const PLACEHOLDER_DISPUTE_RESOLVER_ADDRESS = "PLACEHOLDER_DISPUTE_RESOLVER_ADDRESS";

async function mockSignTransaction(unsignedXdr: string): Promise<string> {
  console.warn(
    "[escrow-deployment] mockSignTransaction called — replace with real wallet signing",
    { unsignedXdr }
  );
  throw new Error("Wallet signing is not yet integrated. Please connect a Stellar wallet.");
}

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
    text: "Hola, quiero comprar 1000 EUR",
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
  const [mode, setMode] = useState<OrderMode>("buy");
  const [orders, setOrders] = useState<P2POrder[]>(MOCK_ORDERS);
  const [deployStatus, setDeployStatus] = useState<
    Record<string, EscrowDeploymentStatus>
  >({});
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

      const sellerAddress = order.user.address;
      const buyerAddress = PLACEHOLDER_BUYER_ADDRESS;

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
          mockSignTransaction,
          (status) => setDeployStatus((prev) => ({ ...prev, [orderId]: status }))
        );

        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, escrowContractId: contractId } : o))
        );

        console.info(`[escrow-deployment] Escrow deployed for order ${orderId}:`, contractId);
      } catch (error) {
        setDeployStatus((prev) => ({ ...prev, [orderId]: "failed" }));
        console.error(`[escrow-deployment] Failed to deploy escrow for order ${orderId}:`, error);
      }
    },
    [orders]
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

      setDisputeError(null);

      try {
        await raiseEscrowDispute(
          {
            contractId: order.escrowContractId,
            signer: PLACEHOLDER_BUYER_ADDRESS,
            reason,
          },
          mockSignTransaction,
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
    [disputeDialogOrderId, orders]
  );

  const isSubmittingDispute =
    disputeStatus === "requesting-signature" || disputeStatus === "submitting";

  if (selectedOrder) {
    const isSelectedDisputed = Boolean(disputedOrders[selectedOrder.id]);
    const canRaiseDispute =
      Boolean(selectedOrder.escrowContractId) &&
      PLACEHOLDER_BUYER_ADDRESS !== PLACEHOLDER_DISPUTE_RESOLVER_ADDRESS;

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
      />
    </main>
  );
}
