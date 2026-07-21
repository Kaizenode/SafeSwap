export type MessageAuthor = "self" | "counterpart";

export interface ChatMessageBase {
  id: string;
  timestamp: string | Date;
  author: MessageAuthor;
}

export interface TextMessage extends ChatMessageBase {
  type: "text";
  text: string;
  deliveryStatus?: "sent" | "delivered" | "read";
}

export type PaymentStatus =
  | "pending"
  | "completed"
  | "approved, ready for release"
  | "approved"
  | "rejected";

export interface PaymentMessage extends ChatMessageBase {
  type: "payment";
  amount: number;
  currency: string;
  memo?: string;
  status: PaymentStatus;
  receiptUrl?: string;
}

export interface PaymentRequestMessage extends ChatMessageBase {
  type: "request";
  amount: number;
  currency: string;
  memo?: string;
  status: PaymentStatus;
  contractId?: string;
  sellerAddress?: string;
}

export type ChatMessage = TextMessage | PaymentMessage | PaymentRequestMessage;
