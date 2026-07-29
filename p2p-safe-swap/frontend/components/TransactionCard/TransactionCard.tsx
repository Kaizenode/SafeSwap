'use client'
import { Clock, Copy, Check } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { TransactionCardProperties } from "./types";
import { formatNumber, getInitials, translations, truncateAddress } from "./utils";
import { Button } from "../ui/Button/Button";



export function TransactionCard({
  user,
  address,
  rating,
  operationCount,
  price,
  available,
  minLimit,
  maxLimit,
  windowMinutes,
  paymentMethods,
  lang = "en",
  mode = "buy",
  onBuy,
  onSelect,
}: TransactionCardProperties) {
  const [copied, setCopied] = useState(false);
  const t = translations[lang];

  function handleCopyAddress(e: MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={`bg-card rounded-2xl border border-border p-5 flex flex-col gap-5 w-full shadow-sm ${
        onSelect
          ? "cursor-pointer transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          : ""
      }`}
    >

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <span className="text-secondary-foreground font-bold text-sm">{getInitials(user)}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1.5 group cursor-pointer"
                title={address}
              >
                <span className="font-bold text-foreground text-base leading-tight font-mono">
                  {truncateAddress(address)}
                </span>
                {copied
                  ? <Check size={14} className="text-primary shrink-0" />
                  : <Copy size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                }
              </button>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary shrink-0"
                aria-hidden="true"
              >
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-0.5">
              <span>★ {rating}</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{operationCount} ops</span>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="font-bold text-foreground text-xl sm:text-3xl leading-tight">{price}</p>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">EUR / USDT</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs sm:text-sm">{t.available}</span>
            <span className="font-semibold text-foreground text-xs sm:text-sm">{formatNumber(available)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs sm:text-sm">{t.window}</span>
            <div className="flex items-center gap-1 text-foreground">
              <Clock size={13} className="text-foreground shrink-0" />
              <span className="text-xs sm:text-sm">{windowMinutes} min</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs sm:text-sm">{t.limits}</span>
          <span className="font-semibold text-foreground text-xs sm:text-sm">{minLimit} – {maxLimit} €</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
         {paymentMethods.map((name, index)=>
           <span key={index} className="border bg-muted border-border rounded-full px-4 py-1.5 text-sm text-muted-foreground font-medium">
            {name}
          </span>
        )}


        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="primary" label={mode === "sell" ? t.sell : t.buy} onClick={onBuy} />
        </div>
      </div>

    </div>
  );
}
