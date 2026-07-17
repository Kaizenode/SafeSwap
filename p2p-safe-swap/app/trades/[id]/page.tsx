"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button/Button";
import { WalletBadge } from "@/frontend/components/ui/wallet-badge";
import { Reveal } from "@/frontend/components/motion/reveal";
import {
  EscrowStepper,
  type EscrowStep,
} from "@/frontend/components/trade/escrow-stepper";

interface TradeStatusPageProps {
  params: Promise<{ id: string }>;
}

interface MockTrade {
  amount: number;
  currency: string;
  counterparty: { name: string; address: string };
  contractId: string;
}

const MOCK_TRADE: MockTrade = {
  amount: 240,
  currency: "USDC",
  counterparty: {
    name: "Lucía Méndez",
    address: "GA5X4B7ZQR3VWJN6UYQF2E8H9K1D3M2L7P0T4C6VXZWQERTY8UIOP12A",
  },
  contractId: "CDN3B7ZQR3VWJN6UYQF2E8H9K1D3M2L7P0T4C6V",
};

function buildMockSteps(): EscrowStep[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

  return [
    {
      key: "initiated",
      label: "Iniciado",
      description: "Contrato de escrow creado en Stellar",
      status: "completed",
      timestamp: hoursAgo(26),
    },
    {
      key: "funded",
      label: "Financiado",
      description: "USDC bloqueados en el contrato",
      status: "current",
      timestamp: hoursAgo(3),
    },
    {
      key: "released",
      label: "Liberado",
      description: "A la espera de confirmación de la contraparte",
      status: "pending",
    },
  ];
}

type PrimaryAction = {
  label: string;
  action: "fund" | "release" | "noop";
};

function getPrimaryAction(currentKey: string | undefined): PrimaryAction {
  switch (currentKey) {
    case "initiated":
      return { label: "Financiar escrow", action: "fund" };
    case "funded":
      return { label: "Liberar fondos", action: "release" };
    default:
      return { label: "Ver detalles", action: "noop" };
  }
}

function shortAddress(value: string): string {
  if (value.length <= 10) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export default function TradeStatusPage({ params }: TradeStatusPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const [steps] = React.useState<EscrowStep[]>(() => buildMockSteps());

  const currentStep = steps.find((s) => s.status === "current");
  const primary = getPrimaryAction(currentStep?.key);
  const disputeDisabled = currentStep === undefined;

  const handlePrimary = () => {
    console.log("[escrow] primary action:", {
      tradeId: id,
      action: primary.action,
    });
  };

  const handleDispute = () => {
    console.log("[escrow] dispute opened", { tradeId: id });
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          aria-label="Volver"
          onClick={() => router.back()}
          className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-5" />
        </button>

        <h1 className="text-lg font-semibold text-foreground">
          Estado de la operación
        </h1>

        <span className="size-10" aria-hidden />
      </header>

      <Reveal className="flex flex-col gap-6">
        <section
          aria-label="Resumen de la operación"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <WalletBadge address={MOCK_TRADE.counterparty.address} />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-semibold text-foreground">
                {MOCK_TRADE.counterparty.name}
              </span>
              <span
                className="text-xs text-muted-foreground"
                title={MOCK_TRADE.counterparty.address}
              >
                {shortAddress(MOCK_TRADE.counterparty.address)}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-bold tabular-nums text-foreground leading-none">
                {MOCK_TRADE.amount.toLocaleString("es-AR")}
              </span>
              <span className="mt-1 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                {MOCK_TRADE.currency}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
            <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="text-xs font-medium text-muted-foreground">
              Contrato
            </span>
            <code
              className="ml-auto font-mono text-xs text-foreground"
              title={MOCK_TRADE.contractId}
            >
              {shortAddress(MOCK_TRADE.contractId)}
            </code>
          </div>
        </section>

        <section
          aria-labelledby="escrow-stepper-heading"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2
            id="escrow-stepper-heading"
            className="mb-4 text-sm font-semibold text-foreground"
          >
            Progreso del escrow
          </h2>
          <EscrowStepper steps={steps} />
        </section>

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            label={primary.label}
            onClick={handlePrimary}
            aria-label={primary.label}
            className="w-full"
          />
          <Button
            variant="danger"
            size="lg"
            label="Abrir disputa"
            onClick={handleDispute}
            aria-label="Abrir disputa"
            disabled={disputeDisabled}
            className="w-full"
          />
        </div>
      </Reveal>
    </div>
  );
}
