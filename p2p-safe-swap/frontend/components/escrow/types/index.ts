export type EscrowStatus = "unfunded" | "funded";

export interface EscrowRoles {
  approver: string;
  serviceProvider: string;
  releaseSigner: string;
  disputeResolver: string;
  receiver: string;
  platformAddress: string;
}

export interface EscrowMilestone {
  id: string;
  description: string;
  amount: number;
}

export interface Escrow {
  contractId: string;
  status: EscrowStatus;
  amount: number;
  currency: string;
  platformFee: number;
  roles: EscrowRoles;
  milestones: EscrowMilestone[];
}

export interface EscrowAdminUpdateFormProps {
  escrow: Escrow;
  isAdmin: boolean;
  onSubmit?: (payload: Escrow) => void;
  className?: string;
}
