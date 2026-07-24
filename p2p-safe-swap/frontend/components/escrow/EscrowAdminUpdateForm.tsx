"use client";

import { Lock, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button/Button";
import { Reveal } from "@/frontend/components/motion/reveal";
import { cn } from "@/lib/utils";
import type { EscrowAdminUpdateFormProps, EscrowRoles } from "./types";
import { formatAmount, ROLE_LABELS } from "./utils";
import { useEscrowAdminForm } from "./useEscrowAdminForm";

const ROLE_KEYS = Object.keys(ROLE_LABELS) as (keyof EscrowRoles)[];

export function EscrowAdminUpdateForm({
  escrow,
  isAdmin,
  onSubmit,
  className,
}: EscrowAdminUpdateFormProps) {
  const {
    isFunded,
    amount,
    setAmount,
    platformFee,
    setPlatformFee,
    roles,
    updateRole,
    milestones,
    newMilestoneDescription,
    setNewMilestoneDescription,
    newMilestoneAmount,
    setNewMilestoneAmount,
    addMilestone,
    removeMilestone,
    isSubmitting,
    submitError,
    handleSubmit,
  } = useEscrowAdminForm({ escrow, onSubmit });

  if (!isAdmin) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center mt-10",
          className
        )}
      >
        <ShieldAlert className="text-muted-foreground" size={28} aria-hidden="true" />
        <p className="text-sm font-medium text-muted-foreground ">
          Esta acción solo está disponible para la wallet admin.
        </p>
      </div>
    );
  }

  return (
    <div
      data-slot="escrow-admin-update-form"
      className={cn("flex w-full flex-col gap-4 bg-background p-4 sm:p-6", className)}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-base font-semibold text-foreground">Editar términos del escrow</h1>
        <p className="font-mono text-xs text-muted-foreground">{escrow.contractId}</p>
      </header>

      <Reveal className="flex flex-col gap-4">
        {isFunded && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            <Lock size={16} aria-hidden="true" />
            Este escrow ya está fondeado: solo se pueden agregar milestones nuevos.
          </div>
        )}

        <section
          aria-label="Monto y comisión"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="escrow-amount" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Monto ({escrow.currency})
            </label>
            <input
              id="escrow-amount"
              type="number"
              inputMode="decimal"
              step="any"
              value={amount}
              disabled={isFunded}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-foreground tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="escrow-fee" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Fee de la plataforma (%)
            </label>
            <input
              id="escrow-fee"
              type="number"
              inputMode="decimal"
              step="any"
              value={platformFee}
              disabled={isFunded}
              onChange={(e) => setPlatformFee(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-foreground tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </section>

        <section
          aria-label="Roles del escrow"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Roles
          </span>
          {ROLE_KEYS.map((role) => (
            <div key={role} className="flex flex-col gap-1.5">
              <label htmlFor={`role-${role}`} className="text-xs text-muted-foreground">
                {ROLE_LABELS[role]}
              </label>
              <input
                id={`role-${role}`}
                type="text"
                value={roles[role]}
                disabled={isFunded}
                onChange={(e) => updateRole(role, e.target.value)}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          ))}
        </section>

        <section
          aria-label="Milestones"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Milestones
          </span>

          <div className="flex flex-col gap-2">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-medium text-foreground">
                    {milestone.description}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatAmount(milestone.amount)} {escrow.currency}
                  </span>
                </div>
                {!isFunded && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(milestone.id)}
                    aria-label={`Eliminar milestone ${milestone.description}`}
                    className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <label htmlFor="new-milestone-description" className="text-xs text-muted-foreground">
              Agregar milestone
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="new-milestone-description"
                type="text"
                placeholder="Descripción"
                value={newMilestoneDescription}
                onChange={(e) => setNewMilestoneDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={`Monto (${escrow.currency})`}
                value={newMilestoneAmount}
                onChange={(e) => setNewMilestoneAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm text-foreground tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-32"
              />
              <button
                type="button"
                onClick={addMilestone}
                aria-label="Agregar milestone"
                className="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-xl border border-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={16} aria-hidden="true" />
                Agregar
              </button>
            </div>
          </div>
        </section>

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          label={isSubmitting ? "Guardando..." : "Guardar cambios"}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        />
      </Reveal>
    </div>
  );
}
