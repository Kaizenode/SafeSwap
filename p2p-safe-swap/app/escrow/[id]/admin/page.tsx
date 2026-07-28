"use client";

import { use, useState } from "react";
import { EscrowAdminUpdateForm } from "@/frontend/components/escrow/EscrowAdminUpdateForm";
import { ResolveDisputePanel } from "@/frontend/components/escrow/ResolveDisputePanel";
import type { Escrow } from "@/frontend/components/escrow/types";

const MOCK_ESCROW: Escrow = {
  contractId: "esc-diego-v",
  status: "funded",
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
const MOCK_IS_MODERATOR = true;

interface EscrowAdminPageProps {
  params: Promise<{ id: string }>;
}

export default function EscrowAdminPage({ params }: EscrowAdminPageProps) {
  const { id } = use(params);
  const [escrow, setEscrow] = useState<Escrow>({ ...MOCK_ESCROW, contractId: id });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <EscrowAdminUpdateForm
        escrow={escrow}
        isAdmin={MOCK_IS_ADMIN}
        onSubmit={(payload) => {
          console.log("Escrow update submitted:", payload);
        }}
      />
      <ResolveDisputePanel
        escrow={escrow}
        isModerator={MOCK_IS_MODERATOR}
        currentWalletAddress="GOPQ3RSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"
        onResolved={(updatedEscrow) => {
          setEscrow(updatedEscrow);
        }}
      />
    </main>
  );
}
