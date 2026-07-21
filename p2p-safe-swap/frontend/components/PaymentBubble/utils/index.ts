import { PaymentBubbleLang } from "../types";

export const translations = {
  es: {
    sent:       "PAGO ENVIADO",
    request:    "SOLICITUD DE PAGO",
    completed:  "Completado",
    pending:    "Pendiente",
    rejected:   "Rechazado",
    viewReceipt:"Ver recibo",
    reject:     "Rechazar",
    pay:        "Aceptar",
    approvedReady: "approved, ready for release",
  },
  en: {
    sent:       "PAYMENT SENT",
    request:    "PAYMENT REQUEST",
    completed:  "Completed",
    pending:    "Pending",
    rejected:   "Rejected",
    viewReceipt:"View receipt",
    reject:     "Reject",
    pay:        "Accept",
    approvedReady: "approved, ready for release",
  },
} satisfies Record<PaymentBubbleLang, object>;

export function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}
