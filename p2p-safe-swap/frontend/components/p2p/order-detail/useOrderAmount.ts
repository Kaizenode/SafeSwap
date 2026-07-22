"use client";

import { useId, useState } from "react";
import type { OrderMode, P2POrder } from "../types";

export const MODE_COPY: Record<OrderMode, { amountLabel: string; cta: string }> = {
  buy: { amountLabel: "Monto a pagar", cta: "Iniciar intercambio" },
  sell: { amountLabel: "Monto a vender", cta: "Iniciar intercambio" },
};

export function formatAmount(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export interface UseOrderAmountOptions {
  order: P2POrder;
  onStartTrade?: (payload: { orderId: string; amount: number; receiveAmount: number }) => void;
}

export function useOrderAmount({ order, onStartTrade }: UseOrderAmountOptions) {
  const [amountInput, setAmountInput] = useState("");
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const { min, max } = order.limits;
  const hasAmount = amountInput.trim().length > 0;
  const amount = Number(amountInput);

  const error = !hasAmount
    ? null
    : Number.isNaN(amount) || amount < min
    ? `El monto mínimo es ${formatAmount(min)} ${order.currencyPair.base}`
    : amount > max
    ? `El monto máximo es ${formatAmount(max)} ${order.currencyPair.base}`
    : null;

  const isValid = hasAmount && !error;
  const receiveAmount = isValid && order.price > 0 ? amount / order.price : 0;

  function fillMin() {
    setAmountInput(String(min));
  }

  function fillMax() {
    setAmountInput(String(max));
  }

  function handleStartTrade() {
    if (!isValid) return;
    console.log("Start trade intent:", { orderId: order.id, amount, receiveAmount });
    onStartTrade?.({ orderId: order.id, amount, receiveAmount });
  }

  return {
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
  };
}
