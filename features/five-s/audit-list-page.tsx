"use client";

import { useState } from "react";

import FiveSAuditList from "./components/FiveSAuditList";
import FiveSAuditCreate from "./components/FiveSAuditCreate";
import FiveSAuditExecution from "./components/FiveSAuditExecution";
import FiveSAuditScheduled from "./components/FiveSAuditScheduled";
import { PageContainer } from "@/components/layout/page-container";

import {
  createFiveSAudit,
  deleteFiveSAudit,
  startScheduledFiveSAudit,
  updateScheduledFiveSAuditSetup,
  useFiveSAuditStore,
} from "@/lib/five-s/audit-store";

import type {
  FiveSAudit,
  FiveSCategory,
  FiveSQuestion,
  FiveSSection,
} from "./types/five-s";
import { referenceFields } from "@/lib/five-s/reference-guides";
import { createAuditChecklistSnapshot } from "@/features/settings/custom-audit-questions/checklist";
import { AuditNav } from "./audit-nav";

/* =========================================================
   5S CHECKLIST
   ========================================================= */

const FIVE_S_QUESTIONS: Record<FiveSCategory, string[]> = {
  Sort: [
    "Are unnecessary tools, materials, and items removed from the work area?",
    "Are obsolete or unused items clearly identified and segregated?",
    "Are only required materials stored at the workstation?",
    "Are damaged, defective, or redundant items identified and removed?",
    "Are excess raw materials and work-in-progress controlled to required quantities?",
    "Are red-tagged or unwanted items reviewed and disposed of within the defined timeframe?",
    "Is there a clear process for deciding whether an item is required or unnecessary?",
  ],

  "Set in Order": [
    "Are tools and materials stored in clearly identified locations?",
    "Are storage locations visually marked and easy to identify?",
    "Can frequently used items be accessed without unnecessary movement?",
    "Are tools and materials arranged according to frequency of use?",
    "Are floor markings, location markings, and labels clearly visible?",
    "Are shadow boards, racks, cabinets, or storage systems properly organized?",
    "Does every required item have a defined and designated storage location?",
    "Are items returned to their designated locations after use?",
    "Are aisles, walkways, emergency routes, and access areas clearly identified and kept unobstructed?",
  ],

  Shine: [
    "Is the work area clean and free from visible dirt and waste?",
    "Are machines and equipment maintained in a clean condition?",
    "Are abnormal conditions identified during cleaning activities?",
    "Are floors, work surfaces, and surrounding areas cleaned regularly?",
    "Are oil, coolant, grease, dust, and other contamination controlled?",
    "Are cleaning tools and materials themselves clean, organized, and properly stored?",
    "Are leaks, damage, loose parts, or other abnormalities reported and addressed?",
    "Are cleaning and inspection activities performed according to the defined schedule?",
  ],

  Standardize: [
    "Are standard 5S procedures available and followed?",
    "Are visual standards available for the work area?",
    "Are cleaning and inspection responsibilities clearly defined?",
    "Are standard locations, markings, labels, and color codes consistently maintained?",
    "Are 5S standards displayed or easily accessible to employees?",
    "Are standard cleaning, inspection, and workplace organization schedules followed?",
    "Are deviations from the defined 5S standards identified and corrected?",
  ],

  Sustain: [
    "Are 5S practices consistently followed by employees?",
    "Are regular 5S audits conducted according to the defined schedule?",
    "Are previous audit findings reviewed and closed within the required timeframe?",
    "Are employees aware of their 5S responsibilities?",
    "Are recurring 5S problems identified and addressed?",
    "Are 5S improvements communicated to the relevant employees?",
    "Is management or area ownership involved in maintaining 5S standards?",
    "Is continuous improvement encouraged based on 5S audit findings?",
  ],
};

/* =========================================================
   CREATE SECTIONS
   ========================================================= */

function createEmptyFiveSSections(): FiveSSection[] {
  const categories: FiveSCategory[] = [
    "Sort",
    "Set in Order",
    "Shine",
    "Standardize",
    "Sustain",
  ];

  const createdAt = Date.now();

  return categories.map((category, sectionIndex) => {
    const questions: FiveSQuestion[] =
      FIVE_S_QUESTIONS[category].map(
        (questionText, questionIndex) => ({
          id: `Q-${createdAt}-${sectionIndex}-${questionIndex + 1}`,

          category,

          question: questionText,

          description:
            "Assess the workplace against the defined 5S requirement.",

          maxScore: 2,

          score: null,

          status: "Not Started",

          observation: "",

          evidence: [],

          actionRequired: false,
          ...referenceFields(category, questionIndex),
        })
      );

    return {
      category,

      description: getCategoryDescription(category),

      questions,

      score: 0,

      maxScore: questions.reduce(
        (total, question) =>
          total + question.maxScore,
        0
      ),
    };
  });
}

