"use client";

import { useState } from "react";
import { updateEscrowAction } from "./actions";
import type { Escrow, EscrowMilestone, EscrowRoles } from "./types";
import { createMilestoneId } from "./utils";

export interface UseEscrowAdminFormOptions {
  escrow: Escrow;
  onSubmit?: (payload: Escrow) => void;
}

export function useEscrowAdminForm({ escrow, onSubmit }: UseEscrowAdminFormOptions) {
  const isFunded = escrow.status === "funded";

  const [amount, setAmount] = useState(escrow.amount);
  const [platformFee, setPlatformFee] = useState(escrow.platformFee);
  const [roles, setRoles] = useState<EscrowRoles>(escrow.roles);
  const [milestones, setMilestones] = useState<EscrowMilestone[]>(escrow.milestones);
  const [newMilestoneDescription, setNewMilestoneDescription] = useState("");
  const [newMilestoneAmount, setNewMilestoneAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateRole(role: keyof EscrowRoles, value: string) {
    if (isFunded) return;
    setRoles((prev) => ({ ...prev, [role]: value }));
  }

  function addMilestone() {
    const parsedAmount = Number(newMilestoneAmount);
    if (!newMilestoneDescription.trim() || Number.isNaN(parsedAmount)) return;

    setMilestones((prev) => [
      ...prev,
      { id: createMilestoneId(), description: newMilestoneDescription.trim(), amount: parsedAmount },
    ]);
    setNewMilestoneDescription("");
    setNewMilestoneAmount("");
  }

  function removeMilestone(id: string) {
    if (isFunded) return;
    setMilestones((prev) => prev.filter((milestone) => milestone.id !== id));
  }

  async function handleSubmit() {
    const payload: Escrow = {
      ...escrow,
      amount: isFunded ? escrow.amount : amount,
      platformFee: isFunded ? escrow.platformFee : platformFee,
      roles: isFunded ? escrow.roles : roles,
      milestones,
    };

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { unsignedXdr } = await updateEscrowAction(payload);
      console.log("Escrow update unsignedXdr, ready to sign:", unsignedXdr);
      onSubmit?.(payload);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo actualizar el escrow");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
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
  };
}
