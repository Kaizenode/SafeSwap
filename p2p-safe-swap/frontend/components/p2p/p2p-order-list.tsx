"use client";

import { TransactionCard } from "@/frontend/components/TransactionCard/TransactionCard";
import { TabBar } from "@/frontend/components/ui/tab-bar";
import { Reveal } from "@/frontend/components/motion/reveal";
import { cn } from "@/lib/utils";
import { BestPriceCard } from "./best-price-card";
import type { CurrencyPair, OrderMode, P2POrder } from "./types";

export interface P2POrderListProps {
  orders: P2POrder[];
  bestPrice: number;
  mode: OrderMode;
  onModeChange: (mode: OrderMode) => void;
  onBuy: (orderId: string) => void;
  onOpenDetail?: (orderId: string) => void;
  className?: string;
}

const MODE_TABS: OrderMode[] = ["buy", "sell"];
const MODE_LABELS: Record<OrderMode, string> = {
  buy: "Comprar",
  sell: "Vender",
};

function sortOrdersByBestPrice(orders: P2POrder[], mode: OrderMode) {
  const sorted = [...orders];
  sorted.sort((a, b) => (mode === "buy" ? a.price - b.price : b.price - a.price));
  return sorted;
}

function resolveCurrencyPair(orders: P2POrder[]): CurrencyPair {
  const first = orders[0];
  if (first) return first.currencyPair;
  return { base: "USDT", quote: "EUR" };
}

export function P2POrderList({
  orders,
  bestPrice,
  mode,
  onModeChange,
  onBuy,
  onOpenDetail,
  className,
}: P2POrderListProps) {
  const sortedOrders = sortOrdersByBestPrice(orders, mode);
  const currencyPair = resolveCurrencyPair(orders);
  const activeIndex = MODE_TABS.indexOf(mode);

  return (
    <div
      data-slot="p2p-order-list"
      className={cn(
        "flex h-full w-full flex-col gap-4 bg-background p-4 sm:p-6",
        className
      )}
    >
      <BestPriceCard
        price={bestPrice}
        currencyPair={currencyPair}
        ordersCount={orders.length}
      />

      <div className="flex justify-center">
        <TabBar
          tabs={MODE_TABS.map((m) => MODE_LABELS[m])}
          activeIndex={activeIndex === -1 ? 0 : activeIndex}
          onChange={(index) => onModeChange(MODE_TABS[index])}
          aria-label="Order mode"
        />
      </div>

      <section
        aria-label={`${mode === "buy" ? "Buy" : "Sell"} orders sorted by best price`}
        className="flex flex-1 flex-col gap-3 overflow-y-auto pb-2"
      >
        {sortedOrders.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No hay órdenes disponibles en este momento.
          </div>
        ) : (
          sortedOrders.map((order, index) => (
            <Reveal key={order.id} delay={Math.min(index, 6) * 0.06}>
              <TransactionCard
                user={order.user.name}
                address={order.user.address}
                rating={order.user.rating}
                operationCount={order.user.opsCount}
                price={order.price}
                available={order.available}
                minLimit={order.limits.min}
                maxLimit={order.limits.max}
                windowMinutes={order.windowMinutes}
                paymentMethods={order.paymentMethods}
                lang="es"
                mode={mode}
                onBuy={() => onBuy(order.id)}
                onSelect={onOpenDetail ? () => onOpenDetail(order.id) : undefined}
              />
            </Reveal>
          ))
        )}
      </section>
    </div>
  );
}
