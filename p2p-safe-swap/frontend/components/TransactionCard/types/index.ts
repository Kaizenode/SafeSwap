
export type TransactionCardLang = "es" | "en";

export type TransactionCardMode = "buy" | "sell";

export interface TransactionCardProperties{
    user:string;
    address:string;
    rating:number;
    operationCount:number;
    price:number;
    available:number;
    minLimit:number;
    maxLimit:number;
    windowMinutes:number;
    paymentMethods:string[];
    lang?: TransactionCardLang;
    mode?: TransactionCardMode;
    onBuy:() => void;
    onSelect?: () => void;
}


