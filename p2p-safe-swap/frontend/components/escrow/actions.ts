"use server";

import { trustlessWork } from "@/lib/trustless-work";
import type { Escrow } from "./types";

export async function updateEscrowAction(escrow: Escrow) {
  return trustlessWork.escrow.update(escrow);
}
