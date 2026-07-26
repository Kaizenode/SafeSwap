// Connect-only wrapper around Stellar Wallets Kit: opens the modal to pick an
// external wallet and returns its public key (the escrow `signer`).
//
// The kit touches browser globals at load, so reach this module ONLY via a
// dynamic import() from a client effect — never a top-level import (breaks SSR).

import { StellarWalletsKit, Networks, KitEventType } from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";

let initialized = false;

// Init once. TESTNET matches the Trustless Work dev API. The kit persists the
// session in localStorage, restored via the STATE_UPDATED event (see subscribe).
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

// Open the wallet-picker modal; resolves to the selected wallet's address.
export async function connectWallet(): Promise<string> {
  ensureInit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

export async function getActiveAddress(): Promise<string | null> {
  ensureInit();
  try {
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// Fires on connect, disconnect, and once at launch (restoring a persisted
// session). Returns an unsubscribe fn.
export function subscribe(callback: (address: string | null) => void): () => void {
  ensureInit();
  return StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
    callback(event.payload.address ?? null);
  });
}

export async function disconnectWallet(): Promise<void> {
  ensureInit();
  await StellarWalletsKit.disconnect();
}
