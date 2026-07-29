"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/Button/Button";

export interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onSendPayment: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ChatInputBar({
  onSendMessage,
  onSendPayment,
  placeholder = "Type a message…",
  disabled = false,
  className,
}: ChatInputBarProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <form
      data-slot="chat-input-bar"
      onSubmit={handleSubmit}
      className={cn(
        "flex items-end gap-2 border-t border-border bg-background px-3 py-2.5",
        className
      )}
      aria-label="Send message or payment"
    >
      <Button
        variant="primary"
        size="md"
        label="Pay"
        onClick={onSendPayment}
        disabled={disabled}
        aria-label="Send payment"
      />

      <label className="sr-only" htmlFor="chat-input">
        Message
      </label>
      <textarea
        id="chat-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          "min-h-10 max-h-32 flex-1 resize-none rounded-2xl border border-border bg-muted/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        label="Send"
        disabled={!canSend}
        aria-label="Send message"
      />
    </form>
  );
}
