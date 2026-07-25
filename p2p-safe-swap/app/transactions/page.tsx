"use client";

import * as React from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import {
  TransactionList,
  type Transaction,
  type TransactionTab,
} from "@/frontend/components/ui/transaction-list";
import { ConnectWalletButton, useWallet } from "@/frontend/components/wallet";
import {
  useEscrows,
  escrowToTransaction,
  type Role,
} from "@/frontend/components/escrows";

// Maps the direction tabs to the endpoint `role` filter. "in" is the receiver,
// "out" is the service provider (the payer into escrow in this P2P model).
// "all" and "requests" apply no role filter.
const TAB_ROLE: Partial<Record<TransactionTab, Role>> = {
  in: "receiver",
  out: "serviceProvider",
};

export default function TransactionsPage() {
  const { address } = useWallet();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TransactionTab>("all");

  const { escrows, isLoading, error, page, setPage, hasNextPage, hasPrevPage } =
    useEscrows(address, { type: "single-release", role: TAB_ROLE[activeTab] });

  const transactions: Transaction[] = React.useMemo(
    () => (address ? escrows.map((e) => escrowToTransaction(e, address)) : []),
    [escrows, address]
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background px-4 py-6">
      <div className="mb-4 flex justify-end">
        <ConnectWalletButton />
      </div>

      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          aria-label="Volver"
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>

        <h1 className="text-lg font-semibold text-foreground">Transacciones</h1>

        <button
          type="button"
          aria-label="Filtrar transacciones"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </header>

      {!address ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Conecta tu wallet para ver tus transacciones.
        </p>
      ) : isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Cargando transacciones…
        </p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-500">
          No se pudieron cargar las transacciones: {error.message}
        </p>
      ) : (
        <>
          <TransactionList
            transactions={transactions}
            searchQuery={searchQuery}
            activeTab={activeTab}
            onSearch={setSearchQuery}
            onTabChange={(tab) => setActiveTab(tab as TransactionTab)}
          />

          {(hasPrevPage || hasNextPage) && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={!hasPrevPage}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-muted-foreground">Página {page}</span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
