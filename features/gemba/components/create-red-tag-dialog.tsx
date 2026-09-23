"use client";

/**
 * Create Red Tag from Gemba Observation
 * 
 * PHASE 5A — Cross-module workflow
 * 
 * Allows creating a Red Tag V2 record from a Gemba observation
 * involving a physical item.
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/current-user";
import { createRedTag, getNextTagNumber } from "@/features/five-s/red-tag/store";
import { RED_TAG_CATEGORIES, RED_TAG_REASONS, type RedTagCategory, type RedTagReason } from "@/features/five-s/red-tag/types";
import { canCreateRedTag } from "@/features/five-s/red-tag/access";
import type { GembaObservation } from "@/features/gemba/types";
import { linkGembaObservationToRedTag } from "@/lib/gemba/gemba-red-tag-relationship";

interface CreateRedTagFromGembaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  observation: GembaObservation;
  walkId: string;
  plant: string;
  zone: string;
  onCreated?: (redTagId: string) => void;
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

export function CreateRedTagFromGembaDialog({
  open,
  onOpenChange,
  observation,
  walkId,
  plant,
  zone,
  onCreated,
}: CreateRedTagFromGembaProps) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  
  // Prefill from Gemba observation
  const [itemName, setItemName] = useState(observation.title || "");
  const [quantity, setQuantity] = useState("1");
  const [section, setSection] = useState(observation.location || "");
  const [reason, setReason] = useState<RedTagReason | "">("");
  const [category, setCategory] = useState<RedTagCategory | "">("");
  const [remarks, setRemarks] = useState(observation.description || "");
  const [requiredAction, setRequiredAction] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const canCreate = canCreateRedTag(undefined); // Permission check - will show permission error if needed

  function handleClose() {
    if (creating) return;
    onOpenChange(false);
  }

  async function handleCreate() {
    if (!canCreate) {
      setError("You do not have permission to create Red Tags.");
      return;
    }

    if (!itemName.trim()) {
      setError("Item name is required.");
      return;
    }

    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) < 1) {
      setError("Valid quantity is required.");
      return;
    }

    if (!section.trim()) {
      setError("Section is required.");
      return;
    }

    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    if (!category) {
      setError("Category is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // Create Red Tag using canonical store command
      const redTag = createRedTag({
        plant,
        zone,
        section: section.trim(),
        itemName: itemName.trim(),
        quantity: Number(quantity),
        reason: reason as RedTagReason,
        category: category as RedTagCategory,
        remarks: remarks.trim(),
        requiredAction: requiredAction.trim() || undefined,
        estimatedValue: estimatedValue.trim() ? Number(estimatedValue) : undefined,
        createdById: currentUser.id,
        createdByName: currentUser.name,
        // Evidence will be handled separately if needed
        imageUrl: undefined,
      }, currentUser);

      if (!redTag) {
        setError("Failed to create Red Tag. Please try again.");
        setCreating(false);
        return;
      }

      // Create Phase 4 relationship
      try {
        linkGembaObservationToRedTag(
          walkId,
          observation.id,
          redTag.id,
          observation.title
        );
      } catch (relError) {
        // Relationship failure should not prevent Red Tag creation
        console.error("Failed to create Gemba → Red Tag relationship:", relError);
        // Continue - Red Tag was created successfully
      }

      // Success
      onCreated?.(redTag.id);
      onOpenChange(false);
      
      // Navigate to new Red Tag
      router.push(`/5s/red/${redTag.id}`);
    } catch (err) {
      console.error("Red Tag creation error:", err);
      setError("An unexpected error occurred. Please try again.");
      setCreating(false);
    }
  }

  if (!canCreate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Red Tag</DialogTitle>
            <DialogDescription>
              You do not have permission to create Red Tags.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            Create Red Tag from Observation
          </DialogTitle>
          <DialogDescription>
            Tag this item for 5S disposition. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-lg border bg-muted/[0.18] p-3">
            <p className="text-xs font-medium text-muted-foreground">From Gemba Observation</p>
            <p className="mt-1 text-sm font-semibold">{observation.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{observation.location}</p>
          </div>

          <Field label="Item Name *">
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="What item needs to be tagged?"
              disabled={creating}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity *">
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                disabled={creating}
              />
            </Field>

            <Field label="Section *">
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., Assembly Line A"
                disabled={creating}
              />
            </Field>
          </div>

          <Field label="Reason for Tag *">
            <Select value={reason} onValueChange={(value) => setReason(value as RedTagReason)} disabled={creating}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {RED_TAG_REASONS.map((reasonOption: RedTagReason) => (
                  <SelectItem key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Category *">
            <Select value={category} onValueChange={(value) => setCategory(value as RedTagCategory)} disabled={creating}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {RED_TAG_CATEGORIES.map((cat: RedTagCategory) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Remarks">
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              disabled={creating}
            />
          </Field>

          <Field label="Required Action">
            <Input
              value={requiredAction}
              onChange={(e) => setRequiredAction(e.target.value)}
              placeholder="What action should be taken?"
              disabled={creating}
            />
          </Field>

          <Field label="Estimated Value (₹)">
            <Input
              type="number"
              min="0"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="Optional"
              disabled={creating}
            />
          </Field>

          {observation.evidence.length > 0 && (
            <div className="rounded-lg border bg-muted/[0.18] p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Note: {observation.evidence.length} photo{observation.evidence.length === 1 ? "" : "s"} from the observation will be available in the Red Tag record.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={creating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1"
          >
            {creating ? "Creating..." : "Create Red Tag"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
