"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatScreen, RaiseDisputeDialog } from "@/frontend/components/chat";
import type { ChatMessage } from "@/frontend/components/chat";
import { Reveal } from "@/frontend/components/motion/reveal";
import {
  approveEscrowMilestone,
  EscrowApproveMilestoneError,
  type EscrowApproveMilestoneStatus,
} from "@/frontend/lib/escrow-approve-milestone";
import {
  EscrowDisputeError,
  raiseEscrowDispute,
  type EscrowDisputeStatus,
} from "@/frontend/lib/escrow-dispute";
import { useWallet } from "@/frontend/lib/wallet-context";

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
    status: "completed",
  },
  {
    id: "7",
    type: "text",
    author: "counterpart",
    timestamp: createDate(1, 14, 35),
    text: "I've marked the payment as completed. Please confirm receipt.",
  },
];

const MOCK_ESCROW_CONTEXT = {
  contractId: "PLACEHOLDER_ESCROW_CONTRACT_ID",
};

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const counterpartAddress = `0x${params.id}`;
  const { publicKey, signTransaction } = useWallet();

  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [isDisputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeStatus, setDisputeStatus] = useState<EscrowDisputeStatus>("idle");
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [isDisputed, setIsDisputed] = useState(false);
  const [approveStatus, setApproveStatus] = useState<EscrowApproveMilestoneStatus>("idle");
  const [approveError, setApproveError] = useState<string | null>(null);

  const canRaiseDispute = Boolean(publicKey);

  const handleSendMessage = useCallback((text: string) => {
    console.log("[Chat] sendMessage", text);
  }, []);

  const handleSendPayment = useCallback(() => {
    console.log("[Chat] sendPayment");
  }, []);

  const handleViewReceipt = useCallback((messageId: string) => {
    console.log("[Chat] viewReceipt", messageId);
  }, []);

  const handleAcceptPaymentRequest = useCallback(
    async (messageId: string) => {
      if (!publicKey) {
        setApproveError("Connect your Stellar wallet before confirming payment");
        return;
      }

      setApproveError(null);

      try {
        await approveEscrowMilestone(
          {
            contractId: MOCK_ESCROW_CONTEXT.contractId,
            approver: publicKey,
            milestoneIndexes: [0],
          },
          signTransaction,
          setApproveStatus
        );

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId && msg.type === "request"
              ? { ...msg, status: "approved" as const }
              : msg
          )
        );
        setApproveStatus("idle");
      } catch (error) {
        const message =
          error instanceof EscrowApproveMilestoneError
            ? error.message
            : "Unable to approve payment";
        setApproveError(message);
        setApproveStatus("failed");
      }
    },
    [publicKey, signTransaction]
  );

  const handleRejectPaymentRequest = useCallback((messageId: string) => {
    console.log("[Chat] rejectPaymentRequest", messageId);
  }, []);

  const handleRaiseDispute = useCallback(() => {
    setDisputeError(null);
    setDisputeDialogOpen(true);
  }, []);

  const handleCloseDispute = useCallback(() => {
    if (disputeStatus === "requesting-signature" || disputeStatus === "submitting") return;
    setDisputeDialogOpen(false);
    setDisputeError(null);
  }, [disputeStatus]);

  const handleSubmitDispute = useCallback(
    async (reason: string) => {
      if (!publicKey) {
        const message = "Connect your Stellar wallet before opening a dispute";
        setDisputeError(message);
        throw new EscrowDisputeError(message);
      }

      setDisputeError(null);

      try {
        await raiseEscrowDispute(
          {
            contractId: MOCK_ESCROW_CONTEXT.contractId,
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
        setIsDisputed(true);
        setDisputeDialogOpen(false);
      } catch (error) {
        const message =
          error instanceof EscrowDisputeError
            ? error.message
            : "Unable to open dispute";
        setDisputeError(message);
        throw error instanceof EscrowDisputeError ? error : new EscrowDisputeError(message);
      }
    },
    [publicKey, signTransaction]
  );

  const isSubmittingDispute =
    disputeStatus === "requesting-signature" || disputeStatus === "submitting";

  const isSubmittingApprove =
    approveStatus === "requesting-signature" || approveStatus === "submitting";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      <Reveal className="flex flex-1 flex-col">
        <ChatScreen
          counterpartAddress={counterpartAddress}
          messages={messages}
          onBack={() => router.back()}
          onSendMessage={handleSendMessage}
          onSendPayment={handleSendPayment}
          onViewReceipt={handleViewReceipt}
          onAcceptPaymentRequest={handleAcceptPaymentRequest}
          onRejectPaymentRequest={handleRejectPaymentRequest}
          onRaiseDispute={handleRaiseDispute}
          canRaiseDispute={canRaiseDispute}
          isDisputed={isDisputed}
          isOnline={true}
        />
      </Reveal>

      {(approveError || isSubmittingApprove) && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-4">
          {isSubmittingApprove && (
            <div className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
              {approveStatus === "requesting-signature"
                ? "Waiting for wallet signature…"
                : "Submitting approval…"}
            </div>
          )}
          {approveError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive shadow-lg"
            >
              {approveError}
            </div>
          )}
        </div>
      )}

      <RaiseDisputeDialog
        open={isDisputeDialogOpen}
        onClose={handleCloseDispute}
        onSubmit={handleSubmitDispute}
        isSubmitting={isSubmittingDispute}
        submitError={disputeError}
      />
    </div>
  );
}
