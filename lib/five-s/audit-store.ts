"use client";

import { useSyncExternalStore } from "react";

import { FIVE_S_AUDITS } from "@/features/five-s/data/five-s-data";

import type { FiveSAudit } from "@/features/five-s/types/five-s";
import { safeSetStorage, safeSetStorageString } from "@/lib/browser-storage";

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY =
  "manufacturing-qms-five-s-audits-v1";

const AUDIT_NUMBER_STORAGE_KEY =
  "manufacturing-qms-five-s-next-audit-number-v1";

const AUDIT_SEQUENCE_STORAGE_KEY =
  "standalone-5s-audit-sequences-v2";
const AUDIT_FIXTURE_VERSION_KEY = "standalone-5s-audit-fixture-version";
const AUDIT_FIXTURE_VERSION = "canonical-zone-a-v1";

/* =========================================================
   STORE STATE
   ========================================================= */

let audits: FiveSAudit[] = [...FIVE_S_AUDITS];

const listeners = new Set<() => void>();

let initializedFromStorage = false;

/* =========================================================
   EMIT CHANGE
   ========================================================= */

function emitChange(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

/* =========================================================
   LOAD FROM LOCAL STORAGE
   ========================================================= */

function loadFromStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (initializedFromStorage) {
    return;
  }

  initializedFromStorage = true;

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (!stored) {
      return;
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return;
    }

    let storedAudits = parsed as FiveSAudit[];
    const fixtureVersion = window.localStorage.getItem(AUDIT_FIXTURE_VERSION_KEY);
    if (fixtureVersion !== AUDIT_FIXTURE_VERSION) {
      const canonicalAudit = FIVE_S_AUDITS.find((audit) => audit.id === "5S-EGM-ZA-006");
      if (canonicalAudit) {
        storedAudits = [canonicalAudit, ...storedAudits.filter((audit) => audit.id !== canonicalAudit.id)];
      }
      safeSetStorageString(AUDIT_FIXTURE_VERSION_KEY, AUDIT_FIXTURE_VERSION);
    }

    const storedIds = new Set(storedAudits.map((audit) => audit.id));
    const missingSeedAudits = FIVE_S_AUDITS.filter((audit) => !storedIds.has(audit.id));
    audits = [...missingSeedAudits, ...storedAudits];

    emitChange();
  } catch (error) {
    console.error(
      "Failed to load 5S audits from localStorage:",
      error
    );
  }
}

/* =========================================================
   SAVE TO LOCAL STORAGE
   ========================================================= */

function persistAudits(): void {
  if (typeof window === "undefined") {
    return;
  }

  safeSetStorage(STORAGE_KEY, audits);
}

/* =========================================================
   SUBSCRIBE
   ========================================================= */

