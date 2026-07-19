export type OrderMode = "buy" | "sell";

export interface CurrencyPair {
  base: string;
  quote: string;
}

export interface OrderUser {
  name: string;
  initials: string;
  verified: boolean;
  rating: number;
  opsCount: number;
  address: string;
}

export interface OrderLimits {
  min: number;
  max: number;
}

export interface P2POrder {
  id: string;
  user: OrderUser;
  price: number;
  currencyPair: CurrencyPair;
  available: number;
  limits: OrderLimits;
  windowMinutes: number;
  paymentMethods: string[];
  /** Amount in the traded asset that will be locked in escrow. */
  escrowAmount?: number;
  /** Trustline for the traded asset (e.g. USDT or USDC on Stellar). */
  trustline?: { address: string; symbol: string };
  /** Populated after the seller accepts and the escrow is deployed on-chain. */
  escrowContractId?: string;
}

