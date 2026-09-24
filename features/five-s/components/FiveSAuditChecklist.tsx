"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  File,
  ImagePlus,
  Paperclip,
  Plus,
  Save,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { createAction } from "@/lib/actions/action-store";
import { optimizeEvidenceImage, MAX_EVIDENCE_IMAGES } from "@/lib/evidence-images";

import type {
  FiveSAudit,
  FiveSAuditStage,
  FiveSEvidence,
  FiveSQuestion,
  FiveSSection,
} from "../types/five-s";

/* =========================================================
   PROPS
   ========================================================= */

interface FiveSAuditExecutionProps {
  audit: FiveSAudit;

  onBack?: () => void;

  onComplete?: (
    audit: FiveSAudit
  ) => void;
}

/* =========================================================
   AUDIT STAGES
   ========================================================= */

type AuditStage =
  | "Draft"
  | "Scheduled"
  | "In Progress"
  | "Review"
  | "Complete";

const AUDIT_STAGES: Array<{
  label: AuditStage;
  percentage: number;
}> = [
  {
    label: "Draft",
    percentage: 0,
  },
  {
    label: "Scheduled",
    percentage: 25,
  },
  {
    label: "In Progress",
    percentage: 50,
  },
  {
    label: "Review",
    percentage: 75,
  },
  {
    label: "Complete",
    percentage: 100,
  },
];

/* =========================================================
   CATEGORIES
   ========================================================= */

const CATEGORY_ORDER: FiveSAuditStage[] = [
  "Sort",
  "Set in Order",
  "Shine",
  "Standardize",
  "Sustain",
  "General",
];

/* =========================================================
   SCORE OPTIONS
   ========================================================= */

const SCORE_OPTIONS = [0, 1, 2];

const SCORE_LABELS: Record<
  number,
  string
> = {
  0: "Non Compliance",
  1: "Partially Compliance",
  2: "Fully Compliance",
};

/* =========================================================
   SCORE COLORS
   ========================================================= */

function getScoreClass(
  score: number,
  selected: boolean
) {
  if (score === 0) {
    return selected
      ? "border-red-500 bg-red-500 text-white hover:bg-red-500"
      : "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40";
  }

  if (score === 1) {
    return selected
      ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-500"
      : "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40";
  }

  return selected
    ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600"
    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40";
}

/* =========================================================
   STAGE COLORS
   ========================================================= */

