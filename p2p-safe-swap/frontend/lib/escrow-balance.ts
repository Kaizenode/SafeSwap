"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface EscrowBalance {
  address: string;
  balance: number;
}

interface GetEscrowBalancesResponse {
  balances?: EscrowBalance[];
}

interface ErrorResponse {
  error?: string;
}

export class EscrowBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EscrowBalanceError";
  }
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as ErrorResponse;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchEscrowBalances(
  addresses: string[],
  init?: RequestInit
): Promise<EscrowBalance[]> {
  const unique = Array.from(new Set(addresses.map((a) => a.trim()).filter(Boolean)));
  if (unique.length === 0) return [];

  const params = new URLSearchParams();
  for (const address of unique) params.append("addresses[]", address);

  const response = await fetch(
    `/api/helper/get-multiple-escrow-balance?${params.toString()}`,
    { method: "GET", ...init }
  );

  if (!response.ok) {
    throw new EscrowBalanceError(await readError(response));
  }

  const body = (await response.json()) as GetEscrowBalancesResponse;
  return body.balances ?? [];
}

export interface UseEscrowBalancesResult {
  balances: EscrowBalance[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEscrowBalances(addresses: string[]): UseEscrowBalancesResult {
  const key = useMemo(
    () => Array.from(new Set(addresses.map((a) => a.trim()).filter(Boolean))).sort().join(","),
    [addresses]
  );

  const [balances, setBalances] = useState<EscrowBalance[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!key) {
      setBalances(null);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const list = await fetchEscrowBalances(key.split(","), { signal: controller.signal });
      if (!controller.signal.aborted) setBalances(list);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Unable to load escrow balance";
      setError(message);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [key]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { balances, isLoading, error, refetch: load };
}

export interface UseEscrowBalanceResult {
  balance: number | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEscrowBalance(address: string | null | undefined): UseEscrowBalanceResult {
  const addresses = useMemo(() => (address ? [address] : []), [address]);
  const { balances, isLoading, error, refetch } = useEscrowBalances(addresses);
  const balance = useMemo(() => {
    if (!address || !balances) return null;
    return balances.find((entry) => entry.address === address)?.balance ?? null;
  }, [address, balances]);
  return { balance, isLoading, error, refetch };
}

export interface DistributionEntry {
  address: string;
  amount: number;
}

export interface DistributionValidationResult {
  isValid: boolean;
  onChainBalance: number;
  distributedTotal: number;
  difference: number;
  message: string | null;
}

/**
 * The single-release resolve-dispute contract call reverts unless the sum of
 * `distributions[].amount` equals the on-chain escrow balance. Consumers must
 * call this before invoking `resolveDispute` (issue 09).
 */
export function validateDistributionsAgainstBalance(
  distributions: DistributionEntry[],
  onChainBalance: number,
  epsilon = 1e-6
): DistributionValidationResult {
  const distributedTotal = distributions.reduce((sum, item) => sum + item.amount, 0);
  const difference = distributedTotal - onChainBalance;
  const isValid = Math.abs(difference) <= epsilon;

  return {
    isValid,
    onChainBalance,
    distributedTotal,
    difference,
    message: isValid
      ? null
      : `Distributions total ${distributedTotal} does not match on-chain balance ${onChainBalance}`,
  };
}
