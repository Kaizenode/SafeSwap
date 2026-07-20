"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { P2POrderList } from "@/frontend/components/p2p";
import type { OrderMode, P2POrder } from "@/frontend/components/p2p";

const MOCK_ORDERS: P2POrder[] = [
  {
    id: "ord-diego-v",
    user: {
      name: "Diego V.",
      initials: "DV",
      verified: true,
      rating: 4.95,
      opsCount: 612,
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    },
    price: 0.9201,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 5000,
    limits: { min: 200, max: 3000 },
    windowMinutes: 20,
    paymentMethods: ["SEPA", "Wise"],
  },
  {
    id: "ord-ana-c",
    user: {
      name: "Ana C.",
      initials: "AC",
      verified: true,
      rating: 4.85,
      opsCount: 198,
      address: "0x4F2B1c9A6E1d8c0F3a5B7d9E1f2A3b4C5d6E7f80",
    },
    price: 0.9195,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 980,
    limits: { min: 50, max: 600 },
    windowMinutes: 15,
    paymentMethods: ["Bizum"],
  },
  {
    id: "ord-carlos-l",
    user: {
      name: "Carlos L.",
      initials: "CL",
      verified: false,
      rating: 4.6,
      opsCount: 41,
      address: "0x8A1bC2dE3fF4a5B6c7D8e9F0a1B2c3D4e5F6a7B8",
    },
    price: 0.9188,
    currencyPair: { base: "EUR", quote: "USDT" },
    available: 220,
    limits: { min: 20, max: 200 },
    windowMinutes: 10,
    paymentMethods: ["Revolut"],
  },
];

const BEST_PRICE = 0.9201;

export default function OrdersPage() {
  const router = useRouter();
  const [mode, setMode] = useState<OrderMode>("buy");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <P2POrderList
        orders={MOCK_ORDERS}
        bestPrice={BEST_PRICE}
        mode={mode}
        onModeChange={setMode}
        onBuy={(orderId) => {
          router.push(`/p2p/orders/${orderId}`);
        }}
      />
    </main>
  );
}