function subscribe(
  listener: () => void
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/* =========================================================
   SNAPSHOT
   ========================================================= */

function getSnapshot(): FiveSAudit[] {
  return audits;
}

/* =========================================================
   SERVER SNAPSHOT
   ========================================================= */

function getServerSnapshot(): FiveSAudit[] {
  return FIVE_S_AUDITS;
}

/* =========================================================
   INITIALIZE STORE
   ========================================================= */

function initializeStore(): void {
  if (typeof window === "undefined") {
    return;
  }

  loadFromStorage();
}

/* =========================================================
   REACT STORE HOOK
   ========================================================= */

export function useFiveSAuditStore(): FiveSAudit[] {
  initializeStore();

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}

/* =========================================================
   GET ALL AUDITS
   ========================================================= */

export function getFiveSAudits(): FiveSAudit[] {
  initializeStore();

  return audits;
}

/* =========================================================
   GET AUDIT BY ID
   ========================================================= */

export function getFiveSAuditById(
  auditId: string
): FiveSAudit | undefined {
  initializeStore();

  return audits.find(
    (audit) => audit.id === auditId
  );
}

/* =========================================================
   AUDIT NUMBER HELPERS
   ========================================================= */

/**
 * Find the highest audit number already present.
 *
 * Supports:
 *
 * 5S-001-CHN-ASM1
 * 5S-027-HSR-WLD
 *
 * Older demo records such as:
 *
 * 5S-AUD-001
 *
 * are intentionally ignored.
 */
function getHighestAuditNumber(): number {
  let highestNumber = 0;

  for (const audit of audits) {
    const match =
      audit.title.match(
        /^5S-(\d+)-/i
      );

    if (!match) {
      continue;
    }

    const number =
      Number(match[1]);

    if (
      Number.isFinite(number) &&
      number > highestNumber
    ) {
      highestNumber = number;
    }
  }

  return highestNumber;
}

/**
 * Get the next permanent audit number.
 *
 * The number is stored separately from the audit list.
 *
 * This is important because deleting an audit must NOT
 * cause its number to be reused.
 */
function getSequenceKey(plant: string, area: string): string {
  return `${getPlantCode(plant)}-${getAreaCode(area)}`;
}

function getStoredSequences(): Record<string, number> {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(AUDIT_SEQUENCE_STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, number>
      : {};
  } catch {
    return {};
  }
}

function getHighestCombinationNumber(plant: string, area: string): number {
  const prefix = `5S-${getPlantCode(plant)}-${getAreaCode(area)}-`;

  return audits.reduce((highest, audit) => {
    if (!audit.title.startsWith(prefix)) return highest;
    const value = Number(audit.title.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
}

function getNextAuditNumber(plant: string, area: string): number {
  const key = getSequenceKey(plant, area);
  const stored = getStoredSequences()[key];
  return Number.isFinite(stored) && stored > 0
    ? stored
    : getHighestCombinationNumber(plant, area) + 1;
}

function reserveNextAuditNumber(plant: string, area: string): number {
  const nextNumber = getNextAuditNumber(plant, area);

  if (typeof window !== "undefined") {
    const sequences = getStoredSequences();
    sequences[getSequenceKey(plant, area)] = nextNumber + 1;
    safeSetStorage(AUDIT_SEQUENCE_STORAGE_KEY, sequences);
  }

  return nextNumber;
}

/**
 * Plant code.
 */
function getPlantCode(
  plant: string
): string {
  const codes: Record<
    string,
    string
  > = {
    "Egmore Plant": "EGM",
    Chennai: "CHN",
    Hosur: "HSR",
    Bengaluru: "BLR",
    Mysuru: "MYS",
  };

  if (codes[plant]) {
    return codes[plant];
  }

  return plant
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .slice(0, 3)
    .toUpperCase();
}

/**
 * Area code.
 */
function getAreaCode(
  area: string
): string {
  const normalized =
    area.trim();

  if (!normalized) {
    return "AREA";
  }

  const predefinedCodes: Record<
    string,
    string
  > = {
    "Zone A": "ZA",
    "Zone B": "ZB",
    "Zone C": "ZC",
    "Zone D": "ZD",
    "Assembly Line 1": "ASM1",
    "Assembly Line 2": "ASM2",
    "Assembly Line 3": "ASM3",
    "Welding Bay": "WLD",
    "CNC Section": "CNC",
    "Paint Booth 1": "PB1",
    "Paint Booth 2": "PB2",
    "Paint Booth 3": "PB3",
    Warehouse: "WH",
  };

  if (
    predefinedCodes[
      normalized
    ]
  ) {
    return predefinedCodes[
      normalized
    ];
  }

  const numberMatch =
    normalized.match(
      /\d+/
    );

  const number =
    numberMatch?.[0] ?? "";

  const words =
    normalized
      .replace(/\d+/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  let code = "";

  if (
    words.length === 1
  ) {
    code =
      words[0]
        .replace(
          /[^a-zA-Z]/g,
          ""
        )
        .slice(0, 3)
        .toUpperCase();
  } else {
    code =
      words
        .map(
          (word) =>
            word[0]
        )
        .join("")
        .slice(0, 3)
        .toUpperCase();
  }

  return `${code}${number}`;
}

/**
 * Build human-readable audit title.
 *
 * Example:
 *
 * 5S-EGM-ZA-001
 */
function buildAuditTitle(
  auditNumber: number,
  plant: string,
  area: string
): string {
  const number =
    String(auditNumber)
      .padStart(3, "0");

  const plantCode =
    getPlantCode(plant);

  const areaCode =
    getAreaCode(area);

  return `5S-${plantCode}-${areaCode}-${number}`;
}

export function getNextFiveSAuditTitle(plant: string, area: string): string {
  if (!plant || !area) return "";
  return buildAuditTitle(getNextAuditNumber(plant, area), plant, area);
}

/* =========================================================
   CALCULATE MAX SCORE
   ========================================================= */

function calculateMaxScore(
  sections: FiveSAudit["sections"]
): number {
  return sections.reduce(
    (
      sectionTotal,
      section
    ) => {
      return (
        sectionTotal +
        section.questions.reduce(
          (
            questionTotal,
            question
          ) => {
            return (
              questionTotal +
              question.maxScore
            );
          },
          0
        )
      );
    },
    0
  );
}

/* =========================================================
   CALCULATE SCORE
   ========================================================= */

function calculateScore(
  sections: FiveSAudit["sections"]
): number {
  return sections.reduce(
    (
      sectionTotal,
      section
    ) => {
      return (
        sectionTotal +
        section.questions.reduce(
          (
            questionTotal,
            question
          ) => {
            if (
              question.status ===
              "NA"
            ) {
              return questionTotal;
            }

            return (
              questionTotal +
              (question.score ??
                0)
            );
          },
          0
        )
      );
    },
    0
  );
}

/* =========================================================
   CALCULATE COMPLETION
   ========================================================= */

function calculateCompletionPercentage(
  sections: FiveSAudit["sections"]
): number {
  const questions =
    sections.flatMap(
      (section) =>
        section.questions
    );

  if (
    questions.length === 0
  ) {
    return 0;
  }

  const answeredQuestions =
    questions.filter(
      (question) =>
        question.status !==
        "Not Started"
    ).length;

  return Math.round(
    (answeredQuestions /
      questions.length) *
      100
  );
}

/* =========================================================
   CREATE AUDIT
   ========================================================= */

export function createFiveSAudit(
  input: Omit<
    FiveSAudit,
    | "id"
    | "score"
    | "maxScore"
    | "completionPercentage"
    | "status"
  >,
  options: { startNow?: boolean } = {}
): FiveSAudit {
  initializeStore();

  const now =
    new Date();

  const sections = (input.sections ?? []).map((section) => ({
    ...section,
    questions: section.questions.map((question) => ({
      ...question,
      evidence: (question.evidence ?? []).map((evidence) => ({ ...evidence })),
    })),
  }));

  /**
   * Reserve a permanent running number.
   *
   * Example:
   *
   * 1 -> 001
   * 2 -> 002
   * 3 -> 003
   */
  const auditNumber =
    reserveNextAuditNumber(input.plant, input.area);

  /**
   * Generate the readable audit title.
   */
  const generatedTitle =
    buildAuditTitle(
      auditNumber,
      input.plant,
      input.area
    );

  const startNow = options.startNow ?? true;
  const audit: FiveSAudit = {
    ...input,
    sections,

    /**
     * Keep an internal unique ID separate
     * from the human-readable audit title.
     */
    id: `5S-AUD-${Date.now()}`,

    /**
     * Automatically generated title.
     */
    title: generatedTitle,

    status: startNow ? "In Progress" : "Scheduled",

    score:
      calculateScore(
        sections
      ),

    maxScore:
      calculateMaxScore(
        sections
      ),

    completionPercentage:
      calculateCompletionPercentage(
        sections
      ),

    startedAt: startNow
      ? input.startedAt ?? now.toISOString().slice(0, 10)
      : undefined,
  };

  audits = [
    audit,
    ...audits,
  ];

  persistAudits();

  emitChange();

  return audit;
}

/* =========================================================
   UPDATE AUDIT
   ========================================================= */

export function updateFiveSAudit(
  auditId: string,
  updates: Partial<FiveSAudit>
): FiveSAudit | undefined {
  initializeStore();

  let updatedAudit:
    | FiveSAudit
    | undefined;

  audits =
    audits.map(
      (audit) => {
        if (
          audit.id !==
          auditId
        ) {
          return audit;
        }

        const nextAudit = {
          ...audit,
          ...updates,
        };

        updatedAudit = audit.status === "Draft"
          ? nextAudit
          : {
              ...nextAudit,
              id: audit.id,
              title: audit.title,
              plant: audit.plant,
              department: audit.department,
              area: audit.area,
              auditor: audit.auditor,
            };

        return updatedAudit;
      }
    );

  if (
    updatedAudit
  ) {
    persistAudits();

    emitChange();
  }

  return updatedAudit;
}

export function validateFiveSAuditSchedule(
  scheduledDate: string,
  scheduledTime: string,
  now = new Date()
): string | null {
  if (!scheduledDate || !scheduledTime) return "Choose a scheduled date and time.";

  const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
  if (Number.isNaN(scheduledAt.getTime())) return "Choose a valid scheduled date and time.";
  if (scheduledAt.getTime() <= now.getTime()) return "Scheduled date and time must be in the future.";
  return null;
}

export function updateScheduledFiveSAuditSetup(
  auditId: string,
  updates: Pick<FiveSAudit, "dueDate" | "scheduledDate" | "scheduledTime">,
  now = new Date()
): FiveSAudit | undefined {
  initializeStore();
  const existingAudit = audits.find((audit) => audit.id === auditId);
  if (!existingAudit || existingAudit.status !== "Scheduled") return undefined;
  if (validateFiveSAuditSchedule(updates.scheduledDate ?? "", updates.scheduledTime ?? "", now)) return undefined;

  const updatedAudit = { ...existingAudit, ...updates };
  audits = audits.map((audit) => audit.id === auditId ? updatedAudit : audit);
  persistAudits();
  emitChange();
  return updatedAudit;
}

export function startScheduledFiveSAudit(
  auditId: string,
  now = new Date()
): FiveSAudit | undefined {
  initializeStore();
  const existingAudit = audits.find((audit) => audit.id === auditId);
  if (!existingAudit || existingAudit.status !== "Scheduled") return undefined;

  const startedAudit: FiveSAudit = {
    ...existingAudit,
    status: "In Progress",
    startedAt: now.toISOString().slice(0, 10),
  };
  audits = audits.map((audit) => audit.id === auditId ? startedAudit : audit);
  persistAudits();
  emitChange();
  return startedAudit;
}

/* =========================================================
   SAVE AUDIT DRAFT
   ========================================================= */

export function saveFiveSAuditDraft(
  auditId: string,
  sections: FiveSAudit["sections"]
): FiveSAudit | undefined {
  initializeStore();

  const existingAudit =
    getFiveSAuditById(
      auditId
    );

  if (
    !existingAudit
  ) {
    console.warn(
      `5S audit not found: ${auditId}`
    );

    return undefined;
  }

  const updatedAudit: FiveSAudit = {
    ...existingAudit,

    status:
      existingAudit.status ===
      "Completed"
        ? "Completed"
        : existingAudit.status === "In Progress"
          ? "In Progress"
          : existingAudit.status === "Scheduled"
            ? "Scheduled"
            : "Draft",

    score:
      calculateScore(
        sections
      ),

    maxScore:
      calculateMaxScore(
        sections
      ),

    completionPercentage:
      calculateCompletionPercentage(
        sections
      ),

    sections,
  };

  audits =
    audits.map(
      (audit) =>
        audit.id ===
        auditId
          ? updatedAudit
          : audit
    );

  persistAudits();

  emitChange();

  return updatedAudit;
}

/* =========================================================
   COMPLETE AUDIT
   ========================================================= */

export function completeFiveSAudit(
  auditId: string,
  sections: FiveSAudit["sections"]
): FiveSAudit | undefined {
  initializeStore();

  const existingAudit =
    getFiveSAuditById(
      auditId
    );

  if (
    !existingAudit
  ) {
    console.warn(
      `5S audit not found: ${auditId}`
    );

    return undefined;
  }

  if (!existingAudit.auditorSignature) {
    console.warn(`Auditor signature is required before completing 5S audit: ${auditId}`);
    return undefined;
  }

  const now =
    new Date();

  const completedAudit: FiveSAudit = {
    ...existingAudit,

    status: "Completed",

    score:
      calculateScore(
        sections
      ),

    maxScore:
      calculateMaxScore(
        sections
      ),

    completionPercentage:
      calculateCompletionPercentage(
        sections
      ),

    sections,

    completedAt:
      now
        .toISOString()
        .slice(0, 10),
  };

  audits =
    audits.map(
      (audit) =>
        audit.id ===
        auditId
          ? completedAudit
          : audit
    );

  persistAudits();

  emitChange();

  return completedAudit;
}

/* =========================================================
   SET ALL AUDITS
   ========================================================= */

export function setFiveSAudits(
  nextAudits: FiveSAudit[]
): void {
  initializeStore();

  audits = [
    ...nextAudits,
  ];

  persistAudits();

  emitChange();
}

/* =========================================================
   DELETE AUDIT
   ========================================================= */

export function deleteFiveSAudit(
  auditId: string
): boolean {
  initializeStore();

  const existingLength =
    audits.length;

  audits =
    audits.filter(
      (audit) =>
        audit.id !==
        auditId
    );

  const deleted =
    audits.length !==
    existingLength;

  if (deleted) {
    persistAudits();

    emitChange();
  }

  return deleted;
}

/* =========================================================
   RESET DEMO DATA
   ========================================================= */

export function resetFiveSAudits(): void {
  audits = [
    ...FIVE_S_AUDITS,
  ];

  /**
   * Reset the audit number counter too.
   *
   * The next generated audit will start after
   * the highest generated 5S number in the demo data.
   */
  if (
    typeof window !== "undefined"
  ) {
    const highest =
      getHighestAuditNumber();

    safeSetStorageString(AUDIT_NUMBER_STORAGE_KEY, String(highest + 1));

    window.localStorage.removeItem(
      AUDIT_SEQUENCE_STORAGE_KEY
    );
  }

  persistAudits();

  emitChange();
}

/* =========================================================
   CLEAR PERSISTED DATA
   ========================================================= */

export function clearFiveSAuditStorage(): void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      STORAGE_KEY
    );

    window.localStorage.removeItem(
      AUDIT_NUMBER_STORAGE_KEY
    );

    window.localStorage.removeItem(
      AUDIT_SEQUENCE_STORAGE_KEY
    );

    audits = [
      ...FIVE_S_AUDITS,
    ];

    initializedFromStorage =
      true;

    emitChange();
  } catch (error) {
    console.error(
      "Failed to clear 5S audit storage:",
      error
    );
  }
}
