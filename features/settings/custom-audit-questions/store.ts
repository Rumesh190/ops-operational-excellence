"use client";

import { useSyncExternalStore } from "react";

import { safeSetStorage } from "@/lib/browser-storage";
import { DEMO_ORGANIZATION } from "@/lib/module-entitlements";
import type { FiveSAuditStage } from "@/features/five-s/types/five-s";
import type {
  CustomAuditQuestion,
  CustomAuditQuestionInput,
} from "./types";

const STORAGE_KEY = "ops-custom-audit-questions-v1";
const ORGANIZATION_ID = DEMO_ORGANIZATION.id;
const SEEDED_AT = "2026-09-15T00:00:00.000Z";

export const CUSTOM_AUDIT_QUESTION_SEEDS: CustomAuditQuestion[] = [
  {
    id: "CUSTOM-AUDIT-SORT-001",
    organizationId: ORGANIZATION_ID,
    question: "Are obsolete or unused materials clearly identified for removal?",
    stage: "Sort",
    responseType: "Compliance",
    mandatory: true,
    requireEvidenceOnNonCompliance: true,
    instruction: "Check temporary storage, red-tag areas, and material holding points.",
    active: true,
    order: 1,
    source: "custom",
    createdBy: "System seed",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "CUSTOM-AUDIT-SUSTAIN-001",
    organizationId: ORGANIZATION_ID,
    question: "Is the latest visual standard displayed and understood by the team?",
    stage: "Sustain",
    responseType: "Compliance",
    mandatory: false,
    requireEvidenceOnNonCompliance: false,
    active: true,
    order: 1,
    source: "custom",
    createdBy: "System seed",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "CUSTOM-AUDIT-GENERAL-001",
    organizationId: ORGANIZATION_ID,
    question: "Record any additional workplace observation.",
    stage: "General",
    responseType: "Text",
    mandatory: false,
    requireEvidenceOnNonCompliance: false,
    active: true,
    order: 1,
    source: "custom",
    createdBy: "System seed",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

let questions = CUSTOM_AUDIT_QUESTION_SEEDS.map((question) => ({ ...question }));
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) questions = parsed as CustomAuditQuestion[];
    }
  } catch {
    questions = CUSTOM_AUDIT_QUESTION_SEEDS.map((question) => ({ ...question }));
  }
}

function persist(next: CustomAuditQuestion[]) {
  const result = safeSetStorage(STORAGE_KEY, next);
  if (!result.success) return false;
  questions = next;
  listeners.forEach((listener) => listener());
  return true;
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  load();
  return questions;
}

export function useCustomAuditQuestions() {
  return useSyncExternalStore(subscribe, snapshot, () => CUSTOM_AUDIT_QUESTION_SEEDS);
}

export function getCustomAuditQuestions() {
  load();
  return questions;
}

export function getActiveCustomAuditQuestions(organizationId = ORGANIZATION_ID) {
  return getCustomAuditQuestions()
    .filter((question) => question.active && (question.organizationId ?? ORGANIZATION_ID) === organizationId)
    .sort((a, b) => a.stage.localeCompare(b.stage) || a.order - b.order);
}

export function createCustomAuditQuestion(input: CustomAuditQuestionInput, actor: string) {
  load();
  const now = new Date().toISOString();
  const item: CustomAuditQuestion = {
    ...input,
    id: `CUSTOM-AUDIT-${crypto.randomUUID()}`,
    organizationId: input.organizationId ?? ORGANIZATION_ID,
    question: input.question.trim(),
    instruction: input.instruction?.trim() || undefined,
    source: "custom",
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
  };
  return persist([item, ...questions]) ? item : null;
}

export function updateCustomAuditQuestion(id: string, input: CustomAuditQuestionInput) {
  load();
  const current = questions.find((question) => question.id === id);
  if (!current) throw new Error("Custom question not found.");
  const next = questions.map((question) => question.id === id ? {
    ...current,
    ...input,
    question: input.question.trim(),
    instruction: input.instruction?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  } : question);
  return persist(next) ? next.find((question) => question.id === id) ?? null : null;
}

export function setCustomAuditQuestionActive(id: string, active: boolean) {
  load();
  if (!questions.some((question) => question.id === id)) throw new Error("Custom question not found.");
  return persist(questions.map((question) => question.id === id ? {
    ...question,
    active,
    updatedAt: new Date().toISOString(),
  } : question));
}

export function moveCustomAuditQuestion(id: string, direction: -1 | 1) {
  load();
  const current = questions.find((question) => question.id === id);
  if (!current) throw new Error("Custom question not found.");
  const stageQuestions = questions
    .filter((question) => question.stage === current.stage && (question.organizationId ?? ORGANIZATION_ID) === (current.organizationId ?? ORGANIZATION_ID))
    .sort((a, b) => a.order - b.order);
  const index = stageQuestions.findIndex((question) => question.id === id);
  const target = stageQuestions[index + direction];
  if (!target) return true;
  return persist(questions.map((question) => {
    if (question.id === current.id) return { ...question, order: target.order, updatedAt: new Date().toISOString() };
    if (question.id === target.id) return { ...question, order: current.order, updatedAt: new Date().toISOString() };
    return question;
  }));
}

export function nextQuestionOrder(stage: FiveSAuditStage) {
  return Math.max(0, ...getCustomAuditQuestions().filter((question) => question.stage === stage && (question.organizationId ?? ORGANIZATION_ID) === ORGANIZATION_ID).map((question) => question.order)) + 1;
}

export const DEFAULT_CUSTOM_QUESTION_ORGANIZATION_ID = ORGANIZATION_ID;
