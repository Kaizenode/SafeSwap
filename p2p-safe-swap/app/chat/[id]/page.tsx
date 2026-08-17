"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatScreen, RaiseDisputeDialog } from "@/frontend/components/chat";
import type { ChatMessage } from "@/frontend/components/chat";
import { Reveal } from "@/frontend/components/motion/reveal";
import {
  EscrowDisputeError,
  raiseEscrowDispute,
  type EscrowDisputeStatus,
} from "@/frontend/lib/escrow-dispute";
import {
  approveEscrowMilestones,
  EscrowApproveMilestonesError,
  type EscrowApproveMilestonesStatus,
} from "@/frontend/lib/escrow-approve-milestones";
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

const MOCK_ESCROW_CONTEXT = {
  contractId: "PLACEHOLDER_ESCROW_CONTRACT_ID",
};

const MILESTONE_INDEXES = [0];

// Stand-in for the buyer's on-chain "mark milestone complete" signal
// (change-milestone-status) until that flow is wired up separately.
const MOCK_MILESTONE_STATUS: "pending" | "completed" = "completed";

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
  const [milestoneStatus] = useState<"pending" | "completed">(MOCK_MILESTONE_STATUS);
  const [approveStatus, setApproveStatus] = useState<EscrowApproveMilestonesStatus>("idle");
  const [approveError, setApproveError] = useState<string | null>(null);

  const canRaiseDispute = Boolean(publicKey);
  const isMilestoneCompleted = milestoneStatus === "completed";
  const isAcceptingPaymentRequest =
    approveStatus === "requesting-signature" || approveStatus === "submitting";
  const isPaymentApproved = approveStatus === "approved";

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
        setApproveError("Connect your Stellar wallet before approving");
        return;
      }
      if (!isMilestoneCompleted) {
        setApproveError("Waiting for the buyer to confirm payment before approving");
        return;
      }

      setApproveError(null);

      try {
        await approveEscrowMilestones(
          {
            contractId: MOCK_ESCROW_CONTEXT.contractId,
            approver: publicKey,
            milestoneIndexes: MILESTONE_INDEXES,
          },
          signTransaction,
          setApproveStatus
        );

        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId && message.type === "request"
              ? { ...message, status: "completed" }
              : message
          )
        );
      } catch (error) {
        const message =
          error instanceof EscrowApproveMilestonesError
            ? error.message
            : "Unable to approve milestone";
        setApproveError(message);
      }
    },
    [publicKey, signTransaction, isMilestoneCompleted]
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
          isPaymentRequestReady={isMilestoneCompleted}
          isAcceptingPaymentRequest={isAcceptingPaymentRequest}
          isPaymentApproved={isPaymentApproved}
          paymentApprovalError={approveError}
          isOnline={true}
        />
      </Reveal>

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
