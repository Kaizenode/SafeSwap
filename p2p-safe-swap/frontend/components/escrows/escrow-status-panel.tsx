"use client";

import * as React from "react";
import { useWallet } from "@/frontend/components/wallet";
import { TabBar } from "@/frontend/components/ui/tab-bar";
import { useEscrows } from "./use-escrows";
import { escrowToOrder } from "./adapters";
import { EscrowStatusBadge } from "./status-badge";
import type { EscrowStatus } from "./types";

// Filtering is client-side on the derived status: the live API 400s on filter
// params like `role`, so we do not rely on a server-side `status` filter.
const STATUS_TABS: { label: string; value?: EscrowStatus }[] = [
  { label: "Todos" },
  { label: "Pendiente", value: "pending" },
  { label: "Financiado", value: "funded" },
  { label: "En disputa", value: "disputed" },
  { label: "Liberado", value: "released" },
];

// Additive panel above the marketplace list: shows the connected wallet's
// escrows with a status badge (issue #316), without touching the marketplace.
export function EscrowStatusPanel() {
  const { address } = useWallet();
  const [statusIndex, setStatusIndex] = React.useState(0);
  const status = STATUS_TABS[statusIndex].value;

  const { escrows, isLoading, error, page, setPage, hasNextPage, hasPrevPage } =
    useEscrows(address, { type: "single-release" });

  const orders = React.useMemo(
    () => (address ? escrows.map((e) => escrowToOrder(e, address)) : []),
    [escrows, address]
  );
  const shown = status ? orders.filter((o) => o.status === status) : orders;

  if (!address) return null; // the connect button already prompts the user

  return (
    <section className="px-4 pt-4">
      <h2 className="mb-2 text-sm font-semibold text-foreground">Mis escrows</h2>

      <TabBar
        tabs={STATUS_TABS.map((tab) => tab.label)}
        activeIndex={statusIndex}
        onChange={setStatusIndex}
        className="mb-3 w-full overflow-x-auto"
      />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Cargando escrows…</p>
      ) : error ? (
        <p className="py-6 text-center text-sm text-red-500">
          No se pudieron cargar los escrows: {error.message}
        </p>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aún no tienes escrows.
        </p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay escrows con este estado.
        </p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {shown.map((order, index) => (
              <li
                key={order.id}
                className={index > 0 ? "border-t border-border" : undefined}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {order.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.limits.max} {order.currencyPair.base}
                    </p>
                  </div>
                  <EscrowStatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>

          {(hasPrevPage || hasNextPage) && (
            <div className="mt-3 flex items-center justify-between">
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
    </section>
  );
}
