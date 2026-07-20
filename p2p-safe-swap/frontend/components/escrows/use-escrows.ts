"use client";

import * as React from "react";
import type { GetEscrowsBySignerParams, IndexerEscrow } from "./types";
import { getEscrowsBySigner, ESCROWS_PAGE_SIZE } from "./client";

type Filters = Omit<GetEscrowsBySignerParams, "signer" | "page">;

export type UseEscrowsResult = {
  escrows: IndexerEscrow[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  setPage: (page: number) => void;
  /** True when a full page came back — there may be more. No total is returned. */
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/**
 * Fetches the connected wallet's escrows with filtering + page-based pagination.
 * A null/empty `signer` (no wallet connected yet — see the unowned
 * wallet-connect gap) yields an empty, non-loading result.
 *
 * State is only ever set from async callbacks, and `page`/`isLoading` are
 * derived — no synchronous setState in effects, no ref mutation in render
 * (both banned by the repo's React Compiler lint rules).
 */
export function useEscrows(
  signer: string | null | undefined,
  filters: Filters = {}
): UseEscrowsResult {
  const filtersKey = JSON.stringify(filters);
  const queryKey = `${signer ?? ""}::${filtersKey}`;

  // Page is scoped to a query identity: when signer/filters change, the stored
  // key no longer matches and `page` derives back to 1 — no reset effect needed.
  const [pageState, setPageState] = React.useState({ key: queryKey, page: 1 });
  const page = pageState.key === queryKey ? pageState.page : 1;
  const setPage = React.useCallback(
    (next: number) => setPageState({ key: queryKey, page: next }),
    [queryKey]
  );

  const [escrows, setEscrows] = React.useState<IndexerEscrow[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  // Identity of the last request that finished; compare with the current
  // request identity to derive `isLoading` without a synchronous setState.
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null);

  const requestKey = `${queryKey}::${page}`;

  React.useEffect(() => {
    if (!signer) return; // nothing to fetch; derived empties below

    let cancelled = false;

    getEscrowsBySigner({ signer, page, ...(JSON.parse(filtersKey) as Filters) })
      .then((rows) => {
        if (cancelled) return;
        setEscrows(rows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [signer, page, filtersKey, requestKey]);

  const active = Boolean(signer);
  return {
    escrows: active ? escrows : [],
    isLoading: active && loadedKey !== requestKey,
    error: active ? error : null,
    page,
    setPage,
    hasNextPage: active && loadedKey === requestKey && escrows.length === ESCROWS_PAGE_SIZE,
    hasPrevPage: active && page > 1,
  };
}
