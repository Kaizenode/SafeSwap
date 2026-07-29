"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DateGroup } from "@/frontend/components/ui/date-group";
import { SearchBar } from "@/frontend/components/ui/search-bar";
import { TabBar } from "@/frontend/components/ui/tab-bar";
import { TransactionRow } from "@/frontend/components/ui/transaction-row";

export interface Transaction {
  id: string;
  address: string;
  memo?: string;
  amount: number;
  date: string;
  type: "in" | "out" | "request";
}

export type TransactionTab = "all" | "in" | "out" | "requests";

export interface TransactionListProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  transactions: Transaction[];
  searchQuery: string;
  activeTab: TransactionTab;
  onSearch: (query: string) => void;
  onTabChange: (tab: string) => void;
}

const TABS: { value: TransactionTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in", label: "Incoming" },
  { value: "out", label: "Outgoing" },
  { value: "requests", label: "Requests" },
];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getSectionLabel(date: Date, today: Date): string {
  const target = startOfDay(date);
  const todayStart = startOfDay(today);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (target.getTime() === todayStart.getTime()) return "TODAY";
  if (target.getTime() === yesterdayStart.getTime()) return "YESTERDAY";

  return date
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();
}

function formatTimestamp(date: Date, today: Date): string {
  const target = startOfDay(date);
  const todayStart = startOfDay(today);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  if (
    target.getTime() === todayStart.getTime() ||
    target.getTime() === yesterdayStart.getTime()
  ) {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
  });
}

function getDirection(
  transaction: Transaction
): "in" | "out" {
  if (transaction.type === "request") return "in";
  return transaction.type;
}

function matchesSearch(transaction: Transaction, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const addressMatch = transaction.address.toLowerCase().includes(normalized);
  const amountMatch = Math.abs(transaction.amount)
    .toFixed(2)
    .includes(normalized.replace(",", "."));

  return addressMatch || amountMatch;
}

function matchesTab(transaction: Transaction, tab: TransactionTab): boolean {
  if (tab === "all") return true;
  if (tab === "requests") return transaction.type === "request";
  return transaction.type === tab;
}

export function TransactionList({
  transactions,
  searchQuery,
  activeTab,
  onSearch,
  onTabChange,
  className,
  ...props
}: TransactionListProps) {
  const today = React.useMemo(() => new Date(), []);
  const tabLabels = TABS.map((tab) => tab.label);
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.value === activeTab)
  );

  const filteredTransactions = React.useMemo(() => {
    return transactions
      .filter((transaction) => matchesTab(transaction, activeTab))
      .filter((transaction) => matchesSearch(transaction, searchQuery))
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [transactions, activeTab, searchQuery]);

  const groupedTransactions = React.useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    for (const transaction of filteredTransactions) {
      const date = new Date(transaction.date);
      const label = getSectionLabel(date, today);
      const existing = groups.get(label) ?? [];
      existing.push(transaction);
      groups.set(label, existing);
    }

    return Array.from(groups.entries());
  }, [filteredTransactions, today]);

  return (
    <div
      data-slot="transaction-list"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    >
      <SearchBar value={searchQuery} onChange={onSearch} />

      <TabBar
        tabs={tabLabels}
        activeIndex={activeIndex}
        onChange={(index) => onTabChange(TABS[index].value)}
        className="w-full overflow-x-auto"
      />

      {groupedTransactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No transactions
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedTransactions.map(([sectionLabel, sectionTransactions]) => (
            <section key={sectionLabel} className="flex flex-col gap-2">
              <DateGroup label={sectionLabel} />

              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {sectionTransactions.map((transaction, index) => {
                  const date = new Date(transaction.date);

                  return (
                    <TransactionRow
                      key={transaction.id}
                      address={transaction.address}
                      memo={transaction.memo}
                      timestamp={formatTimestamp(date, today)}
                      amount={Math.abs(transaction.amount)}
                      direction={getDirection(transaction)}
                      className={cn(
                        "rounded-none border-0 bg-transparent px-4 py-3",
                        index > 0 && "border-t border-border"
                      )}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
