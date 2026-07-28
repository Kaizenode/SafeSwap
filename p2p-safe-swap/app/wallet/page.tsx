"use client";

import * as React from "react";
import {
  TransactionList,
  type Transaction,
  type TransactionTab,
} from "@/frontend/components/ui/transaction-list";
import { Reveal } from "@/frontend/components/motion/reveal";
import { WalletSummary } from "@/frontend/components/wallet/WalletSummary";

const MOCK_ADDRESS = "GBQ7XZ4YJ5N2VQKPDR3MW6TLHC2AFSU4XKD9EOPB5RJIN7WQ2VH3TZLA";
const MOCK_BALANCE = 1284.5;

function createDate(daysAgo: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

const mockTransactions: Transaction[] = [
  {
    id: "w1",
    address: "Lucia Mendez",
    memo: "USDC sale",
    amount: 120,
    date: createDate(0, 10, 5),
    type: "in",
  },
  {
    id: "w2",
    address: "Mateo Ruiz",
    memo: "Yesterday's coffee",
    amount: 4.5,
    date: createDate(0, 8, 40),
    type: "out",
  },
  {
    id: "w3",
    address: "Sofia Paz",
    memo: "Escrow released",
    amount: 320,
    date: createDate(1, 18, 20),
    type: "in",
  },
  {
    id: "w4",
    address: "Diego Vera",
    memo: "Pending payment",
    amount: 60,
    date: createDate(2, 12, 0),
    type: "request",
  },
  {
    id: "w5",
    address: "Ana Cruz",
    memo: "Wallet top-up",
    amount: 45.25,
    date: createDate(9, 16, 30),
    type: "out",
  },
];

export default function WalletPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TransactionTab>("all");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background px-4 py-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">My wallet</h1>
      </header>

      <Reveal>
        <WalletSummary
          address={MOCK_ADDRESS}
          balance={MOCK_BALANCE}
          onSend={() => console.log("Quick action: send")}
          onReceive={() => console.log("Quick action: receive")}
          onDeposit={() => console.log("Quick action: deposit")}
        />
      </Reveal>

      <Reveal delay={0.1} className="mt-8">
        <section aria-labelledby="recent-activity-heading">
          <h2
            id="recent-activity-heading"
            className="mb-3 text-base font-semibold text-foreground"
          >
            Recent activity
          </h2>

          <TransactionList
            transactions={mockTransactions}
            searchQuery={searchQuery}
            activeTab={activeTab}
            onSearch={setSearchQuery}
            onTabChange={(tab) => setActiveTab(tab as TransactionTab)}
          />
        </section>
      </Reveal>
    </main>
  );
}
