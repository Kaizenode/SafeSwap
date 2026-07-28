export type EscrowStatus = "unfunded" | "funded" | "resolved";

export interface EscrowDistribution {
  address: string;
  amount: number;
}

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
  resolutionDistributions?: EscrowDistribution[];
}

export interface EscrowAdminUpdateFormProps {
  escrow: Escrow;
  isAdmin: boolean;
  onSubmit?: (payload: Escrow) => void;
  className?: string;
}
