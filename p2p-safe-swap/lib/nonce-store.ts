// TODO: swap for Redis once we have a binding — this is single-process,
// in-memory, and won't survive a restart or work across serverless replicas.

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const nonceStore = new Map<string, NonceEntry>();

function cleanupExpired() {
  const now = Date.now();
  for (const [address, entry] of nonceStore) {
    if (entry.expiresAt <= now) nonceStore.delete(address);
  }
}

export function createNonce(address: string): NonceEntry {
  cleanupExpired();
  const entry: NonceEntry = {
    nonce: crypto.randomUUID(),
    expiresAt: Date.now() + NONCE_TTL_MS,
  };
  nonceStore.set(address, entry);
  return entry;
}

export function peekNonce(address: string): NonceEntry | undefined {
  return nonceStore.get(address);
}

export function deleteNonce(address: string): void {
  nonceStore.delete(address);
}