function getStageClass(
  stage: AuditStage,
  active: boolean,
  completed: boolean
) {
  if (completed) {
    return "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  }

  if (!active) {
    return "border-border bg-background text-muted-foreground";
  }

  switch (stage) {
    case "Draft":
      return "border-slate-400 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300";

    case "Scheduled":
      return "border-primary/55 bg-primary/8 text-primary dark:border-primary/45 dark:bg-primary/10";

    case "In Progress":
      return "border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400";

    case "Review":
      return "border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950/30 dark:text-purple-400";

    case "Complete":
      return "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";

    default:
      return "";
  }
}

/* =========================================================
   QUESTION STATE
   ========================================================= */

interface QuestionState {
  score: number | null;

  observation: string;

  actionRequired: boolean;

  actionId?: string;

  actionTitle: string;

  actionDescription: string;

  assignedTo: string;

  priority:
    | "Low"
    | "Medium"
    | "High"
    | "Critical";

  dueDate: string;

  evidence: FiveSEvidence[];
}

/* =========================================================
   INITIAL QUESTION STATE
   ========================================================= */

function createInitialQuestionState(
  question: FiveSQuestion,
  audit: FiveSAudit
): QuestionState {
  return {
    score: question.score,

    observation:
      question.observation ?? "",

    actionRequired:
      question.actionRequired,

    actionId:
      question.actionId,

    actionTitle: "",

    actionDescription:
      question.observation ?? "",

    assignedTo: "Rumesh Ravi",

    priority: "Medium",

    dueDate:
      audit.dueDate,

    evidence:
      question.evidence ?? [],
  };
}

/* =========================================================
   USERS
   =========================================================
   
   Demo users for MVP.
   Replace with users from your user-management module later.
   ========================================================= */

const ASSIGNEES = [
  "Rumesh Ravi",
  "Lakshman",
  "Suresh Kumar",
  "Priya S",
  "Rahul Menon",
  "Arun Kumar",
  "Meera",
  "Karthik Rao",
];

/* =========================================================
   COMPONENT
   ========================================================= */

function FiveSAuditExecution({
  audit,
  onBack,
  onComplete,
}: FiveSAuditExecutionProps) {
  /* =======================================================
     NORMALIZE SECTIONS
     ======================================================= */

  const initialSections =
    useMemo<FiveSSection[]>(
      () =>
        audit.sections
          .map((section) => ({
            ...section,

            questions:
              section.questions.map(
                (question) => ({
                  ...question,

                  evidence:
                    question.evidence ??
                    [],
                })
              ),
          }))
          .sort(
            (a, b) =>
              CATEGORY_ORDER.indexOf(
                a.category
              ) -
              CATEGORY_ORDER.indexOf(
                b.category
              )
          ),
      [audit]
    );

  /* =======================================================
     STATE
     ======================================================= */

  const [
    sections,
    setSections,
  ] = useState<FiveSSection[]>(
    initialSections
  );

  const [
    questionStates,
    setQuestionStates,
  ] = useState<
    Record<
      string,
      QuestionState
    >
  >(() => {
    const state: Record<
      string,
      QuestionState
    > = {};

    initialSections.forEach(
      (section) => {
        section.questions.forEach(
          (question) => {
            state[question.id] =
              createInitialQuestionState(
                question,
                audit
              );
          }
        );
      }
    );

    return state;
  });

  const [
    activeSectionIndex,
    setActiveSectionIndex,
  ] = useState(0);

  const [
    auditStage,
    setAuditStage,
  ] = useState<AuditStage>(
    "Draft"
  );

  const [
    showReview,
    setShowReview,
  ] = useState(false);

  const [
    showActionDialog,
    setShowActionDialog,
  ] = useState(false);

  const [
    selectedActionQuestion,
    setSelectedActionQuestion,
  ] =
    useState<FiveSQuestion | null>(
      null
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const cameraInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  /* =======================================================
     ACTIVE SECTION
     ======================================================= */

  const activeSection =
    sections[
      activeSectionIndex
    ];

  /* =======================================================
     ALL QUESTIONS
     ======================================================= */

  const allQuestions =
    useMemo(
      () =>
        sections.flatMap(
          (section) =>
            section.questions
        ),
      [sections]
    );

  /* =======================================================
     ANSWERED QUESTIONS
     ======================================================= */

  const answeredQuestions =
    allQuestions.filter(
      (question) =>
        questionStates[
          question.id
        ]?.score !== null &&
        questionStates[
          question.id
        ]?.score !== undefined
    ).length;

  /* =======================================================
     QUESTIONS REQUIRING ACTION
     ======================================================= */

  const questionsRequiringActions =
    allQuestions.filter(
      (question) =>
        questionStates[
          question.id
        ]?.actionRequired
    ).length;

  /* =======================================================
     ACTIONS CREATED
     ======================================================= */

  const questionsWithActions =
    allQuestions.filter(
      (question) =>
        questionStates[
          question.id
        ]?.actionId
    ).length;

  /* =======================================================
     COMPLETION
     ======================================================= */

  const completionPercentage =
    allQuestions.length > 0
      ? Math.round(
          (answeredQuestions /
            allQuestions.length) *
            100
        )
      : 0;

  /* =======================================================
     SCORE
     ======================================================= */

  const totalMaxScore = allQuestions.reduce((total, question) => total + question.maxScore, 0);

  const totalScore =
    allQuestions.reduce(
      (total, question) => {
        const score =
          questionStates[
            question.id
          ]?.score;

        return (
          total +
          (score ?? 0)
        );
      },
      0
    );

  const scorePercentage =
    totalMaxScore > 0
      ? Math.round(
          (totalScore /
            totalMaxScore) *
            100
        )
      : 0;

  /* =======================================================
     CURRENT STAGE INDEX
     ======================================================= */

  const currentStageIndex =
    AUDIT_STAGES.findIndex(
      (stage) =>
        stage.label === auditStage
    );

  /* =======================================================
     SECTION COMPLETE
     ======================================================= */

  function isSectionComplete(
    section: FiveSSection
  ) {
    return section.questions.every(
      (question) => {
        const state =
          questionStates[
            question.id
          ];

        /*
         * Every question needs a score.
         *
         * 0 and 1 additionally require
         * a corrective action.
         */

        if (
          state?.score === null ||
          state?.score === undefined
        ) {
          return false;
        }

        if (
          state.score <= 1 &&
          !state.actionId
        ) {
          return false;
        }

        return true;
      }
    );
  }

  /* =======================================================
     SECTION UNLOCK
     ======================================================= */

  function isSectionUnlocked(
    index: number
  ) {
    if (index === 0) {
      return true;
    }

    return isSectionComplete(
      sections[index - 1]
    );
  }

  /* =======================================================
     UPDATE QUESTION STATE
     ======================================================= */

  function updateQuestionState(
    questionId: string,
    updates: Partial<QuestionState>
  ) {
    setQuestionStates(
      (current) => ({
        ...current,

        [questionId]: {
          ...current[
            questionId
          ],

          ...updates,
        },
      })
    );

    setSections(
      (currentSections) =>
        currentSections.map(
          (section) => ({
            ...section,

            questions:
              section.questions.map(
                (question) =>
                  question.id ===
                  questionId
                    ? {
                        ...question,

                        score:
                          updates.score !==
                          undefined
                            ? updates.score
                            : question.score,

                        observation:
                          updates.observation !==
                          undefined
                            ? updates.observation
                            : question.observation,

                        actionRequired:
                          updates.actionRequired ??
                          question.actionRequired,

                        actionId:
                          updates.actionId ??
                          question.actionId,

                        evidence:
                          updates.evidence ??
                          question.evidence ??
                          [],
                      }
                    : question
              ),
          })
        )
    );
  }

  /* =======================================================
     SCORE CHANGE
     ======================================================= */

  function handleScoreChange(
    question: FiveSQuestion,
    score: number
  ) {
    const safeScore =
      Math.max(
        0,
        Math.min(2, score)
      );

    const currentState =
      questionStates[
        question.id
      ];

    /*
     * 0 and 1 require
     * corrective action.
     */

    const actionRequired =
      safeScore <= 1;

    updateQuestionState(
      question.id,
      {
        score:
          safeScore,

        actionRequired,

        /*
         * If the user changes
         * 0/1 to 2, existing action
         * is retained.
         */
        actionId:
          currentState?.actionId,
      }
    );

    /*
     * Once the first question
     * is scored, audit moves
     * from Draft/Scheduled to
     * In Progress.
     */

    if (
      auditStage === "Draft" ||
      auditStage === "Scheduled"
    ) {
      setAuditStage(
        "In Progress"
      );
    }

    /*
     * Automatically open the
     * corrective action dialog
     * for 0 and 1.
     */

    if (
      safeScore <= 1 &&
      !currentState?.actionId
    ) {
      setSelectedActionQuestion(
        question
      );

      setShowActionDialog(
        true
      );
    }
  }

  /* =======================================================
     OBSERVATION
     ======================================================= */

  function handleObservationChange(
    questionId: string,
    observation: string
  ) {
    updateQuestionState(
      questionId,
      {
        observation,

        actionDescription:
          observation,
      }
    );
  }

  /* =======================================================
     OPEN ACTION DIALOG
     ======================================================= */

  function handleOpenAction(
    question: FiveSQuestion
  ) {
    setSelectedActionQuestion(
      question
    );

    setShowActionDialog(
      true
    );
  }

  /* =======================================================
     CREATE ACTION
     ======================================================= */

  function handleCreateAction() {
    if (
      !selectedActionQuestion
    ) {
      return;
    }

    const question =
      selectedActionQuestion;

    const state =
      questionStates[
        question.id
      ];

    if (!state) {
      return;
    }

    if (state.actionId) {
      setShowActionDialog(
        false
      );

      return;
    }

    const section =
      sections.find(
        (item) =>
          item.questions.some(
            (itemQuestion) =>
              itemQuestion.id ===
              question.id
          )
      );

    if (!section) {
      return;
    }

    const title =
      state.actionTitle.trim() ||
      state.observation.trim() ||
      `Corrective action required for ${section.category}`;

    const description =
      state.actionDescription.trim() ||
      state.observation.trim() ||
      question.question;

    const action =
      createAction({
        auditId: audit.id,
        questionId: question.id,
        questionText: question.question,
        sectionId: section.category,
        title,

        description,

        source: "5S Audit",
        sourceModule: "audit",
        sourceId: audit.id,
        sourceTitle: audit.title,
        sourceLabel: "Audit",
        sourceLocation: `${audit.plant} · ${audit.area}`,
        sourceObservationId: question.id,
        sourceObservation: state.observation.trim() || question.question,

        category:
          section.category,

        plant:
          audit.plant,

        department:
          audit.department,

        area:
          audit.area,

        assignedTo:
          state.assignedTo,

        status: "Open",

        priority:
          state.priority,

        dueDate:
          state.dueDate ||
          audit.dueDate,
      });

    updateQuestionState(
      question.id,
      {
        actionRequired:
          true,

        actionId:
          action.id,
      }
    );

    setShowActionDialog(
      false
    );
  }

  /* =======================================================
     EVIDENCE HELPERS
     ======================================================= */

  async function createEvidence(
    file: File,
    type:
      | "image"
      | "document",
    evidenceId: number
  ) {
    if (
      !selectedEvidenceQuestion
    ) {
      return;
    }

    const questionId = selectedEvidenceQuestion.id;
    const currentEvidence = questionStates[questionId]?.evidence ?? [];
    if (currentEvidence.length >= MAX_EVIDENCE_IMAGES) { window.alert("Maximum 5 evidence images allowed."); return; }
    try {
      const { dataUrl, size } = await optimizeEvidenceImage(file);

      const evidence: FiveSEvidence =
        {
          id: `EV-${evidenceId}`,

          name: file.name,

          type,

          size,

          dataUrl,

          uploadedAt:
            new Date()
              .toISOString()
              .slice(0, 10),

          uploadedBy:
            "Rumesh Ravi",
        };

      updateQuestionState(
        questionId,
        {
          evidence: [
            ...currentEvidence,
            evidence,
          ],
        }
      );
    } catch (error) { window.alert(error instanceof Error ? error.message : "Unable to process this image."); }
  }

  /* =======================================================
     SELECTED EVIDENCE QUESTION
     ======================================================= */

  const [
    selectedEvidenceQuestion,
    setSelectedEvidenceQuestion,
  ] =
    useState<FiveSQuestion | null>(
      null
    );

  /* =======================================================
     FILE UPLOAD
     ======================================================= */

  function handleEvidenceUpload(
    question: FiveSQuestion
  ) {
    setSelectedEvidenceQuestion(
      question
    );

    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  }

  /* =======================================================
     CAMERA
     ======================================================= */

  function handleCameraCapture(
    question: FiveSQuestion
  ) {
    setSelectedEvidenceQuestion(
      question
    );

    window.setTimeout(() => {
      cameraInputRef.current?.click();
    }, 0);
  }

  /* =======================================================
     FILE CHANGE
     ======================================================= */

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const isImage =
      file.type.startsWith(
        "image/"
      );

    createEvidence(
      file,
      isImage
        ? "image"
        : "document",
      Date.now()
    );

    event.target.value = "";
  }

  /* =======================================================
     REMOVE EVIDENCE
     ======================================================= */

  function handleRemoveEvidence(
    questionId: string,
    evidenceId: string
  ) {
    const evidence =
      questionStates[
        questionId
      ]?.evidence ?? [];

    updateQuestionState(
      questionId,
      {
        evidence:
          evidence.filter(
            (item) =>
              item.id !==
              evidenceId
          ),
      }
    );
  }

  /* =======================================================
     NEXT SECTION
     ======================================================= */

  function handleNextSection() {
    const currentSection =
      sections[
        activeSectionIndex
      ];

    if (!currentSection) {
      return;
    }

    if (
      !isSectionComplete(
        currentSection
      )
    ) {
      return;
    }

    if (
      activeSectionIndex <
      sections.length - 1
    ) {
      setActiveSectionIndex(
        (current) =>
          current + 1
      );

      /*
       * The next section naturally
       * renders from Question 1.
       */

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setAuditStage(
      "Review"
    );

    setShowReview(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     PREVIOUS SECTION
     ======================================================= */

  function handlePreviousSection() {
    if (
      activeSectionIndex <=
      0
    ) {
      onBack?.();

      return;
    }

    setActiveSectionIndex(
      (current) =>
        current - 1
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     SAVE DRAFT
     ======================================================= */

  function handleSaveDraft() {
    setSaving(true);

    setAuditStage(
      "Draft"
    );

    window.setTimeout(() => {
      setSaving(false);
    }, 600);
  }

  /* =======================================================
     REVIEW
     ======================================================= */

  function handleOpenReview() {
    const allComplete =
      sections.every(
        (section) =>
          isSectionComplete(
            section
          )
      );

    if (!allComplete) {
      return;
    }

    setAuditStage(
      "Review"
    );

    setShowReview(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =======================================================
     COMPLETE AUDIT
     ======================================================= */

  function handleCompleteAudit() {
    const completedAudit: FiveSAudit =
      {
        ...audit,

        status:
          "Completed",

        score:
          totalScore,

        maxScore:
          totalMaxScore,

        completionPercentage:
          100,

        completedAt:
          new Date()
            .toISOString()
            .slice(0, 10),

        sections:
          sections.map(
            (section) => ({
              ...section,

              score:
                calculateSectionScore(
                  section
                ),

              maxScore:
                calculateSectionMaxScore(
                  section
                ),

              questions:
                section.questions.map(
                  (question) => {
                    const state =
                      questionStates[
                        question.id
                      ];

                    return {
                      ...question,

                      score:
                        state?.score ??
                        question.score,

                      observation:
                        state?.observation ??
                        question.observation,

                      actionRequired:
                        state?.actionRequired ??
                        question.actionRequired,

                      actionId:
                        state?.actionId ??
                        question.actionId,

                      evidence:
                        state?.evidence ??
                        question.evidence ??
                        [],
                    };
                  }
                ),
            })
          ),
      };

    setAuditStage(
      "Complete"
    );

    onComplete?.(
      completedAudit
    );
  }

  /* =======================================================
     SECTION SCORE
     ======================================================= */

  function calculateSectionScore(
    section: FiveSSection
  ) {
    return section.questions.reduce(
      (total, question) =>
        total +
        (questionStates[
          question.id
        ]?.score ?? 0),
      0
    );
  }

  /* =======================================================
     SECTION MAX SCORE
     ======================================================= */

  function calculateSectionMaxScore(
    section: FiveSSection
  ) {
    return (
      section.questions.length *
      2
    );
  }

  /* =======================================================
     REVIEW VIEW
     ======================================================= */

  if (showReview) {
    return (
      <div className="flex min-h-[calc(100vh-2rem)] flex-col">
        {/* =================================================
            FIXED REVIEW HEADER
            ================================================= */}

        <div className="sticky top-0 z-30 border-b bg-background/95 px-4 py-4 backdrop-blur lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowReview(
                    false
                  );

                  setAuditStage(
                    "In Progress"
                  );
                }}
              >
                <ArrowLeft className="size-4" />
              </Button>

              <div>
                <h1 className="text-xl font-semibold">
                  Review 5S Audit
                </h1>

                <p className="text-sm text-muted-foreground">
                  Review all findings before completing the audit.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={
                  handleSaveDraft
                }
                disabled={saving}
              >
                <Save className="mr-2 size-4" />

                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </Button>

              <Button
                type="button"
                onClick={
                  handleCompleteAudit
                }
              >
                <CheckCircle2 className="mr-2 size-4" />

                Complete Audit
              </Button>
            </div>
          </div>
        </div>

        {/* =================================================
            REVIEW CONTENT
            ================================================= */}

        <div className="flex-1 space-y-5 overflow-y-auto p-4 lg:p-6">
          {/* SUMMARY */}

        <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Completion
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {completionPercentage}%
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {answeredQuestions} /{" "}
                  {allQuestions.length} questions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Score
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {scorePercentage}%
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {totalScore} /{" "}
                  {totalMaxScore}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Corrective Actions
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {questionsRequiringActions}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Required
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  Actions Created
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {questionsWithActions}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Linked to this audit
                </p>
              </CardContent>
            </Card>
          </div>

          {/* REVIEW SECTIONS */}

          {sections.map(
            (section) => (
              <Card
                key={
                  section.category
                }
              >
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {
                          section.category
                        }
                      </CardTitle>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {
                          section.description
                        }
                      </p>
                    </div>

                    <Badge variant="secondary">
                      {calculateSectionScore(
                        section
                      )}{" "}
                      /{" "}
                      {calculateSectionMaxScore(
                        section
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pb-4">
                  <div className="space-y-2">
                    {section.questions.map(
                      (
                        question,
                        index
                      ) => {
                        const state =
                          questionStates[
                            question.id
                          ];

                        return (
                          <div
                            key={
                              question.id
                            }
                            className="rounded-lg border p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex gap-3">
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                  {index +
                                    1}
                                </div>

                                <div>
                                  <p className="text-sm font-medium">
                                    {
                                      question.question
                                    }
                                  </p>

                                  {state?.observation && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {
                                        state.observation
                                      }
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                {state?.score !==
                                  null &&
                                  state?.score !==
                                    undefined && (
                                    <Badge
                                      variant={
                                        state.score ===
                                        2
                                          ? "success"
                                          : state.score ===
                                              1
                                            ? "warning"
                                            : "danger"
                                      }
                                    >
                                      {
                                        state.score
                                      }{" "}
                                      / 2
                                    </Badge>
                                  )}

                                {state?.actionId && (
                                  <Badge variant="secondary">
                                    Action
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN AUDIT VIEW
     ======================================================= */

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-0 flex-col overflow-hidden">
      {/* =====================================================
          FIXED HEADER
          ===================================================== */}

      <div className="shrink-0 border-b bg-background">
        {/* HEADER */}

        <div className="flex flex-col gap-3 px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {onBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="shrink-0"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ClipboardCheck className="size-5 shrink-0 text-primary" />

                  <h1 className="truncate text-xl font-semibold tracking-tight">
                    {audit.title}
                  </h1>

                  <Badge variant="info">
                    5S Audit
                  </Badge>
                </div>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {audit.plant} ·{" "}
                  {audit.department} ·{" "}
                  {audit.area}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={
                  handleSaveDraft
                }
                disabled={saving}
              >
                <Save className="mr-2 size-4" />

                {saving
                  ? "Saving..."
                  : "Save Draft"}
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={
                  handleOpenReview
                }
                disabled={
                  !sections.every(
                    (section) =>
                      isSectionComplete(
                        section
                      )
                  )
                }
              >
                Review Audit
              </Button>
            </div>
          </div>
        </div>

        {/* =================================================
            STAGE PROGRESS
            ================================================= */}

        <div className="border-t px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between gap-2">
            {AUDIT_STAGES.map(
              (
                stage,
                index
              ) => {
                const active =
                  index ===
                  currentStageIndex;

                const completed =
                  index <
                  currentStageIndex;

                return (
                  <div
                    key={
                      stage.label
                    }
                    className="flex min-w-0 flex-1 items-center"
                  >
                    <div
                      className={[
                        "flex min-w-0 flex-1 items-center gap-2",
                        "rounded-lg border px-2 py-2",
                        getStageClass(
                          stage.label,
                          active,
                          completed
                        ),
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          completed
                            ? "bg-emerald-600 text-white"
                            : active
                              ? "bg-current/10"
                              : "bg-muted",
                        ].join(
                          " "
                        )}
                      >
                        {completed ? (
                          <Check className="size-3.5" />
                        ) : (
                          index + 1
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {
                            stage.label
                          }
                        </p>

                        <p className="text-[10px] opacity-70">
                          {
                            stage.percentage
                          }
                          %
                        </p>
                      </div>
                    </div>

                    {index <
                      AUDIT_STAGES.length -
                        1 && (
                      <div
                        className={[
                          "mx-1 h-px w-3 shrink-0",
                          index <
                          currentStageIndex
                            ? "bg-emerald-500"
                            : "bg-border",
                        ].join(
                          " "
                        )}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* =================================================
            SECTION NAVIGATION
            ================================================= */}

        <div className="border-t px-4 py-2 lg:px-6">
          <div className="grid grid-cols-5 gap-2">
            {sections.map(
              (
                section,
                index
              ) => {
                const sectionComplete =
                  isSectionComplete(
                    section
                  );

                const sectionUnlocked =
                  isSectionUnlocked(
                    index
                  );

                const isActive =
                  index ===
                  activeSectionIndex;

                const sectionAnswered =
                  section.questions.filter(
                    (question) =>
                      questionStates[
                        question.id
                      ]?.score !==
                        null &&
                      questionStates[
                        question.id
                      ]?.score !==
                        undefined
                  ).length;

                return (
                  <button
                    key={
                      section.category
                    }
                    type="button"
                    disabled={
                      !sectionUnlocked
                    }
                    onClick={() => {
                      if (
                        !sectionUnlocked
                      ) {
                        return;
                      }

                      setActiveSectionIndex(
                        index
                      );

                      window.scrollTo({
                        top: 0,
                        behavior:
                          "smooth",
                      });
                    }}
                    className={[
                      "min-w-0 rounded-md border px-2 py-2 text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/5"
                        : sectionUnlocked
                          ? "hover:bg-muted/40"
                          : "cursor-not-allowed bg-muted/20 opacity-50",
                    ].join(
                      " "
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold">
                        {index + 1}
                      </span>

                      {sectionComplete && (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs font-medium">
                      {
                        section.category
                      }
                    </p>

                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {sectionAnswered}/
                      {
                        section.questions
                          .length
                      }
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          SCROLLABLE QUESTION AREA
          ===================================================== */}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 lg:px-6">
        {activeSection && (
          <div className="mx-auto w-full max-w-6xl">
            {/* SECTION HEADER */}

            <Card className="mb-3">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {activeSectionIndex +
                          1}
                      </div>

                      <h2 className="text-base font-semibold">
                        {
                          activeSection.category
                        }
                      </h2>
                    </div>

                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {
                        activeSection.description
                      }
                    </p>
                  </div>

                  <Badge variant="secondary">
                    {calculateSectionScore(
                      activeSection
                    )}
                    /
                    {calculateSectionMaxScore(
                      activeSection
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* QUESTIONS */}

            <div className="space-y-3">
              {activeSection.questions.map(
                (
                  question,
                  questionIndex
                ) => {
                  const state =
                    questionStates[
                      question.id
                    ];

                  if (!state) {
                    return null;
                  }

                  const actionRequired =
                    state.score !==
                      null &&
                    state.score !==
                      undefined &&
                    state.score <=
                      1;

                  return (
                    <Card
                      key={
                        question.id
                      }
                      className="overflow-hidden"
                    >
                      <CardContent className="p-4">
                        {/* QUESTION */}

                        <div className="flex gap-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {questionIndex +
                              1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-5">
                              {
                                question.question
                              }
                            </p>

                            {question.description && (
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {
                                  question.description
                                }
                              </p>
                            )}
                          </div>

                          {state.score !==
                            null &&
                            state.score !==
                              undefined && (
                              <Badge
                                variant={
                                  state.score ===
                                  2
                                    ? "success"
                                    : state.score ===
                                        1
                                      ? "warning"
                                      : "danger"
                                }
                              >
                                {
                                  state.score
                                }
                                /2
                              </Badge>
                            )}
                        </div>

                        {/* SCORE */}

                        <div className="mt-4">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Assessment Score
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {SCORE_OPTIONS.map(
                              (score) => {
                                const selected =
                                  state.score ===
                                  score;

                                return (
                                  <button
                                    key={
                                      score
                                    }
                                    type="button"
                                    onClick={() =>
                                      handleScoreChange(
                                        question,
                                        score
                                      )
                                    }
                                    className={[
                                      "flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
                                      getScoreClass(
                                        score,
                                        selected
                                      ),
                                    ].join(
                                      " "
                                    )}
                                  >
                                    <span className="font-bold">
                                      {
                                        score
                                      }
                                    </span>

                                    <span>
                                      {
                                        SCORE_LABELS[
                                          score
                                        ]
                                      }
                                    </span>
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>

                        {/* OBSERVATION */}

                        <div className="mt-4">
                          <label
                            htmlFor={`observation-${question.id}`}
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Observation
                          </label>

                          <Textarea
                            id={`observation-${question.id}`}
                            value={
                              state.observation
                            }
                            onChange={(
                              event
                            ) =>
                              handleObservationChange(
                                question.id,
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Record your observation..."
                            className="mt-1.5 min-h-20 resize-y"
                          />
                        </div>

                        {/* ACTION + EVIDENCE */}

                        <div className="mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-2">
                            {/* FILE */}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleEvidenceUpload(
                                  question
                                )
                              }
                            >
                              <Paperclip className="mr-2 size-3.5" />

                              Attach Evidence
                            </Button>

                            {/* CAMERA */}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleCameraCapture(
                                  question
                                )
                              }
                            >
                              <Camera className="mr-2 size-3.5" />

                              Camera
                            </Button>

                            {/* ACTION */}

                            <Button
                              type="button"
                              variant={
                                actionRequired ||
                                state.actionId
                                  ? "secondary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleOpenAction(
                                  question
                                )
                              }
                            >
                              <Plus className="mr-2 size-3.5" />

                              {state.actionId
                                ? "View Action"
                                : "Corrective Action"}
                            </Button>
                          </div>

                          {/* EVIDENCE COUNT */}

                          {state.evidence
                            .length >
                            0 && (
                            <span className="text-xs text-muted-foreground">
                              {
                                state
                                  .evidence
                                  .length
                              }{" "}
                              evidence attached
                            </span>
                          )}
                        </div>

                        {/* ACTION REQUIRED */}

                        {actionRequired &&
                          !state.actionId && (
                            <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                              <AlertCircle className="size-3.5 shrink-0" />

                              Corrective action is required for this score.
                            </div>
                          )}

                        {/* ACTION CREATED */}

                        {state.actionId && (
                          <div className="mt-3 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="size-4 text-emerald-600" />

                              <div>
                                <p className="text-xs font-medium">
                                  Corrective action created
                                </p>

                                <p className="text-[10px] text-muted-foreground">
                                  {
                                    state.actionId
                                  }
                                </p>
                              </div>
                            </div>

                            <Badge variant="success">
                              Open
                            </Badge>
                          </div>
                        )}

                        {/* EVIDENCE LIST */}

                        {state.evidence
                          .length >
                          0 && (
                          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {state.evidence.map(
                              (
                                evidence
                              ) => (
                                <div
                                  key={
                                    evidence.id
                                  }
                                  className="flex items-center gap-2 rounded-md border bg-muted/20 p-2"
                                >
                                  {evidence.type ===
                                  "image" ? (
                                    <ImagePlus className="size-4 shrink-0 text-primary" />
                                  ) : (
                                    <File className="size-4 shrink-0 text-primary" />
                                  )}

                                  <span className="min-w-0 flex-1 truncate text-xs">
                                    {
                                      evidence.name
                                    }
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveEvidence(
                                        question.id,
                                        evidence.id
                                      )
                                    }
                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                    aria-label="Remove evidence"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>

            {/* =================================================
                NAVIGATION
                ================================================= */}

            <div className="mt-4 flex items-center justify-between gap-3 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={
                  handlePreviousSection
                }
              >
                <ArrowLeft className="mr-2 size-4" />

                {activeSectionIndex ===
                0
                  ? "Back"
                  : "Previous"}
              </Button>

              {activeSectionIndex <
                sections.length -
                  1 && (
                <Button
                  type="button"
                  disabled={
                    !isSectionComplete(
                      activeSection
                    )
                  }
                  onClick={
                    handleNextSection
                  }
                >
                  Next Section

                  <ArrowRight className="ml-2 size-4" />
                </Button>
              )}

              {activeSectionIndex ===
                sections.length -
                  1 && (
                <Button
                  type="button"
                  disabled={
                    !sections.every(
                      (
                        section
                      ) =>
                        isSectionComplete(
                          section
                        )
                    )
                  }
                  onClick={
                    handleOpenReview
                  }
                >
                  Review Audit

                  <ArrowRight className="ml-2 size-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          HIDDEN FILE INPUT
          ===================================================== */}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={
          handleFileChange
        }
      />

      {/* =====================================================
          CAMERA INPUT
          ===================================================== */}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={
          handleFileChange
        }
      />

      {/* =====================================================
          CORRECTIVE ACTION DIALOG
          ===================================================== */}

      <Dialog
        open={
          showActionDialog
        }
        onOpenChange={
          setShowActionDialog
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Corrective Action
            </DialogTitle>

            <DialogDescription>
              {selectedActionQuestion?.question}
            </DialogDescription>
          </DialogHeader>

          {selectedActionQuestion &&
            questionStates[
              selectedActionQuestion
                .id
            ] && (
              <div className="grid gap-5 py-2">
                {/* ACTION TITLE */}

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Action Title
                  </label>

                  <Input
                    value={
                      questionStates[
                        selectedActionQuestion
                          .id
                      ]
                        .actionTitle
                    }
                    onChange={(
                      event
                    ) =>
                      updateQuestionState(
                        selectedActionQuestion.id,
                        {
                          actionTitle:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="Enter corrective action..."
                  />
                </div>

                {/* DESCRIPTION */}

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Description
                  </label>

                  <Textarea
                    value={
                      questionStates[
                        selectedActionQuestion
                          .id
                      ]
                        .actionDescription
                    }
                    onChange={(
                      event
                    ) =>
                      updateQuestionState(
                        selectedActionQuestion.id,
                        {
                          actionDescription:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                    placeholder="Describe what needs to be done..."
                    className="min-h-24"
                  />
                </div>

                {/* ASSIGNED + PRIORITY */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">
                      Assigned To
                    </label>

                    <select
                      value={
                        questionStates[
                          selectedActionQuestion
                            .id
                        ]
                          .assignedTo
                      }
                      onChange={(
                        event
                      ) =>
                        updateQuestionState(
                          selectedActionQuestion.id,
                          {
                            assignedTo:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {ASSIGNEES.map(
                        (
                          user
                        ) => (
                          <option
                            key={
                              user
                            }
                            value={
                              user
                            }
                          >
                            {
                              user
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">
                      Priority
                    </label>

                    <select
                      value={
                        questionStates[
                          selectedActionQuestion
                            .id
                        ]
                          .priority
                      }
                      onChange={(
                        event
                      ) =>
                        updateQuestionState(
                          selectedActionQuestion.id,
                          {
                            priority:
                              event
                                .target
                                .value as
                                | "Low"
                                | "Medium"
                                | "High",
                          }
                        )
                      }
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="Low">
                        Low
                      </option>

                      <option value="Medium">
                        Medium
                      </option>

                      <option value="High">
                        High
                      </option>

                    </select>
                  </div>
                </div>

                {/* DUE DATE */}

                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Due Date
                  </label>

                  <Input
                    type="date"
                    value={
                      questionStates[
                        selectedActionQuestion
                          .id
                      ]
                        .dueDate
                    }
                    onChange={(
                      event
                    ) =>
                      updateQuestionState(
                        selectedActionQuestion.id,
                        {
                          dueDate:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  />
                </div>

                {/* OBSERVATION */}

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Audit Observation
                  </p>

                  <p className="mt-1 text-sm">
                    {questionStates[
                      selectedActionQuestion
                        .id
                    ].observation ||
                      "No observation entered."}
                  </p>
                </div>
              </div>
            )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setShowActionDialog(
                  false
                )
              }
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={
                handleCreateAction
              }
              disabled={
                !selectedActionQuestion ||
                Boolean(
                  selectedActionQuestion &&
                    questionStates[
                      selectedActionQuestion
                        .id
                    ]?.actionId
                )
              }
            >
              <Check className="mr-2 size-4" />

              Create Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FiveSAuditExecution;
