import type { GetEscrowsBySignerParams, IndexerEscrow } from "./types";
import { deriveEscrowStatus } from "./status";
import { MOCK_ESCROWS } from "./mock";

// Single seam for fetching escrows. Today it filters/paginates the mock data
// client-side; once #306 / PR #324 lands, replace the body of
// `getEscrowsBySigner` with a real fetch to the proxied API route:
//
//   const res = await fetch(`/api/escrows?${new URLSearchParams(...)}`)
//   return res.json()
//
// The real Trustless Work call MUST stay server-side (the x-api-key never
// reaches the browser) — see #318 for the key handling. Hence the /api proxy.

const PAGE_SIZE = 10;

/** Mirrors the endpoint: page-based, returns a bare array (no total/envelope). */
export async function getEscrowsBySigner(
  params: GetEscrowsBySignerParams
): Promise<IndexerEscrow[]> {
  const {
    signer,
    type,
    status,
    role,
    engagementId,
    isActive,
    orderBy = "createdAt",
    orderDirection = "desc",
    page = 1,
  } = params;

  let rows = MOCK_ESCROWS.filter((e) => e.signer === signer || e.user === signer);

  if (type) rows = rows.filter((e) => e.type === type);
  if (status) rows = rows.filter((e) => deriveEscrowStatus(e) === status);
  if (engagementId) rows = rows.filter((e) => e.engagementId === engagementId);
  if (typeof isActive === "boolean") rows = rows.filter((e) => e.isActive === isActive);
  if (role) rows = rows.filter((e) => Boolean(e.roles[role]));

  rows = [...rows].sort((a, b) => {
    const av = orderBy === "amount" ? a.amount : Date.parse(a[orderBy]);
    const bv = orderBy === "amount" ? b.amount : Date.parse(b[orderBy]);
    return orderDirection === "asc" ? av - bv : bv - av;
  });

  const start = (page - 1) * PAGE_SIZE;
  return rows.slice(start, start + PAGE_SIZE);
}

export const ESCROWS_PAGE_SIZE = PAGE_SIZE;
