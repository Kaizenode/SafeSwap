"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/frontend/components/motion/reveal";
import {
  TransactionList,
  type Transaction,
  type TransactionTab,
} from "@/frontend/components/ui/transaction-list";

function createDate(daysAgo: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    address: "Lucía Méndez",
    memo: "Café de ayer",
    amount: 4.5,
    date: createDate(0, 9, 12),
    type: "out",
  },
  {
    id: "2",
    address: "Mateo Ruiz",
    memo: "Cena split",
    amount: 23,
    date: createDate(0, 8, 45),
    type: "in",
  },
  {
    id: "3",
    address: "Sofía Paz",
    memo: "Taxi compartido",
    amount: 12.3,
    date: createDate(1, 19, 30),
    type: "out",
  },
  {
    id: "4",
    address: "Diego Vera",
    memo: "Alquiler parcial",
    amount: 150,
    date: createDate(1, 14, 15),
    type: "in",
  },
  {
    id: "5",
    address: "Ana Cruz",
    memo: "Regalo cumpleaños",
    amount: 25,
    date: createDate(18, 11, 0),
    type: "out",
  },
  {
    id: "6",
    address: "Carlos Núñez",
    memo: "Pago pendiente",
    amount: 40,
    date: createDate(20, 16, 20),
    type: "request",
  },
  {
    id: "7",
    address: "Elena Torres",
    memo: "Servicio freelance",
    amount: 85,
    date: createDate(35, 10, 30),
    type: "in",
  },
  {
    id: "8",
    address: "Pablo Soto",
    memo: "Compra grupal",
    amount: 18.75,
    date: createDate(42, 18, 45),
    type: "out",
  },
];

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TransactionTab>("all");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/p2p/orders"
          aria-label="Volver"
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <h1 className="text-lg font-semibold text-foreground">Transacciones</h1>

        <button
          type="button"
          aria-label="Filtrar transacciones"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </header>

      <Reveal>
        <TransactionList
          transactions={mockTransactions}
          searchQuery={searchQuery}
          activeTab={activeTab}
          onSearch={setSearchQuery}
          onTabChange={(tab) => setActiveTab(tab as TransactionTab)}
        />
      </Reveal>
    </div>
  );
}
