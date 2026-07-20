// Browser-only wrapper around Stellar Wallets Kit (@creit.tech/stellar-wallets-kit).
//
// This is CONNECT-ONLY — it never creates or custodies a wallet; it opens the
// kit's modal so the user picks an external Stellar wallet (Freighter, xBull,
// Albedo, Lobstr, Rabet, Hana, …) and returns that wallet's public key, which
// is the `signer` the escrow endpoints need.
//
// IMPORTANT: the kit touches browser globals / custom elements at load, so this
// module must only ever be reached via a dynamic import() from a client effect
// — never imported at the top level of a component (would break SSR).

import { StellarWalletsKit, Networks, KitEventType } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";

let initialized = false;

/**
 * Initialize the kit once. TESTNET matches the Trustless Work dev API base URL
 * the app targets (dev.api.trustlesswork.com). The kit persists the selected
 * wallet + address in localStorage, so a returning user is auto-restored via
 * the STATE_UPDATED event (see subscribe()).
 */
function ensureInit(): void {
  if (initialized) return;
  StellarWalletsKit.init({
    network: Networks.TESTNET,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
    ],
  });
  initialized = true;
}

/** Open the wallet-picker modal; resolves to the selected wallet's address. */
export async function connectWallet(): Promise<string> {
  ensureInit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

/** Current address in kit memory, or null if none is connected. */
export async function getActiveAddress(): Promise<string | null> {
  ensureInit();
  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to connection state. The callback fires on connect, disconnect, and
 * once at launch (restoring any persisted session). Returns an unsubscribe fn.
 */
export function subscribe(callback: (address: string | null) => void): () => void {
  ensureInit();
  return StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
    callback(event.payload.address ?? null);
  });
}

/** Clear the active wallet connection. */
export async function disconnectWallet(): Promise<void> {
  ensureInit();
  await StellarWalletsKit.disconnect();
}
