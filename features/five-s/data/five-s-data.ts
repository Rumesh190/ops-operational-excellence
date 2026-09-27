import {
  FiveSAudit,
  FiveSAction,
  FiveSCategory,
  FiveSQuestion,
  FiveSSection,
} from "../types/five-s";
import { referenceFields } from "@/lib/five-s/reference-guides";

export const FIVE_S_CATEGORIES: FiveSCategory[] = [
  "Sort",
  "Set in Order",
  "Shine",
  "Standardize",
  "Sustain",
];

export const FIVE_S_CATEGORY_DESCRIPTIONS: Record<
  FiveSCategory,
  string
> = {
  Sort:
    "Remove unnecessary items and keep only what is required in the work area.",

  "Set in Order":
    "Arrange required items so they are easy to find, use, and return.",

  Shine:
    "Keep the workplace clean, inspect equipment, and identify abnormal conditions.",

  Standardize:
    "Establish consistent standards, visual controls, and procedures.",

  Sustain:
    "Maintain 5S practices through discipline, audits, ownership, and continual improvement.",
};

/* =========================================================
   QUESTION FACTORY
   ========================================================= */

function createQuestion(
  id: string,
  category: FiveSCategory,
  question: string,
  score: number | null,
  status: FiveSQuestion["status"],
  options?: {
    observation?: string;
    actionRequired?: boolean;
    actionId?: string;
  }
): FiveSQuestion {
  return {
    id,
    category,
    question,
    maxScore: 5,
    score,
    status,
    observation: options?.observation,
    actionRequired:
      options?.actionRequired ?? false,
    actionId: options?.actionId,
    evidence: [],
    ...referenceFields(category, Math.max(0, Number(id.match(/(\d+)$/)?.[1] ?? 1) - 1)),
  };
}

/* =========================================================
   SECTION FACTORY
   ========================================================= */

function createSection(
  category: FiveSCategory,
  questions: FiveSQuestion[]
): FiveSSection {
  const maxScore = questions.reduce(
    (total, question) =>
      total + question.maxScore,
    0
  );

  const score = questions.reduce(
    (total, question) =>
      total + (question.score ?? 0),
    0
  );

  return {
    category,
    description:
      FIVE_S_CATEGORY_DESCRIPTIONS[
        category
      ],
    questions,
    score,
    maxScore,
  };
}

/* =========================================================
   COMPLETED AUDIT
   ========================================================= */

const completedAuditSections: FiveSSection[] = [
  createSection("Sort", [
    createQuestion(
      "Q-SORT-001",
      "Sort",
      "Are unnecessary tools, materials, and items removed from the work area?",
      5,
      "Pass"
    ),

    createQuestion(
      "Q-SORT-002",
      "Sort",
      "Are obsolete or unused items clearly identified and segregated?",
      4,
      "Pass"
    ),

    createQuestion(
      "Q-SORT-003",
      "Sort",
      "Are only required materials stored at the workstation?",
      5,
      "Pass"
    ),
  ]),

  createSection("Set in Order", [
    createQuestion(
      "Q-ORDER-001",
      "Set in Order",
      "Are tools and materials stored in clearly identified locations?",
      5,
      "Pass"
    ),

    createQuestion(
      "Q-ORDER-002",
      "Set in Order",
      "Are storage locations visually marked and easy to identify?",
      4,
      "Pass"
    ),

    createQuestion(
      "Q-ORDER-003",
      "Set in Order",
      "Can frequently used items be accessed without unnecessary movement?",
      4,
      "Pass"
    ),
  ]),

  createSection("Shine", [
    createQuestion(
      "Q-SHINE-001",
      "Shine",
      "Is the work area clean and free from visible dirt and waste?",
      5,
      "Pass"
    ),

    createQuestion(
      "Q-SHINE-002",
      "Shine",
      "Are machines and equipment maintained in a clean condition?",
      4,
      "Pass"
    ),

    createQuestion(
      "Q-SHINE-003",
      "Shine",
      "Are abnormal conditions identified during cleaning activities?",
      3,
      "Fail",
      {
        observation:
          "Oil leakage identified near the hydraulic unit. Maintenance action required.",
        actionRequired: true,
        actionId: "ACT-5S-001",
      }
    ),
  ]),

  createSection("Standardize", [
    createQuestion(
      "Q-STD-001",
      "Standardize",
      "Are standard 5S procedures available and followed?",
      4,
      "Pass"
    ),

    createQuestion(
      "Q-STD-002",
      "Standardize",
      "Are visual standards available for the work area?",
      4,
      "Pass"
    ),

    createQuestion(
      "Q-STD-003",
      "Standardize",
      "Are cleaning and inspection responsibilities clearly defined?",
      5,
      "Pass"
    ),
  ]),

  createSection("Sustain", [
    createQuestion(
      "Q-SUS-001",
      "Sustain",
      "Are 5S audits performed according to the defined schedule?",
      5,
      "Pass"
    ),

    createQuestion(
      "Q-SUS-002",
      "Sustain",
      "Are previous audit actions followed up and closed?",
      4,
      "Pass"
    ),

    createQuestion(
      "Q-SUS-003",
      "Sustain",
      "Are employees demonstrating consistent 5S practices?",
      4,
      "Pass"
    ),
  ]),
];

