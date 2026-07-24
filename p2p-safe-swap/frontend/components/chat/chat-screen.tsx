"use client";

import { useEffect, useMemo, useRef } from "react";
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
  handlers: PaymentHandlers
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
      <PaymentBubble
        amount={message.amount}
        currency={message.currency}
        memo={message.memo}
        variant={variant}
        status={message.status}
        side={side}
        lang={lang}
        onPay={
          isRequest
            ? () => handlers.onAcceptPaymentRequest?.(message.id)
            : undefined
        }
        onReject={
          isRequest
            ? () => handlers.onRejectPaymentRequest?.(message.id)
            : undefined
        }
        onViewReceipt={
          !isRequest
            ? () => handlers.onViewReceipt?.(message.id)
            : undefined
        }
      />
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
  isOnline,
  lang = "es",
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
      />

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Mensajes de la conversación"
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {groups.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-1 text-center text-sm text-muted-foreground">
            <span className="text-base font-medium text-foreground">
              Sin mensajes aún
            </span>
            <span>Envía el primer mensaje o un pago para empezar.</span>
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
                renderMessage(message, lang, handlers)
              )}
            </section>
          ))
        )}
      </div>

      <ChatInputBar
        onSendMessage={onSendMessage}
        onSendPayment={onSendPayment}
      />
    </div>
  );
}
