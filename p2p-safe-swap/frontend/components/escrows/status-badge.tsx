import { cn } from "@/lib/utils";
import type { EscrowStatus } from "./types";

const STATUS_STYLES: Record<EscrowStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendiente",
    className:
      "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-950/50",
  },
  funded: {
    label: "Financiado",
    className:
      "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-950/50",
  },
  disputed: {
    label: "En disputa",
    className:
      "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950/50",
  },
  released: {
    label: "Liberado",
    className:
      "bg-green-50 text-green-700 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-950/50",
  },
};

export function EscrowStatusBadge({
  status,
  className,
}: {
  status: EscrowStatus;
  className?: string;
}) {
  const { label, className: statusClass } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusClass,
        className
      )}
    >
      {label}
    </span>
  );
}
