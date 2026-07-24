"use client";

import { use } from "react";
import { EscrowAdminUpdateForm } from "@/frontend/components/escrow/EscrowAdminUpdateForm";
import type { Escrow } from "@/frontend/components/escrow/types";

const MOCK_ESCROW: Escrow = {
  contractId: "esc-diego-v",
  status: "unfunded",
  amount: 1500,
  currency: "USDC",
  platformFee: 1.5,
  roles: {
    approver: "GABC3DEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQR",
    serviceProvider: "GXYZ3ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNO",
    releaseSigner: "GLMN3OPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ012",
    disputeResolver: "GOPQ3RSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ012345",
    receiver: "GRST3UVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567",
    platformAddress: "GUVW3XYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789A",
  },
  milestones: [
    { id: "ms-1", description: "Entrega inicial", amount: 500 },
    { id: "ms-2", description: "Entrega final", amount: 1000 },
  ],
};

const MOCK_IS_ADMIN = true;

interface EscrowAdminPageProps {
  params: Promise<{ id: string }>;
}

export default function EscrowAdminPage({ params }: EscrowAdminPageProps) {
  const { id } = use(params);
  const escrow: Escrow = { ...MOCK_ESCROW, contractId: id };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <EscrowAdminUpdateForm
        escrow={escrow}
        isAdmin={MOCK_IS_ADMIN}
        onSubmit={(payload) => {
          console.log("Escrow update submitted:", payload);
        }}
      />
    </main>
  );
}
