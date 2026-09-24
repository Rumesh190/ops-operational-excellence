import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ADMIN_USER_SEEDS } from "@/features/five-s/administration/store";
import { improvementOwnerDisplayName, selectableImprovementOwners } from "@/features/five-s/continuous-improvement/owner";
import { DEMO_USERS } from "@/lib/current-user";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const newPage = source("features/five-s/continuous-improvement/new-page.tsx");
const editPage = source("features/five-s/continuous-improvement/edit-page.tsx");
const gembaDialog = source("features/gemba/components/create-ci-from-observation-dialog.tsx");
const storeSource = source("features/five-s/continuous-improvement/store.ts");
const detailSource = source("features/five-s/continuous-improvement/detail-page.tsx");
const reportSource = source("features/five-s/continuous-improvement/report-page.tsx");

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => values.delete(key), key: (index: number) => [...values.keys()][index] ?? null, clear: () => values.clear(), get length() { return values.size; } };
}

async function ciStore() {
  vi.resetModules();
  const localStorage = storage();
  vi.stubGlobal("window", { localStorage, alert: vi.fn() });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("crypto", { randomUUID: () => "owner-test" });
  return import("@/features/five-s/continuous-improvement/store");
}

afterEach(() => vi.unstubAllGlobals());

describe("Team Feedback #31 — canonical Continuous Improvement Owner", () => {
  it("uses one stable ownerId selected from active canonical users", () => {
    const owners = selectableImprovementOwners(ADMIN_USER_SEEDS, DEMO_USERS.responsible.plant, DEMO_USERS.responsible.primaryZone);
    expect(owners.length).toBeGreaterThan(1);
    expect(owners.every((owner) => owner.status === "Active" && owner.permissions.includes("ci.implement"))).toBe(true);
    expect(newPage).toContain('Field label="Owner *"');
    expect(newPage).toContain("ownerId");
    expect(newPage).not.toContain('<Field label="Owner"><Input value={currentUser.name} disabled /></Field>');
  });

  it("keeps creator as an editable default rather than conflating creator and owner", () => {
    expect(newPage).toContain("owner.id === currentUser.id) ? currentUser.id : ownerOptions[0]?.id");
    expect(newPage).toContain('Field label="Proposed By"');
    expect(editPage).toContain('Field label="Created By"');
    expect(detailSource).toContain('Meta label="Proposed By"');
    expect(detailSource).toContain('Meta label="Owner"');
  });

  it("applies the same owner selector and canonical input to Gemba-created CI", () => {
    expect(gembaDialog).toContain("selectableImprovementOwners");
    expect(gembaDialog).toContain('Field label="Owner *"');
    expect(gembaDialog).toContain("ownerId,");
    expect(gembaDialog).toContain("linkGembaObservationToImprovement");
  });

  it("creates with a distinct owner ID and preserves proposed-by identity", async () => {
    const store = await ciStore();
    const creator = DEMO_USERS.responsible;
    const owner = selectableImprovementOwners(ADMIN_USER_SEEDS, creator.plant, creator.primaryZone).find((candidate) => candidate.id !== creator.id)!;
    const item = store.createImprovement({ title: "Owner test", zone: creator.primaryZone, issueDescription: "Current condition", proposedImprovement: "Improve it", expectedBenefit: "Less delay", estimatedTime: 2, estimatedTimeUnit: "Days", ownerId: owner.id, memberIds: [], beforeEvidence: [] }, creator, true)!;
    expect(item).toMatchObject({ proposedById: creator.id, proposedByName: creator.name, ownerId: owner.id, ownerName: owner.name });
  });

  it("changes only ownership metadata and records existing history", async () => {
    const store = await ciStore();
    const creator = DEMO_USERS.responsible;
    const owners = selectableImprovementOwners(ADMIN_USER_SEEDS, creator.plant, creator.primaryZone);
    const original = store.createImprovement({ title: "Safe owner edit", zone: creator.primaryZone, issueDescription: "Current condition", proposedImprovement: "Improve it", expectedBenefit: "Less delay", benefitType: "Cost Saving", proposedSaving: 5000, estimatedTime: 2, estimatedTimeUnit: "Days", ownerId: owners[0].id, memberIds: [], beforeEvidence: [{ id: "BEFORE", name: "before.jpg", url: "data:image/jpeg;base64,x", uploadedAt: "2026-09-24", uploadedBy: creator.name }] }, creator, true)!;
    store.setImprovements([{ ...original, actionIds: ["ACT-CI-OWNER"], actualSaving: 2500 }]);
    const changed = store.updateImprovementProposal(original.id, { title: original.title, issueDescription: original.issueDescription, proposedImprovement: original.proposedImprovement, expectedBenefit: original.expectedBenefit, benefitType: original.benefitType, proposedSaving: original.proposedSaving, estimatedTime: original.estimatedTime, estimatedTimeUnit: original.estimatedTimeUnit, ownerId: owners[1].id, memberIds: original.memberIds, beforeEvidence: original.beforeEvidence }, creator)!;
    expect(changed).toMatchObject({ id: original.id, status: original.status, actionIds: ["ACT-CI-OWNER"], actualSaving: 2500, beforeEvidence: original.beforeEvidence, ownerId: owners[1].id });
    expect(changed.timeline.some((event) => event.type === "owner_changed" && event.remark?.includes("→"))).toBe(true);
  });

  it("keeps CI Owner independent from linked Action responsibility", () => {
    expect(storeSource).toContain("ownerId: owner.id");
    expect(storeSource).toContain("actionIds: [...item.actionIds, actionId]");
    expect(storeSource).not.toContain("responsiblePersonId: owner");
    expect(detailSource).toContain("action.responsiblePersonName ?? action.assignedTo");
  });

  it("handles missing and inactive historical owners without reassignment", () => {
    expect(improvementOwnerDisplayName({ ownerId: "MISSING", ownerName: "Legacy Operator" })).toBe("Legacy Operator");
    expect(improvementOwnerDisplayName({ ownerId: "MISSING", ownerName: "" })).toBe("Owner unavailable");
    expect(selectableImprovementOwners(ADMIN_USER_SEEDS, "Egmore Plant", "Zone B").every((owner) => owner.status === "Active")).toBe(true);
    expect(storeSource).toContain('ownerId: value.ownerId ?? ""');
    expect(storeSource).not.toContain("value.ownerId ?? value.proposedById");
  });

  it("preserves existing lifecycle, permissions, reporting, and notification paths", () => {
    expect(editPage).toContain("canEditProposal");
    expect(storeSource).toContain('status: saveAsDraft ? "draft" : "submitted"');
    expect(storeSource).toContain("notifyParticipants");
    expect(reportSource).toContain('ReportMeta label="Proposed By"');
    expect(reportSource).toContain('ReportMeta label="Owner"');
    expect(source("features/gemba/gemba-walk-page.tsx")).toContain("Corrective Action Needed?");
    expect(source("lib/actions/action-configuration-store.ts")).toContain('item.id !== "Critical"');
  });
});
