import type { GetEscrowsBySignerParams, IndexerEscrow } from "./types";

// Fetch seam for the escrow lists: calls /api/escrows, which proxies Trustless
// Work with the server-only key.

// The response has no total; we treat a full page as "there may be more".
const PAGE_SIZE = 10;

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