const canonicalZoneAAuditSections: FiveSSection[] = completedAuditSections.map((section) => ({
  ...section,
  questions: section.questions.map((question) =>
    question.id === "Q-SORT-001"
      ? {
          ...question,
          score: 0,
          status: "Fail",
          observation: "Unused cartons and scrap material are obstructing the marked production aisle.",
          actionRequired: true,
          actionId: "ACT-ZA-001",
          evidence: [],
        }
      : { ...question }
  ),
  score: section.category === "Sort" ? section.score - 5 : section.score,
}));

/* =========================================================
   DEMO AUDITS
   ========================================================= */

export const FIVE_S_AUDITS: FiveSAudit[] = [
  { id: "5S-EGM-ZB-001", title: "5S-EGM-ZB-001", plant: "Egmore Plant", department: "Production", area: "Zone B", auditor: "Lakshman", status: "Completed", score: 58, maxScore: 75, completionPercentage: 100, startedAt: "2026-08-25T09:00:00.000Z", completedAt: "2026-08-25T11:30:00.000Z", dueDate: "2026-08-27", sections: canonicalZoneAAuditSections },
  ...[
    ["5S-EGM-ZA-005", "Zone A", "Lakshman", 61, "2026-07-18"],
    ["5S-EGM-ZA-004", "Zone A", "Lakshman", 57, "2026-06-20"],
    ["5S-EGM-ZA-003", "Zone A", "Lakshman", 52, "2026-05-22"],
    ["5S-EGM-ZB-006", "Zone B", "Rumesh", 57, "2026-08-21"],
    ["5S-EGM-ZB-005", "Zone B", "Rumesh", 54, "2026-07-17"],
    ["5S-EGM-ZC-006", "Zone C", "Manoj Guru", 49, "2026-08-19"],
    ["5S-EGM-ZC-005", "Zone C", "Manoj Guru", 52, "2026-07-16"],
    ["5S-EGM-ZD-006", "Zone D", "Suresh", 53, "2026-08-23"],
    ["5S-EGM-ZD-005", "Zone D", "Suresh", 50, "2026-07-20"],
  ].map(([id, area, auditor, score, date]) => ({
    id: id as string,
    title: id as string,
    plant: "Egmore Plant",
    department: "Production",
    area: area as string,
    auditor: auditor as string,
    status: "Completed" as const,
    score: score as number,
    maxScore: 75,
    completionPercentage: 100,
    startedAt: `${date}T09:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    dueDate: date as string,
    sections: completedAuditSections,
  })),
  {
    id: "5S-EGM-ZA-006",
    title: "5S-EGM-ZA-006",
    plant: "Egmore Plant",
    department: "Production",
    area: "Zone A",
    auditor: "Lakshman",
    status: "Completed",
    score: 58,
    maxScore: 75,
    completionPercentage: 100,
    startedAt: "2026-08-25T09:00:00.000Z",
    completedAt: "2026-08-25T11:30:00.000Z",
    dueDate: "2026-08-27",
    sections: canonicalZoneAAuditSections,
  },
  {
    id: "5S-AUD-001",
    title:
      "Assembly Line 1 — Monthly 5S Audit",
    plant: "Chennai",
    department: "Production",
    area: "Assembly Line 1",
    auditor: "Arun Kumar",
    status: "Completed",
    score: 63,
    maxScore: 75,
    completionPercentage: 100,
    startedAt: "2026-08-04",
    completedAt: "2026-08-04",
    dueDate: "2026-08-05",
    sections: completedAuditSections,
  },

  {
    id: "5S-AUD-002",
    title:
      "Welding Area — Monthly 5S Audit",
    plant: "Hosur",
    department: "Production",
    area: "Welding Bay",
    auditor: "Priya S",
    status: "In Progress",
    score: 38,
    maxScore: 75,
    completionPercentage: 60,
    startedAt: "2026-08-08",
    dueDate: "2026-08-12",
    sections: [],
  },

  {
    id: "5S-AUD-003",
    title: "Paint Shop — 5S Audit",
    plant: "Bengaluru",
    department: "Paint Shop",
    area: "Paint Booth 2",
    auditor: "Rahul Menon",
    status: "Draft",
    score: 0,
    maxScore: 75,
    completionPercentage: 0,
    dueDate: "2026-08-15",
    sections: [],
  },

  {
    id: "5S-AUD-004",
    title:
      "Machining Area — Monthly 5S Audit",
    plant: "Chennai",
    department: "Machining",
    area: "CNC Section",
    auditor: "Arun Kumar",
    status: "Completed",
    score: 69,
    maxScore: 75,
    completionPercentage: 100,
    startedAt: "2026-07-15",
    completedAt: "2026-07-15",
    dueDate: "2026-07-15",
    sections: [],
  },
];

/* =========================================================
   DEMO ACTIONS
   ========================================================= */

export const FIVE_S_ACTIONS: FiveSAction[] = [
  {
    id: "ACT-5S-001",
    auditId: "5S-AUD-001",
    auditTitle:
      "Assembly Line 1 — Monthly 5S Audit",

    title:
      "Repair hydraulic unit oil leakage",

    description:
      "Repair the hydraulic unit leakage identified during the Shine inspection and clean the affected area.",

    category: "Shine",

    plant: "Chennai",
    department: "Production",
    area: "Assembly Line 1",

    assignedTo: "Maintenance Team",

    status: "Open",

    priority: "High",

    dueDate: "2026-08-12",
    createdAt: "2026-08-04",

    evidence: [],
  },

  {
    id: "ACT-5S-002",
    auditId: "5S-AUD-001",
    auditTitle:
      "Assembly Line 1 — Monthly 5S Audit",

    title:
      "Improve tool location markings",

    description:
      "Update the visual identification labels for frequently used assembly tools.",

    category: "Set in Order",

    plant: "Chennai",
    department: "Production",
    area: "Assembly Line 1",

    assignedTo: "Suresh Kumar",

    status: "In Progress",

    priority: "Medium",

    dueDate: "2026-08-14",
    createdAt: "2026-08-04",

    evidence: [],
  },

  {
    id: "ACT-5S-003",
    auditId: "5S-AUD-002",
    auditTitle:
      "Welding Area — Monthly 5S Audit",

    title:
      "Remove obsolete welding fixtures",

    description:
      "Identify obsolete fixtures and move them to the designated red-tag area.",

    category: "Sort",

    plant: "Hosur",
    department: "Production",
    area: "Welding Bay",

    assignedTo: "Karthik R",

    status: "Open",

    priority: "Medium",

    dueDate: "2026-08-13",
    createdAt: "2026-08-08",

    evidence: [],
  },

  {
    id: "ACT-5S-004",
    auditId: "5S-AUD-002",
    auditTitle:
      "Welding Area — Monthly 5S Audit",

    title:
      "Update welding area visual standards",

    description:
      "Replace the outdated 5S visual standard board and update the cleaning responsibility chart.",

    category: "Standardize",

    plant: "Hosur",
    department: "Production",
    area: "Welding Bay",

    assignedTo: "Priya S",

    status: "Completed",

    priority: "Low",

    dueDate: "2026-08-10",
    createdAt: "2026-08-08",
    completedAt: "2026-08-09",

    evidence: [
      {
        id: "EV-5S-001",

        name:
          "Updated Visual Standard.jpg",

        type: "image",

        /*
         * Demo evidence does not contain
         * an actual uploaded file.
         * Keep size at 0 and dataUrl
         * empty so it satisfies the
         * FiveSEvidence type.
         */
        size: 0,

        dataUrl: "",

        uploadedAt: "2026-08-09",

        uploadedBy: "Priya S",
      },
    ],
  },
];

/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

export function getFiveSScorePercentage(
  score: number,
  maxScore: number
): number {
  if (maxScore === 0) {
    return 0;
  }

  return Math.round(
    (score / maxScore) * 100
  );
}

export function getFiveSAuditById(
  auditId: string
): FiveSAudit | undefined {
  return FIVE_S_AUDITS.find(
    (audit) => audit.id === auditId
  );
}

export function getFiveSActionsByAuditId(
  auditId: string
): FiveSAction[] {
  return FIVE_S_ACTIONS.filter(
    (action) =>
      action.auditId === auditId
  );
}

export function getMyFiveSActions(
  userName: string
): FiveSAction[] {
  return FIVE_S_ACTIONS.filter(
    (action) =>
      action.assignedTo === userName
  );
}
