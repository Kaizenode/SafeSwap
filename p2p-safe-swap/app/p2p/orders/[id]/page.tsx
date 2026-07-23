"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { OrderDetail } from "@/frontend/components/p2p";
import type { P2POrder } from "@/frontend/components/p2p";

const MOCK_ORDERS: P2POrder[] = [
  {
    id: "ord-diego-v",
    user: {
      name: "Dylan Cast.",
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
  }
];

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const order = MOCK_ORDERS.find((candidate) => candidate.id === id) ?? MOCK_ORDERS[0];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <OrderDetail
        order={order}
        mode="buy"
        onBack={() => router.back()}
        onStartTrade={(payload) => {
          console.log("Start trade intent:", payload);
        }}
      />
    </main>
  );
}
