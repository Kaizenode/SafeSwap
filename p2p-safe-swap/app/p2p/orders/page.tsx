"use client";

import { useState } from "react";
import { P2POrderList } from "@/frontend/components/p2p";
import { ChatScreen } from "@/frontend/components/chat/chat-screen";
import type { OrderMode, P2POrder } from "@/frontend/components/p2p";
import type { ChatMessage } from "@/frontend/components/chat/types";

const MOCK_ORDERS: P2POrder[] = [
  {
    id: "ord-diego-v",
    user: {
      name: "Diego V.",
      initials: "DV",
      verified: true,
      rating: 4.95,
      opsCount: 612,
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
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
      address: "0x4F2B1c9A6E1d8c0F3a5B7d9E1f2A3b4C5d6E7f80",
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
      address: "0x8A1bC2dE3fF4a5B6c7D8e9F0a1B2c3D4e5F6a7B8",
    },
    price: 0.9188,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 220,
    limits: { min: 20, max: 200 },
    windowMinutes: 10,
    paymentMethods: ["Revolut"],
  },
];

const BEST_PRICE = 0.9201;

// Mock messages for demonstration
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

  const selectedOrder = selectedOrderId
    ? MOCK_ORDERS.find((o) => o.id === selectedOrderId)
    : null;

  if (selectedOrder) {
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
            
            // This is where the escrow integration happens
            // Parent component should:
            // 1. Call trustlessWork.escrow.changeMilestoneStatus()
            // 2. Get unsigned XDR
            // 3. Sign with wallet
            // 4. Submit transaction
            // 5. Update message status to "completed"
            
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
          onBack={() => {
            setSelectedOrderId(null);
          }}
          lang="es"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <P2POrderList
        orders={MOCK_ORDERS}
        bestPrice={BEST_PRICE}
        mode={mode}
        onModeChange={setMode}
        onBuy={(orderId) => {
          console.log("Order action:", { mode, orderId });
          setSelectedOrderId(orderId);
        }}
      />
    </main>
  );
}
