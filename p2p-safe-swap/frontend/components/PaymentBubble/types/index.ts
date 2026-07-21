export type PaymentBubbleLang    = "es" | "en";
export type PaymentBubbleSide    = "sender" | "receiver";
export type PaymentBubbleVariant = "sent" | "request";
export type PaymentBubbleStatus  = "completed" | "pending" | "rejected" | "approved, ready for release" | "approved";

export interface PaymentBubbleProperties {
  amount:    number;
  currency:  string;
  memo?:     string;
  variant:   PaymentBubbleVariant;
  status:    PaymentBubbleStatus;
  side:      PaymentBubbleSide;
  lang?:     PaymentBubbleLang;
  onPay?:          () => void;
  onReject?:       () => void;
  onViewReceipt?:  () => void;
}
