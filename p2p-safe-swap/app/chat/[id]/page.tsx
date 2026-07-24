"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { ChatScreen } from "@/frontend/components/chat";
import type { ChatMessage } from "@/frontend/components/chat";
import { Reveal } from "@/frontend/components/motion/reveal";

function createDate(daysAgo: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

const mockMessages: ChatMessage[] = [
  {
    id: "1",
    type: "text",
    author: "counterpart",
    timestamp: createDate(0, 9, 15),
    text: "Hi! I'm interested in the item you listed. Is it still available?",
  },
  {
    id: "2",
    type: "text",
    author: "self",
    timestamp: createDate(0, 9, 18),
    text: "Hey! Yes, it's still available. Would you like to come check it out?",
    deliveryStatus: "read",
  },
  {
    id: "3",
    type: "text",
    author: "counterpart",
    timestamp: createDate(0, 9, 22),
    text: "Perfect. Can we meet tomorrow afternoon?",
  },
  {
    id: "4",
    type: "payment",
    author: "self",
    timestamp: createDate(0, 10, 0),
    amount: 50,
    currency: "USDC",
    memo: "Deposit for the item",
    status: "completed",
    receiptUrl: "#",
  },
  {
    id: "5",
    type: "text",
    author: "self",
    timestamp: createDate(0, 10, 5),
    text: "Sent the deposit. We'll settle the rest when we meet.",
    deliveryStatus: "sent",
  },
  {
    id: "6",
    type: "request",
    author: "counterpart",
    timestamp: createDate(1, 14, 30),
    amount: 150,
    currency: "USDC",
    memo: "Remaining balance for the item",
    status: "pending",
  },
  {
    id: "7",
    type: "text",
    author: "counterpart",
    timestamp: createDate(1, 14, 35),
    text: "Sent you the request for the remaining balance. Thanks!",
  },
];

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const counterpartAddress = `0x${params.id}`;

  const handleSendMessage = useCallback((text: string) => {
    console.log("[Chat] sendMessage", text);
  }, []);

  const handleSendPayment = useCallback(() => {
    console.log("[Chat] sendPayment");
  }, []);

  const handleViewReceipt = useCallback((messageId: string) => {
    console.log("[Chat] viewReceipt", messageId);
  }, []);

  const handleAcceptPaymentRequest = useCallback((messageId: string) => {
    console.log("[Chat] acceptPaymentRequest", messageId);
  }, []);

  const handleRejectPaymentRequest = useCallback((messageId: string) => {
    console.log("[Chat] rejectPaymentRequest", messageId);
  }, []);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      <Reveal className="flex flex-1 flex-col">
        <ChatScreen
          counterpartAddress={counterpartAddress}
          messages={mockMessages}
          onSendMessage={handleSendMessage}
          onSendPayment={handleSendPayment}
          onViewReceipt={handleViewReceipt}
          onAcceptPaymentRequest={handleAcceptPaymentRequest}
          onRejectPaymentRequest={handleRejectPaymentRequest}
          isOnline={true}
        />
      </Reveal>
    </div>
  );
}