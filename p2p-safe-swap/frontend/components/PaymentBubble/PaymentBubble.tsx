'use client'

import { ArrowUpRight, ArrowDownLeft, ArrowRight, Check, X } from "lucide-react";
import { PaymentBubbleProperties } from "./types";
import { formatCurrency, translations } from "./utils";
import { Button } from "../ui/Button/Button";

export function PaymentBubble({
  amount,
  currency,
  memo,
  variant,
  status,
  side,
  lang = "en",
  onPay,
  onReject,
  onViewReceipt,
}: PaymentBubbleProperties) {
  const isSent = variant === "sent";
  const isDark = isSent;
  const t      = translations[lang];

  const cornerClass = side === "sender"
    ? "rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl rounded-br-md"
    : "rounded-tl-3xl rounded-tr-3xl rounded-bl-md rounded-br-3xl";

  return (
    <div className={`w-72 overflow-hidden ${cornerClass} ${isDark ? "bg-chat-bubble-outgoing text-chat-bubble-outgoing-foreground" : "bg-card text-card-foreground border border-border"}`}>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-white/10" : "bg-muted"}`}>
            {isSent
              ? <ArrowUpRight size={18} className="text-chat-bubble-outgoing-foreground" />
              : <ArrowDownLeft size={18} className="text-primary" />
            }
          </div>
          <div>
            <p className={`text-xs font-semibold tracking-widest ${isDark ? "text-chat-bubble-outgoing-foreground/70" : "text-muted-foreground"}`}>
              {isSent ? t.sent : t.request}
            </p>
            <p className={`text-2xl font-bold leading-tight ${isDark ? "text-chat-bubble-outgoing-foreground" : "text-foreground"}`}>
              {formatCurrency(amount)} {currency}
            </p>
          </div>
        </div>

        {memo && (
          <p className={`text-sm ${isDark ? "text-chat-bubble-outgoing-foreground/70" : "text-muted-foreground"}`}>
            &ldquo;{memo}&rdquo;
          </p>
        )}
      </div>

      <div className={`h-px ${isDark ? "bg-white/10" : "bg-border"}`} />

      <div className={`px-4 py-3 flex items-center justify-between ${isDark ? "bg-white/5" : "bg-muted"}`}>

        {status === "completed" && variant === "request" && (
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check size={14} />
              {t.completed}
            </span>
            <Button variant="primary" size="sm" label={t.pay} onClick={onPay} />
          </div>
        )}

        {status === "completed" && variant === "sent" && <>
          <span className={`flex items-center gap-1 text-xs ${isDark ? "text-chat-bubble-outgoing-foreground/70" : "text-muted-foreground"}`}>
            <Check size={14} />
            {t.completed}
          </span>
          <button onClick={onViewReceipt} className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${isDark ? "text-chat-bubble-outgoing-foreground/70 hover:text-chat-bubble-outgoing-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.viewReceipt} <ArrowRight size={12} />
          </button>
        </>}

        {(status === "approved, ready for release" || status === "approved") && (
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Check size={14} />
              {t.approvedReady || "approved, ready for release"}
            </span>
            {onViewReceipt && (
              <button onClick={onViewReceipt} className={`flex items-center gap-1 text-xs transition-colors cursor-pointer ${isDark ? "text-chat-bubble-outgoing-foreground/70 hover:text-chat-bubble-outgoing-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t.viewReceipt} <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}

        {status === "pending" && variant === "request" && <>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            {t.pending}
          </span>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" label={t.reject} onClick={onReject} />
            <Button variant="primary" size="sm" label={t.pay} onClick={onPay} disabled />
          </div>
        </>}

        {status === "pending" && variant === "sent" && (
          <span className="flex items-center gap-1.5 text-sm text-chat-bubble-outgoing-foreground/70">
            <span className="w-1.5 h-1.5 rounded-full bg-chat-bubble-outgoing-foreground/40" />
            {t.pending}
          </span>
        )}

        {status === "rejected" && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <X size={14} />
            {t.rejected}
          </span>
        )}

      </div>
    </div>
  );
}
