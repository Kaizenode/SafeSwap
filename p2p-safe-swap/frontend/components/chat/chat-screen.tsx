"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentBubble } from "@/frontend/components/PaymentBubble/PaymentBubble";
import { ChatHeader } from "./chat-header";
import { ChatInputBar } from "./chat-input-bar";
import { ChatMessageBubble } from "./chat-message-bubble";
import { DateSeparator } from "./date-separator";
import type { ChatMessage } from "./types";
import { formatTime, groupMessagesByDay } from "./utils";

export interface ChatScreenProps {
  counterpartAddress: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendPayment: () => void;
  onBack?: () => void;
  onMore?: () => void;
  onViewReceipt?: (messageId: string) => void;
  onAcceptPaymentRequest?: (messageId: string) => void;
  onRejectPaymentRequest?: (messageId: string) => void;
  onRaiseDispute?: () => void;
  canRaiseDispute?: boolean;
  isDisputed?: boolean;
  isOnline?: boolean;
  lang?: "es" | "en";
  className?: string;
}

interface PaymentHandlers {
  onViewReceipt?: (messageId: string) => void;
  onAcceptPaymentRequest?: (messageId: string) => void;
  onRejectPaymentRequest?: (messageId: string) => void;
}

function renderMessage(
  message: ChatMessage,
  lang: "es" | "en",
  handlers: PaymentHandlers,
  disablePaymentActions: boolean
) {
  if (message.type === "text") {
    return <ChatMessageBubble key={message.id} message={message} />;
  }

  const isSelf = message.author === "self";
  const isRequest = message.type === "request";
  const variant = isRequest ? "request" : "sent";
  const side = isSelf ? "sender" : "receiver";

  return (
    <div
      key={message.id}
      className={cn(
        "flex w-full flex-col",
        isSelf ? "items-end" : "items-start"
      )}
    >
      <div className={cn(disablePaymentActions && "pointer-events-none opacity-60")}>
        <PaymentBubble
          amount={message.amount}
          currency={message.currency}
          memo={message.memo}
          variant={variant}
          status={message.status}
          side={side}
          lang={lang}
          onPay={
            isRequest && !disablePaymentActions
              ? () => handlers.onAcceptPaymentRequest?.(message.id)
              : undefined
          }
          onReject={
            isRequest && !disablePaymentActions
              ? () => handlers.onRejectPaymentRequest?.(message.id)
              : undefined
          }
          onViewReceipt={
            !isRequest
              ? () => handlers.onViewReceipt?.(message.id)
              : undefined
          }
        />
      </div>
      <time
        dateTime={new Date(message.timestamp).toISOString()}
        className={cn(
          "mt-1 px-1 text-[11px] text-muted-foreground tabular-nums",
          isSelf ? "self-end" : "self-start"
        )}
      >
        {formatTime(message.timestamp)}
      </time>
    </div>
  );
}

export function ChatScreen({
  counterpartAddress,
  messages,
  onSendMessage,
  onSendPayment,
  onBack,
  onMore,
  onViewReceipt,
  onAcceptPaymentRequest,
  onRejectPaymentRequest,
  onRaiseDispute,
  canRaiseDispute = true,
  isDisputed = false,
  isOnline,
  lang = "en",
  className,
}: ChatScreenProps) {
  const groups = useMemo(() => groupMessagesByDay(messages), [messages]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handlers: PaymentHandlers = {
    onViewReceipt,
    onAcceptPaymentRequest,
    onRejectPaymentRequest,
  };

  const disputeBannerLabel = "Escrow in dispute — payment actions are disabled";

  return (
    <div
      data-slot="chat-screen"
      className={cn("flex h-full w-full flex-col bg-background", className)}
    >
      <ChatHeader
        counterpartAddress={counterpartAddress}
        isOnline={isOnline}
        onBack={onBack}
        onMore={onMore}
        onRaiseDispute={isDisputed ? undefined : onRaiseDispute}
        canRaiseDispute={canRaiseDispute}
      />

      {isDisputed ? (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{disputeBannerLabel}</span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation messages"
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {groups.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
            <span className="text-base font-medium text-foreground">
              No messages yet
            </span>
            <span>Send the first message or a payment to get started.</span>
          </div>
        ) : (
          groups.map((group) => (
            <section
              key={group.dayKey}
              aria-label={group.dayLabel}
              className="flex flex-col gap-3"
            >
              <DateSeparator label={group.dayLabel} />
              {group.messages.map((message) =>
                renderMessage(message, lang, handlers, isDisputed)
              )}
            </section>
          ))
        )}
      </div>

      <ChatInputBar
        onSendMessage={onSendMessage}
        onSendPayment={onSendPayment}
        disabled={isDisputed}
      />
    </div>
  );
}
