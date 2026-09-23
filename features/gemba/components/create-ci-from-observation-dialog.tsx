"use client";

/**
 * Create Continuous Improvement from Gemba Observation
 * 
 * PHASE 5B — Cross-module workflow
 * 
 * Allows creating a Continuous Improvement record from a Gemba Opportunity observation.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/current-user";
import { createImprovement } from "@/features/five-s/continuous-improvement/store";
import type { ImprovementBenefitType, TimeUnit } from "@/features/five-s/continuous-improvement/types";
import { IMPROVEMENT_BENEFIT_TYPES } from "@/features/five-s/continuous-improvement/config";
import { canCreateImprovement } from "@/features/five-s/continuous-improvement/access";
import { useAdminUsers } from "@/features/five-s/administration/store";
import type { GembaObservation } from "@/features/gemba/types";
import { linkGembaObservationToImprovement } from "@/lib/gemba/gemba-relationships";

interface CreateCIFromGembaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  observation: GembaObservation;
  walkId: string;
  plant: string;
  zone: string;
  onCreated?: (improvementId: string) => void;
}

interface Field {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: Field) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export function CreateCIFromGembaDialog({
  open,
  onOpenChange,
  observation,
  walkId,
  plant,
  zone,
  onCreated,
}: CreateCIFromGembaProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((u) => u.id === currentUser.id);
  
  // Prefill from Gemba observation
  const [title, setTitle] = useState(observation.title || "");
  const [problem, setProblem] = useState(observation.description || "");
  const [expectedBenefit, setExpectedBenefit] = useState("");
  const [proposedImprovement, setProposedImprovement] = useState("");
  
  // CI-specific fields (user must provide)
  const [benefitType, setBenefitType] = useState<ImprovementBenefitType>("Other");
  const [proposedSaving, setProposedSaving] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("5");
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState<TimeUnit>("Days");
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const canCreate = canCreateImprovement(adminUser, currentUser);

  function handleClose() {
    if (creating) return;
    onOpenChange(false);
  }

  async function handleCreate() {
    if (!canCreate) {
      setError("You do not have permission to create Continuous Improvements.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!problem.trim()) {
      setError("Problem/Opportunity description is required.");
      return;
    }

    if (!expectedBenefit.trim()) {
      setError("Expected benefit is required.");
      return;
    }

    if (!proposedImprovement.trim()) {
      setError("Proposed improvement is required.");
      return;
    }

    if (!estimatedTime || isNaN(Number(estimatedTime)) || Number(estimatedTime) < 1) {
      setError("Valid estimated completion time is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // Create CI using canonical store command
      const improvement = createImprovement({
        title: title.trim(),
        issueDescription: problem.trim(),
        proposedImprovement: proposedImprovement.trim(),
        expectedBenefit: expectedBenefit.trim(),
        benefitType,
        proposedSaving: proposedSaving.trim() ? Number(proposedSaving) : undefined,
        estimatedTime: Number(estimatedTime),
        estimatedTimeUnit,
        plant,
        zone,
        memberIds: [],
        beforeEvidence: [],
      }, currentUser);

      if (!improvement) {
        setError("Failed to create Continuous Improvement. Please try again.");
        setCreating(false);
        return;
      }

      // Create Phase 4 relationship
      try {
        linkGembaObservationToImprovement(
          walkId,
          observation.id,
          improvement.id,
          observation.title
        );
      } catch (relationshipError) {
        console.error("Failed to create relationship after CI creation:", relationshipError);
        // CI was created successfully, but relationship failed
        // User can still access the CI record directly
        setError("Improvement created but linking failed. The improvement record is still valid.");
        // Continue to callback
      }

      // Success
      onOpenChange(false);
      if (onCreated) {
        onCreated(improvement.id);
      }

      // Navigate to the new CI record
      router.push(`/continuous-improvement/${improvement.id}`);
    } catch (err) {
      console.error("Failed to create Continuous Improvement:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create improvement"
      );
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            Create Continuous Improvement
          </DialogTitle>
          <DialogDescription>
            Create an improvement record from this Gemba observation. Review and
            complete the prefilled information below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title - prefilled from Gemba */}
          <Field label="Title *">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter improvement title"
              disabled={creating}
            />
          </Field>

          {/* Problem/Opportunity - prefilled from Gemba */}
          <Field label="Problem / Opportunity *">
            <Textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Describe the current problem or opportunity"
              disabled={creating}
              rows={4}
            />
          </Field>

          {/* Proposed Improvement - CI-specific field */}
          <Field label="Proposed Improvement *">
            <Textarea
              value={proposedImprovement}
              onChange={(e) => setProposedImprovement(e.target.value)}
              placeholder="Describe the proposed change or solution"
              disabled={creating}
              rows={4}
            />
          </Field>

          {/* Expected Benefit - CI-specific field */}
          <Field label="Expected Benefit *">
            <Textarea
              value={expectedBenefit}
              onChange={(e) => setExpectedBenefit(e.target.value)}
              placeholder="What measurable benefit will this improvement deliver?"
              disabled={creating}
              rows={3}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Benefit Type - CI-specific field */}
            <Field label="Benefit Type *">
              <Select
                value={benefitType}
                onValueChange={(value) => setBenefitType(value as ImprovementBenefitType)}
                disabled={creating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPROVEMENT_BENEFIT_TYPES.map((type: ImprovementBenefitType) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

          {/* Proposed Cost Saving - CI-specific field */}
            <Field label="Proposed Cost Saving (INR)">
              <Input
                type="number"
                min="0"
                value={proposedSaving}
                onChange={(e) => setProposedSaving(e.target.value)}
                placeholder="0"
                disabled={creating}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Estimated Time - CI-specific field */}
            <Field label="Estimated Completion Time *">
              <Input
                type="number"
                min="1"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
                disabled={creating}
              />
            </Field>

            <Field label="Time Unit *">
              <Select
                value={estimatedTimeUnit}
                onValueChange={(value) => setEstimatedTimeUnit(value as TimeUnit)}
                disabled={creating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Hours", "Days", "Weeks"] as TimeUnit[]).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-3 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">From Gemba Observation</p>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-200">
              {walkId} · {observation.id} · {observation.type}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Improvement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
