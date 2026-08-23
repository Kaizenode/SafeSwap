import { PaymentBubbleLang } from "../types";

export const translations = {
  es: {
    sent:       "PAGO ENVIADO",
    request:    "SOLICITUD DE PAGO",
    completed:  "Completado",
    pending:    "Pendiente",
    rejected:   "Rechazado",
    approved:   "Aprobado, listo para liberar",
    viewReceipt:"Ver recibo",
    reject:     "Rechazar",
    pay:        "Pagar",
    approve:    "Aprobar",
  },
  en: {
    sent:       "PAYMENT SENT",
    request:    "PAYMENT REQUEST",
    completed:  "Completed",
    pending:    "Pending",
    rejected:   "Rejected",
    approved:   "Approved, ready for release",
    viewReceipt:"View receipt",
    reject:     "Reject",
    pay:        "Pay",
    approve:    "Approve",
  },
} satisfies Record<PaymentBubbleLang, object>;

export function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}
