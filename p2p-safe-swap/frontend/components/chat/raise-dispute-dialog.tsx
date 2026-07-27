"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/frontend/components/ui/Button/Button";
import {
  DISPUTE_REASON_MAX_LENGTH,
  EscrowDisputeError,
} from "@/frontend/lib/escrow-dispute";

export interface RaiseDisputeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
  submitError?: string | null;
  className?: string;
}

export function RaiseDisputeDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitError,
  className,
}: RaiseDisputeDialogProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();

  useEffect(() => {
    if (!open) {
      setReason("");
      setValidationError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isSubmitting, onClose]);

  const trimmedLength = useMemo(() => reason.trim().length, [reason]);
  const isReasonValid =
    trimmedLength > 0 && reason.length <= DISPUTE_REASON_MAX_LENGTH;
  const canSubmit = isReasonValid && !isSubmitting;
  const displayedError = validationError ?? submitError ?? null;

  if (!open) return null;

  async function handleSubmit() {
    if (isSubmitting) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Write a reason to open the dispute");
      return;
    }
    if (reason.length > DISPUTE_REASON_MAX_LENGTH) {
      setValidationError(
        `Reason must not exceed ${DISPUTE_REASON_MAX_LENGTH} characters`
      );
      return;
    }

    setValidationError(null);

    try {
      await onSubmit(reason);
    } catch (error) {
      if (error instanceof EscrowDisputeError) {
        setValidationError(error.message);
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-6 backdrop-blur-sm sm:items-center",
        className
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-lg">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <AlertTriangle size={18} />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-base font-semibold text-foreground">
                Open dispute
              </h2>
              <p id={descriptionId} className="text-xs text-muted-foreground">
                Explain what went wrong. The counterparty and the resolution
                team will see your message.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={reasonId}
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Dispute reason
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isSubmitting}
            rows={5}
            maxLength={DISPUTE_REASON_MAX_LENGTH}
            autoFocus
            placeholder="e.g. I sent the payment but the counterparty denies receiving it."
            aria-invalid={Boolean(displayedError)}
            className={cn(
              "min-h-28 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              displayedError && "border-destructive focus-visible:ring-destructive"
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <span className={cn("text-destructive", !displayedError && "invisible")}>
              {displayedError ?? "placeholder"}
            </span>
            <span
              aria-live="polite"
              className={cn(
                "tabular-nums text-muted-foreground",
                reason.length > DISPUTE_REASON_MAX_LENGTH && "text-destructive"
              )}
            >
              {reason.length}/{DISPUTE_REASON_MAX_LENGTH}
            </span>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            size="md"
            label="Cancel"
            onClick={onClose}
            disabled={isSubmitting}
            className="sm:min-w-28"
          />
          <Button
            variant="danger"
            size="md"
            label={isSubmitting ? "Opening…" : "Open dispute"}
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-disabled={!canSubmit}
            className="sm:min-w-32"
          />
        </footer>
      </div>
    </div>
  );
}
