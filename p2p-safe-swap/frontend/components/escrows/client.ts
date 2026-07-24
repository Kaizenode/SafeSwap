import type { GetEscrowsBySignerParams, IndexerEscrow } from "./types";

// Single fetch seam for the escrow lists. Calls the server route
// (/api/escrows) which proxies Trustless Work with the server-only key.
//
// For local mock data (before an API key / real signer is available), see
// mock.ts + the MOCK_ESCROWS export — swap this body back if you need to demo
// the UI offline.

// The endpoint has no `total` in its response, and its server-side page size is
// not documented. We treat a returned page of this length as "there may be
// more" for the Next/Prev controls; reconcile once the real page size is known.
const PAGE_SIZE = 10;

/** Page-based; returns the bare array of indexer escrows for the signer. */
export async function getEscrowsBySigner(
  params: GetEscrowsBySignerParams
): Promise<IndexerEscrow[]> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const res = await fetch(`/api/escrows?${search.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const detail = body?.error ? String(body.error) : `status ${res.status}`;
    throw new Error(`Failed to load escrows: ${detail}`);
  }

  return (await res.json()) as IndexerEscrow[];
}

export const ESCROWS_PAGE_SIZE = PAGE_SIZE;
