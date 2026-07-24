"use client";

import { ArrowLeft, BadgeCheck, Clock } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button/Button";
import { WalletBadge } from "@/frontend/components/ui/wallet-badge";
import { Reveal } from "@/frontend/components/motion/reveal";
import { cn } from "@/lib/utils";
import type { OrderMode, P2POrder } from "../types";
import { formatAmount, MODE_COPY, useOrderAmount } from "./useOrderAmount";

export interface OrderDetailProps {
  order: P2POrder;
  mode?: OrderMode;
  onBack?: () => void;
  onStartTrade?: (payload: { orderId: string; amount: number; receiveAmount: number }) => void;
  className?: string;
}

export function OrderDetail({
  order,
  mode = "buy",
  onBack,
  onStartTrade,
  className,
}: OrderDetailProps) {
  const {
    amountInput,
    setAmountInput,
    inputId,
    errorId,
    min,
    max,
    error,
    isValid,
    receiveAmount,
    fillMin,
    fillMax,
    handleStartTrade,
  } = useOrderAmount({ order, onStartTrade });

  return (
    <div
      data-slot="order-detail"
      className={cn("flex w-full flex-col gap-4 bg-background p-4 sm:p-6", className)}
    >
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="group flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft
            size={20}
            aria-hidden="true"
            className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5"
          />
        </button>
        <h1 className="text-base font-semibold text-foreground">Detalle de la orden</h1>
      </header>

      <Reveal className="flex flex-col gap-4">
        <section
          aria-label="Contraparte y precio"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <WalletBadge
              address={order.user.name}
              className="bg-secondary text-secondary-foreground"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-base font-semibold text-foreground">
                  {order.user.address}
                </span>
                {order.user.verified && (
                  <BadgeCheck size={16} className="shrink-0 text-primary" aria-label="Verificado" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>★ {order.user.rating}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{order.user.opsCount} ops</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Precio
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                {order.price.toFixed(4)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {order.currencyPair.base} / {order.currencyPair.quote}
              </span>
            </div>
          </div>
        </section>

        <section
          aria-label="Condiciones de la orden"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Disponible</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatAmount(order.available)} {order.currencyPair.quote}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Límites</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatAmount(min)} – {formatAmount(max)} {order.currencyPair.base}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ventana de pago</span>
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Clock size={14} aria-hidden="true" />
              {order.windowMinutes} min
            </span>
          </div>
        </section>

        <section aria-label="Métodos de pago" className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Métodos de pago
          </span>
          <div className="flex flex-wrap gap-2">
            {order.paymentMethods.map((method) => (
              <span
                key={method}
                className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
              >
                {method}
              </span>
            ))}
          </div>
        </section>

        <section
          aria-label="Monto a intercambiar"
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={inputId}
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {MODE_COPY[mode].amountLabel}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={fillMin}
                aria-label={`Usar monto mínimo, ${formatAmount(min)} ${order.currencyPair.base}`}
                className="cursor-pointer rounded-full border border-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Mín
              </button>
              <button
                type="button"
                onClick={fillMax}
                aria-label={`Usar monto máximo, ${formatAmount(max)} ${order.currencyPair.base}`}
                className="cursor-pointer rounded-full border border-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Máx
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              min={min}
              max={max}
              step="any"
              onChange={(e) => setAmountInput(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-w-0 bg-transparent text-3xl font-semibold text-foreground tabular-nums placeholder:text-muted-foreground/50 focus:outline-none"
            />
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {order.currencyPair.base}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recibes</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                isValid ? "text-primary" : "text-muted-foreground"
              )}
            >
              {formatAmount(receiveAmount)} {order.currencyPair.quote}
            </span>
          </div>

          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        <Button
          variant="primary"
          size="lg"
          label={MODE_COPY[mode].cta}
          onClick={handleStartTrade}
          disabled={!isValid}
          className="w-full"
        />
      </Reveal>
    </div>
  );
}
