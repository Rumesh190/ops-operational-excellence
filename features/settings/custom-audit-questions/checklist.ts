import type { FiveSAuditStage, FiveSQuestion, FiveSSection } from "@/features/five-s/types/five-s";
import { getActiveCustomAuditQuestions } from "./store";
import type { CustomAuditQuestion } from "./types";

const STAGES: FiveSAuditStage[] = ["Sort", "Set in Order", "Shine", "Standardize", "Sustain", "General"];

function toSnapshot(question: CustomAuditQuestion): FiveSQuestion {
  return {
    id: `Q-CUSTOM-${crypto.randomUUID()}`,
    category: question.stage,
    question: question.question,
    description: question.instruction,
    referenceImage: question.referenceImage,
    maxScore: question.responseType === "Compliance" ? 2 : 0,
    score: null,
    status: "Not Started",
    observation: "",
    evidence: [],
    actionRequired: false,
    questionSource: "custom",
    customQuestionId: question.id,
    responseType: question.responseType,
    mandatory: question.mandatory,
    requireEvidenceOnNonCompliance: question.requireEvidenceOnNonCompliance,
    textResponse: "",
  };
}

export function createAuditChecklistSnapshot(
  standardSections: FiveSSection[],
  customQuestions: CustomAuditQuestion[] = getActiveCustomAuditQuestions(),
) {
  const active = customQuestions.filter((question) => question.active);
  const sections = standardSections.map((section) => {
    const custom = active
      .filter((question) => question.stage === section.category)
      .sort((a, b) => a.order - b.order)
      .map(toSnapshot);
    const standard = section.questions.map((question) => ({
      ...question,
      evidence: [...(question.evidence ?? [])],
      questionSource: question.questionSource ?? "standard" as const,
      responseType: question.responseType ?? "Compliance" as const,
      mandatory: question.mandatory ?? true,
    }));
    const questions = [...standard, ...custom];
    return {
      ...section,
      questions,
      score: 0,
      maxScore: questions.reduce((total, question) => total + question.maxScore, 0),
    };
  });
  const general = active
    .filter((question) => question.stage === "General")
    .sort((a, b) => a.order - b.order)
    .map(toSnapshot);
  if (general.length) {
    sections.push({
      category: "General",
      description: "Organization-specific questions and additional workplace observations.",
      questions: general,
      score: 0,
      maxScore: general.reduce((total, question) => total + question.maxScore, 0),
    });
  }
  return STAGES.flatMap((stage) => sections.filter((section) => section.category === stage));
}

export function isAuditQuestionAnswered(question: FiveSQuestion) {
  const responseType = question.responseType ?? "Compliance";
  if (responseType === "Text") return Boolean(question.textResponse?.trim()) || question.mandatory === false;
  if (responseType === "Yes / No") return Boolean(question.yesNoResponse) || question.mandatory === false;
  return question.score !== null || question.mandatory === false;
}

export interface AuditQuestionAnswerState {
  score: number | null;
  observation?: string;
  actionId?: string;
  evidence?: unknown[];
  textResponse?: string;
  yesNoResponse?: "Yes" | "No";
}

export function isAuditQuestionComplete(question: FiveSQuestion, answer: AuditQuestionAnswerState) {
  const responseType = question.responseType ?? "Compliance";
  const optionalCustom = question.questionSource === "custom" && question.mandatory === false;
  if (responseType === "Text") return optionalCustom || Boolean(answer.textResponse?.trim());
  if (responseType === "Yes / No") return optionalCustom || Boolean(answer.yesNoResponse);
  if (answer.score === null) return optionalCustom;
  if ((answer.score === 0 || answer.score === 1) && !answer.observation?.trim()) return false;
  if ((answer.score === 0 || answer.score === 1) && !answer.actionId) return false;
  const requiresEvidence = question.questionSource !== "custom" || Boolean(question.requireEvidenceOnNonCompliance);
  if ((answer.score === 0 || answer.score === 1) && requiresEvidence && !answer.evidence?.length) return false;
  return true;
}