/* =========================================================
   CATEGORY DESCRIPTION
   ========================================================= */

function getCategoryDescription(
  category: FiveSCategory
): string {
  const descriptions: Record<FiveSCategory, string> = {
    Sort:
      "Remove unnecessary items from the workplace and keep only what is required.",

    "Set in Order":
      "Arrange required items so they are easy to identify, access, and return.",

    Shine:
      "Keep the workplace, equipment, and surrounding areas clean and maintained.",

    Standardize:
      "Establish consistent standards for workplace organization and cleanliness.",

    Sustain:
      "Maintain 5S practices through discipline, monitoring, and continuous improvement.",
  };

  return descriptions[category];
}

/* =========================================================
   PAGE
   ========================================================= */

export default function FiveSAuditListPage({ initialAuditId }: { initialAuditId?: string } = {}) {
  const audits = useFiveSAuditStore();

  const [selectedAudit, setSelectedAudit] =
    useState<FiveSAudit | null>(() => audits.find((audit) => audit.id === initialAuditId) ?? null);

  const [isCreatingAudit, setIsCreatingAudit] =
    useState(false);

  /* =======================================================
     START AUDIT
     ======================================================= */

  function handleStartAudit() {
    setSelectedAudit(null);
    setIsCreatingAudit(true);
  }

  /* =======================================================
     CREATE AUDIT
     ======================================================= */

  function handleCreateAudit(input: {
    title: string;
    plant: string;
    department: string;
    area: string;
    auditor: string;
    dueDate: string;
    startNow: boolean;
    scheduledDate?: string;
    scheduledTime?: string;
  }) {
    const sections = createAuditChecklistSnapshot(createEmptyFiveSSections());

    const audit =
      createFiveSAudit({
        title: input.title,
        plant: input.plant,
        department: input.department,
        area: input.area,
        auditor: input.auditor,
        dueDate: input.dueDate,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        sections,
      }, { startNow: input.startNow });

    setIsCreatingAudit(false);
    setSelectedAudit(audit);
  }

  /* =======================================================
     VIEW AUDIT
     ======================================================= */

  function handleViewAudit(
    audit: FiveSAudit
  ) {
    setIsCreatingAudit(false);
    setSelectedAudit(audit);
  }

  function handleStartScheduledAudit(audit: FiveSAudit) {
    const startedAudit = startScheduledFiveSAudit(audit.id);
    if (startedAudit) setSelectedAudit(startedAudit);
  }

  function handleUpdateScheduledAudit(audit: FiveSAudit, updates: Pick<FiveSAudit, "dueDate" | "scheduledDate" | "scheduledTime">) {
    const updatedAudit = updateScheduledFiveSAuditSetup(audit.id, updates);
    if (updatedAudit) setSelectedAudit(updatedAudit);
    return updatedAudit;
  }

  /* =======================================================
     DELETE AUDIT
     ======================================================= */

  function handleDeleteAudit(
    audit: FiveSAudit
  ) {
    deleteFiveSAudit(audit.id);

    if (
      selectedAudit?.id ===
      audit.id
    ) {
      setSelectedAudit(null);
    }

    setIsCreatingAudit(false);
  }

  /* =======================================================
     COMPLETE AUDIT
     ======================================================= */

  function handleCompleteAudit() {
    // The execution component is responsible
    // for updating the audit during assessment.
    // Returning here simply closes the execution view.
    setSelectedAudit(null);
    setIsCreatingAudit(false);
  }

  /* =======================================================
     BACK
     ======================================================= */

  function handleBack() {
    setSelectedAudit(null);
    setIsCreatingAudit(false);
  }

  /* =======================================================
     CREATE
     ======================================================= */

  if (isCreatingAudit) {
    return (
      <FiveSAuditCreate
        onBack={handleBack}
        onStart={handleCreateAudit}
      />
    );
  }

  /* =======================================================
     EXECUTION
     ======================================================= */

  if (selectedAudit) {
    if (selectedAudit.status === "Scheduled") {
      return <FiveSAuditScheduled audit={selectedAudit} onBack={handleBack} onStart={handleStartScheduledAudit} onUpdate={handleUpdateScheduledAudit} />;
    }
    return (
      <div className="grid gap-6">
        <FiveSAuditExecution
          audit={selectedAudit}
          onBack={handleBack}
          onComplete={handleCompleteAudit}
        />
      </div>
    );
  }

  /* =======================================================
     LISTING
     ======================================================= */

  return (
    <PageContainer>
      <FiveSAuditList
        audits={audits}
        onStartAudit={handleStartAudit}
        onViewAudit={handleViewAudit}
        onStartScheduledAudit={handleStartScheduledAudit}
        onDeleteAudit={handleDeleteAudit}
        nav={<AuditNav />}
      />
    </PageContainer>
  );
}
