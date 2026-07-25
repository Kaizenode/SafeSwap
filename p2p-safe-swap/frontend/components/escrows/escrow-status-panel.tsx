"use client";

import * as React from "react";
import { useWallet } from "@/frontend/components/wallet";
import { TabBar } from "@/frontend/components/ui/tab-bar";
import { useEscrows } from "./use-escrows";
import { deriveEscrowStatus } from "./status";
import { EscrowStatusBadge } from "./status-badge";
import type { EscrowStatus } from "./types";

function shortAddress(address: string): string {
  return address.length <= 12 ? address : `${address.slice(0, 4)}…${address.slice(-4)}`;
}

// Status filter, wired to the endpoint `status` param. The enum values sent to
// the API (pending/funded/disputed/released) are our assumed SingleRelease
// status names; confirm them against the live API once a key is available.
const STATUS_TABS: { label: string; value?: EscrowStatus }[] = [
  { label: "Todos" },
  { label: "Pendiente", value: "pending" },
  { label: "Financiado", value: "funded" },
  { label: "En disputa", value: "disputed" },
  { label: "Liberado", value: "released" },
];

/**
 * Live status of the connected wallet's escrows, shown on the orders page.
 *
 * This is additive: it sits above the marketplace order list and does not
 * replace it. The marketplace browse + trade/chat flow keeps working; this
 * panel is what satisfies the "show live escrow status per order" criterion of
 * issue #316. How the marketplace list and a user's escrows should ultimately
 * relate is a product decision left for the maintainer.
 */
export function EscrowStatusPanel() {
  const { address } = useWallet();
  const [statusIndex, setStatusIndex] = React.useState(0);
  const status = STATUS_TABS[statusIndex].value;

  const { escrows, isLoading, error, page, setPage, hasNextPage, hasPrevPage } =
    useEscrows(address, { type: "single-release", status });

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
      ) : escrows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aún no tienes escrows.
        </p>
      ) : (
        <>
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {escrows.map((escrow, index) => {
              const counterparty = escrow.roles.receiver;
              return (
                <li
                  key={escrow.contractId ?? escrow.engagementId}
                  className={index > 0 ? "border-t border-border" : undefined}
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {escrow.title || shortAddress(counterparty)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {escrow.amount} {escrow.trustline.symbol}
                      </p>
                    </div>
                    <EscrowStatusBadge status={deriveEscrowStatus(escrow)} />
                  </div>
                </li>
              );
            })}
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
