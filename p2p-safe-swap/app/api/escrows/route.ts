import { NextRequest, NextResponse } from "next/server";
import {
  trustlessWork,
  TrustlessWorkApiError,
  type GetEscrowsBySignerParams,
} from "@/lib/trustless-work";

// GET /api/escrows?signer=...&type=single-release&status=...&page=...
//
// Server-side proxy for the Trustless Work `get-escrows-by-signer` endpoint.
// The call runs here so the x-api-key stays on the server and never reaches
// the browser. Returns the bare array of indexer escrows.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const signer = sp.get("signer");
  if (!signer || !signer.trim()) {
    return NextResponse.json({ error: "signer is required" }, { status: 400 });
  }

  const params: GetEscrowsBySignerParams = { signer: signer.trim() };

  const type = sp.get("type");
  if (type === "single-release" || type === "multi-release") params.type = type;

  const status = sp.get("status");
  if (status) params.status = status;

  const role = sp.get("role");
  if (role) params.role = role;

  const engagementId = sp.get("engagementId");
  if (engagementId) params.engagementId = engagementId;

  const isActive = sp.get("isActive");
  if (isActive === "true" || isActive === "false") params.isActive = isActive === "true";

  const orderBy = sp.get("orderBy");
  if (orderBy === "createdAt" || orderBy === "updatedAt" || orderBy === "amount") {
    params.orderBy = orderBy;
  }

  const orderDirection = sp.get("orderDirection");
  if (orderDirection === "asc" || orderDirection === "desc") {
    params.orderDirection = orderDirection;
  }

  const page = sp.get("page");
  if (page && /^\d+$/.test(page)) params.page = Number(page);

  try {
    const data = await trustlessWork.helper.getEscrowsBySigner(params);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof TrustlessWorkApiError) {
      return NextResponse.json({ error: error.details }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unable to load escrows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
