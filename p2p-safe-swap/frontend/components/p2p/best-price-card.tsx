import { cn } from "@/lib/utils";
import type { CurrencyPair } from "./types";

export interface BestPriceCardProps {
  price: number;
  currencyPair: CurrencyPair;
  ordersCount: number;
  className?: string;
}

export function BestPriceCard({
  price,
  currencyPair,
  ordersCount,
  className,
}: BestPriceCardProps) {
  return (
    <section
      data-slot="best-price-card"
      aria-label="Best available price"
      className={cn(
        "flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Best price
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {price.toFixed(4)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {currencyPair.base} / {currencyPair.quote}
          </span>
        </div>
      </div>

      <div
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
        aria-label={`${ordersCount} active orders`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        <span>
          {ordersCount} {ordersCount === 1 ? "order" : "orders"}
        </span>
      </div>
    </section>
  );
}
