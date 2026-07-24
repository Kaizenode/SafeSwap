import type { EscrowRoles } from "../types";

export const ROLE_LABELS: Record<keyof EscrowRoles, string> = {
  approver: "Aprobador",
  serviceProvider: "Proveedor de servicio",
  releaseSigner: "Firmante de liberación",
  disputeResolver: "Resolutor de disputas",
  receiver: "Receptor",
  platformAddress: "Dirección de la plataforma",
};

export function formatAmount(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export function createMilestoneId() {
  return `ms-${crypto.randomUUID()}`;
}
