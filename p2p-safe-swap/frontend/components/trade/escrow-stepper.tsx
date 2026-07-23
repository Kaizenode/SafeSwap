"use client";

import * as React from "react";
import { AlertTriangle, Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type EscrowStepStatus = "completed" | "current" | "pending" | "disputed";

export interface EscrowStep {
  key: string;
  label: string;
  description?: string;
  status: EscrowStepStatus;
  /** ISO 8601 timestamp. Formatted with `locale` at render time. */
  timestamp?: string;
}

export interface EscrowStepperProps {
  steps: EscrowStep[];
  className?: string;
  locale?: string;
  "aria-label"?: string;
}

const labelClass: Record<EscrowStepStatus, string> = {
  completed: "text-foreground",
  current: "text-primary",
  pending: "text-muted-foreground",
  disputed: "text-destructive",
};

function formatTimestamp(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StepIcon({ status }: { status: EscrowStepStatus }) {
  const base =
    "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors";

  if (status === "completed") {
    return (
      <span className={cn(base, "bg-primary text-primary-foreground")}>
        <Check className="size-4" strokeWidth={3} aria-hidden />
      </span>
    );
  }

  if (status === "current") {
    return (
      <span
        className={cn(base, "bg-primary/15 text-primary ring-2 ring-primary/40")}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
      </span>
    );
  }

  if (status === "disputed") {
    return (
      <span
        className={cn(
          base,
          "bg-destructive/15 text-destructive ring-2 ring-destructive/40"
        )}
      >
        <AlertTriangle className="size-4" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(base, "border border-border bg-card text-muted-foreground")}
    >
      <Circle className="size-2.5 fill-current" aria-hidden />
    </span>
  );
}

const statusSrLabel: Record<EscrowStepStatus, string> = {
  completed: "Completed",
  current: "In progress",
  pending: "Pending",
  disputed: "Disputed",
};

export function EscrowStepper({
  steps,
  className,
  locale = "en-US",
  "aria-label": ariaLabel = "Escrow stages",
}: EscrowStepperProps) {
  return (
    <ol className={cn("flex flex-col", className)} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const railCompleted = step.status === "completed";

        return (
          <li
            key={step.key}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cn("relative flex gap-4", !isLast && "pb-6")}
          >
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 w-px flex-1",
                    railCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 pb-1">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "text-sm font-semibold",
                    labelClass[step.status]
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {" — "}
                    {statusSrLabel[step.status]}
                  </span>
                </span>
                {step.timestamp && (
                  <time
                    dateTime={step.timestamp}
                    className="text-xs text-muted-foreground tabular-nums"
                  >
                    {formatTimestamp(step.timestamp, locale)}
                  </time>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
