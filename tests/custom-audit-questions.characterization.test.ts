import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { permissionsForRoles } from "@/features/five-s/administration/permissions";
import type { FiveSCategory, FiveSQuestion, FiveSSection } from "@/features/five-s/types/five-s";
import { createAuditChecklistSnapshot, isAuditQuestionComplete } from "@/features/settings/custom-audit-questions/checklist";
import { CUSTOM_AUDIT_QUESTION_SEEDS } from "@/features/settings/custom-audit-questions/store";

const counts: Record<FiveSCategory, number> = { Sort: 7, "Set in Order": 9, Shine: 8, Standardize: 7, Sustain: 8 };

afterEach(() => vi.unstubAllGlobals());

function standardSections(): FiveSSection[] {
  return (Object.keys(counts) as FiveSCategory[]).map((category) => {
    const questions: FiveSQuestion[] = Array.from({ length: counts[category] }, (_, index) => ({
      id: `${category}-${index}`,
      category,
      question: `Locked ${category} question ${index + 1}`,
      maxScore: 2,
      score: null,
      status: "Not Started",
      actionRequired: false,
      evidence: [],
    }));
    return { category, description: category, questions, score: 0, maxScore: questions.length * 2 };
  });
}

describe("custom audit question characterization", () => {
  it("keeps all 39 standard questions and appends active custom questions by stage", () => {
    const sections = createAuditChecklistSnapshot(standardSections(), CUSTOM_AUDIT_QUESTION_SEEDS);
    expect(sections.flatMap((section) => section.questions)).toHaveLength(42);
    expect(sections.at(-1)?.category).toBe("General");
    expect(sections.at(-1)?.questions[0]).toMatchObject({ questionSource: "custom", responseType: "Text", maxScore: 0 });
    const sort = sections.find((section) => section.category === "Sort")!;
    expect(sort.questions.slice(0, 7).every((question) => question.questionSource === "standard")).toBe(true);
    expect(sort.questions[7]).toMatchObject({ customQuestionId: "CUSTOM-AUDIT-SORT-001", questionSource: "custom" });
  });

  it("excludes inactive questions from new snapshots without mutating an earlier snapshot", () => {
    const settings = CUSTOM_AUDIT_QUESTION_SEEDS.map((question) => ({ ...question }));
    const earlier = createAuditChecklistSnapshot(standardSections(), settings);
    settings[0].active = false;
    settings[0].question = "Changed later";
    const later = createAuditChecklistSnapshot(standardSections(), settings);
    expect(earlier.flatMap((section) => section.questions).some((question) => question.customQuestionId === settings[0].id)).toBe(true);
    expect(earlier.flatMap((section) => section.questions).some((question) => question.question === "Changed later")).toBe(false);
    expect(later.flatMap((section) => section.questions).some((question) => question.customQuestionId === settings[0].id)).toBe(false);
  });

  it("blocks mandatory unanswered and evidence-required non-compliance responses", () => {
    const mandatoryText: FiveSQuestion = { id: "text", category: "General", question: "Observation", maxScore: 0, score: null, status: "Not Started", actionRequired: false, questionSource: "custom", responseType: "Text", mandatory: true };
    expect(isAuditQuestionComplete(mandatoryText, { score: null, textResponse: "" })).toBe(false);
    expect(isAuditQuestionComplete(mandatoryText, { score: null, textResponse: "Observed" })).toBe(true);

    const compliance: FiveSQuestion = { ...mandatoryText, id: "compliance", category: "Sort", responseType: "Compliance", maxScore: 2, requireEvidenceOnNonCompliance: true };
    expect(isAuditQuestionComplete(compliance, { score: 0, observation: "Issue", actionId: "ACT-1", evidence: [] })).toBe(false);
    expect(isAuditQuestionComplete(compliance, { score: 0, observation: "Issue", actionId: "ACT-1", evidence: [{}] })).toBe(true);
  });

  it("keeps configuration management Admin-only through the existing permission engine", () => {
    expect(permissionsForRoles(["Admin"])).toContain("administration.manage_configuration");
    expect(permissionsForRoles(["Auditor"])).not.toContain("administration.manage_configuration");
    expect(permissionsForRoles(["Zone Leader"])).not.toContain("administration.manage_configuration");
    expect(permissionsForRoles(["Zone Member"])).not.toContain("administration.manage_configuration");
  });

  it("creates, edits, deactivates, and reactivates questions in separate local storage", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
    vi.stubGlobal("crypto", { randomUUID: () => "question-test-id" });
    vi.resetModules();
    const store = await import("@/features/settings/custom-audit-questions/store");
    const created = store.createCustomAuditQuestion({ question: "Is the team board current?", stage: "Sustain", responseType: "Yes / No", mandatory: true, requireEvidenceOnNonCompliance: false, active: true, order: 2 }, "Admin User")!;
    expect(created).toMatchObject({ id: "CUSTOM-AUDIT-question-test-id", source: "custom", createdBy: "Admin User" });
    expect(store.updateCustomAuditQuestion(created.id, { ...created, question: "Is the team board updated today?" })?.question).toBe("Is the team board updated today?");
    expect(store.setCustomAuditQuestionActive(created.id, false)).toBe(true);
    expect(store.getActiveCustomAuditQuestions().some((question) => question.id === created.id)).toBe(false);
    expect(store.setCustomAuditQuestionActive(created.id, true)).toBe(true);
    expect(store.getActiveCustomAuditQuestions().some((question) => question.id === created.id)).toBe(true);
    expect(values.has("ops-custom-audit-questions-v1")).toBe(true);
  });

  it("exposes Settings routes without adding a top-level module", () => {
    const root = process.cwd();
    expect(fs.existsSync(path.join(root, "app/(app)/settings/audit/page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(root, "app/(app)/settings/audit/custom-questions/page.tsx"))).toBe(true);
  });
});
