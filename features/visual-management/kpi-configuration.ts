export const KPI_LEVELS = ["unit", "functional"] as const;
export const KPI_BUCKETS = ["safety", "quality", "cost", "delivery", "people", "environment", "morale", "5s", "custom"] as const;
export const KPI_INDICATOR_TYPES = ["leading", "lagging"] as const;
export const KPI_MEASUREMENT_TYPES = ["count", "percentage", "number"] as const;
export const KPI_DIRECTIONS = ["higher_is_better", "lower_is_better", "target_exactly"] as const;
export const KPI_REVIEW_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export const SMART_DIMENSIONS = ["specific", "measurable", "achievable", "relevant", "timely"] as const;
export const SMART_STATUSES = ["complete", "missing_information", "needs_context"] as const;

export type KpiLevel = typeof KPI_LEVELS[number];
export type KpiBucket = typeof KPI_BUCKETS[number];
export type KpiIndicatorType = typeof KPI_INDICATOR_TYPES[number];
export type KpiMeasurementType = typeof KPI_MEASUREMENT_TYPES[number];
export type KpiDirection = typeof KPI_DIRECTIONS[number];
export type KpiReviewFrequency = typeof KPI_REVIEW_FREQUENCIES[number];
export type SmartDimension = typeof SMART_DIMENSIONS[number];
export type SmartStatus = typeof SMART_STATUSES[number];

export interface SmartDimensionResult { status: SmartStatus; explanation: string }
export type SmartAnalysis = Record<SmartDimension, SmartDimensionResult>;
export const KPI_FACT_KEYS = ["baseline", "target", "targetDate", "measurementContext"] as const;
export type KpiFactKey = typeof KPI_FACT_KEYS[number];
export type KpiFactSource = "objective" | "follow_up";
export type KpiFollowUpInputType = "number" | "text" | "date";
export interface KpiFollowUpQuestion { id: string; factKey: KpiFactKey; label: string; helperText?: string; inputType: KpiFollowUpInputType; unitHint?: string; required: boolean }
export interface KpiExtractedFacts { baseline: number | null; target: number | null; targetDate: string | null; measurementContext: string | null }
export type KpiConfirmedAnswers = Partial<Record<KpiFactKey, string>>;

export interface KpiAnalysisResult {
  smart: SmartAnalysis;
  complete: boolean;
  questions: KpiFollowUpQuestion[];
  suggestedKpiName: string;
  suggestedBucket: KpiBucket;
  suggestedIndicatorType: KpiIndicatorType;
  suggestedMeasurementType: KpiMeasurementType;
  suggestedDirection: KpiDirection;
  suggestedReviewFrequency?: KpiReviewFrequency;
  extractedFacts: KpiExtractedFacts;
  missingFacts: KpiFactKey[];
  draftSmartObjective: string;
  relationshipExplanation?: string;
}

export interface KpiDriverSuggestion { name: string; description: string }
export interface KpiAnalysisContext { level: KpiLevel; driver?: string; parentName?: string; functionName?: string }

export type KpiPerformanceThreshold =
  | { direction: "higher_is_better"; amberBoundary: number }
  | { direction: "lower_is_better"; amberBoundary: number }
  | { direction: "target_exactly"; amberLowerBound: number; amberUpperBound: number };
export type KpiPerformanceStatus = "green" | "amber" | "red" | "unavailable";

export interface VisualManagementKpiDefinition {
  id: string;
  level: KpiLevel;
  name: string;
  originalObjective: string;
  smartObjective: string;
  smartAnalysis: SmartAnalysis;
  bucket: KpiBucket;
  indicatorType: KpiIndicatorType;
  measurementType: KpiMeasurementType;
  direction: KpiDirection;
  baseline: number;
  target: number;
  targetDate: string;
  performanceThreshold?: KpiPerformanceThreshold;
  parentKpiId?: string;
  functionName?: string;
  ownerUserId?: string;
  reviewFrequency?: KpiReviewFrequency;
  relationshipExplanation?: string;
  /** Simplified Daily Management metadata. Optional for legacy KPI records. */
  simpleMetricType?: "numeric" | "event";
  unit?: string;
  eventCategories?: string[];
  aggregation?: "average" | "sum" | "latest";
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export const KPI_BUCKET_LABELS: Record<KpiBucket, string> = { safety: "Safety", quality: "Quality", cost: "Cost", delivery: "Delivery", people: "People", environment: "Environment", morale: "Morale", "5s": "5S", custom: "Custom" };
export const KPI_INDICATOR_TYPE_LABELS: Record<KpiIndicatorType, string> = { leading: "Leading Indicator", lagging: "Lagging Indicator" };
export const KPI_DIRECTION_LABELS: Record<KpiDirection, string> = { higher_is_better: "Higher is better", lower_is_better: "Lower is better", target_exactly: "Target exactly" };
export const KPI_MEASUREMENT_LABELS: Record<KpiMeasurementType, string> = { count: "Count", percentage: "Percentage", number: "Number" };
export const KPI_REVIEW_FREQUENCY_LABELS: Record<KpiReviewFrequency, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
export const KPI_FUNCTIONS = ["Production", "Quality", "Maintenance", "Warehouse", "Engineering", "EHS", "HR", "Procurement"] as const;

export function formatKpiNumericValue(value: number, measurementType: KpiMeasurementType) { return Number.isFinite(value) ? `${value}${measurementType === "percentage" ? "%" : ""}` : "Not provided"; }
export function formatKpiTarget(kpi: Pick<VisualManagementKpiDefinition, "direction" | "target" | "measurementType">) { const sign = kpi.direction === "higher_is_better" ? "≥" : kpi.direction === "lower_is_better" ? "≤" : "="; return `${sign} ${formatKpiNumericValue(kpi.target, kpi.measurementType)}`; }
export function resolveKpiOwnerName(ownerUserId: string | undefined, users: readonly { id: string; name: string }[]) { if (!ownerUserId) return "—"; return users.find((user) => user.id === ownerUserId)?.name ?? "Inactive or unavailable user"; }
export function getKpiThresholdPresentation(kpi: Pick<VisualManagementKpiDefinition, "direction" | "target" | "measurementType" | "performanceThreshold">) {
  if (!kpi.performanceThreshold || kpi.performanceThreshold.direction !== kpi.direction || validatePerformanceThreshold(kpi.direction, kpi.target, kpi.performanceThreshold)) return null;
  const target = formatKpiNumericValue(kpi.target, kpi.measurementType);
  if (kpi.direction === "higher_is_better" && "amberBoundary" in kpi.performanceThreshold) { const amber = formatKpiNumericValue(kpi.performanceThreshold.amberBoundary, kpi.measurementType); return { green: `≥ ${target}`, amber: `≥ ${amber} and < ${target}`, red: `< ${amber}` }; }
  if (kpi.direction === "lower_is_better" && "amberBoundary" in kpi.performanceThreshold) { const amber = formatKpiNumericValue(kpi.performanceThreshold.amberBoundary, kpi.measurementType); return { green: `≤ ${target}`, amber: `> ${target} and ≤ ${amber}`, red: `> ${amber}` }; }
  if (kpi.direction === "target_exactly" && "amberLowerBound" in kpi.performanceThreshold) { const lower = formatKpiNumericValue(kpi.performanceThreshold.amberLowerBound, kpi.measurementType); const upper = formatKpiNumericValue(kpi.performanceThreshold.amberUpperBound, kpi.measurementType); return { green: `= ${target}`, amber: `${lower} to ${upper}, excluding target`, red: `Outside ${lower} to ${upper}` }; }
  return null;
}

export function validatePerformanceThreshold(direction: KpiDirection, target: number, threshold?: KpiPerformanceThreshold) {
  if (!threshold || threshold.direction !== direction || !Number.isFinite(target)) return "Performance threshold configuration is required.";
  if (direction === "higher_is_better" && (!("amberBoundary" in threshold) || !Number.isFinite(threshold.amberBoundary) || threshold.amberBoundary >= target)) return "Amber boundary must be below the target.";
  if (direction === "lower_is_better" && (!("amberBoundary" in threshold) || !Number.isFinite(threshold.amberBoundary) || threshold.amberBoundary <= target)) return "Amber boundary must be above the target.";
  if (direction === "target_exactly" && (!("amberLowerBound" in threshold) || !("amberUpperBound" in threshold) || !Number.isFinite(threshold.amberLowerBound) || !Number.isFinite(threshold.amberUpperBound) || threshold.amberLowerBound >= target || threshold.amberUpperBound <= target)) return "Exact targets require an Amber lower bound below target and upper bound above target.";
  return undefined;
}

export function evaluateKpiPerformance(value: number, measurementType: KpiMeasurementType, direction: KpiDirection, target: number, threshold?: KpiPerformanceThreshold): KpiPerformanceStatus {
  if (!Number.isFinite(value) || !KPI_MEASUREMENT_TYPES.includes(measurementType) || validatePerformanceThreshold(direction, target, threshold)) return "unavailable";
  if (measurementType === "percentage" && (value < 0 || value > 100)) return "unavailable";
  if (direction === "higher_is_better") return value >= target ? "green" : value >= (threshold as Extract<KpiPerformanceThreshold, { direction: "higher_is_better" }>).amberBoundary ? "amber" : "red";
  if (direction === "lower_is_better") return value <= target ? "green" : value <= (threshold as Extract<KpiPerformanceThreshold, { direction: "lower_is_better" }>).amberBoundary ? "amber" : "red";
  if (value === target) return "green";
  const exact = threshold as Extract<KpiPerformanceThreshold, { direction: "target_exactly" }>;
  return value >= exact.amberLowerBound && value <= exact.amberUpperBound ? "amber" : "red";
}

function enumValue<T extends readonly string[]>(value: unknown, values: T): T[number] | null {
  return typeof value === "string" && values.includes(value) ? value as T[number] : null;
}
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export function parseKpiAnalysis(value: unknown): KpiAnalysisResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!candidate.smart || typeof candidate.smart !== "object") return null;
  const smart = {} as SmartAnalysis;
  for (const dimension of SMART_DIMENSIONS) {
    const raw = (candidate.smart as Record<string, unknown>)[dimension];
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const status = enumValue(item.status, SMART_STATUSES);
    const explanation = clean(item.explanation, 180);
    if (!status || !explanation) return null;
    smart[dimension] = { status, explanation };
  }
  const bucket = enumValue(candidate.suggestedBucket, KPI_BUCKETS);
  const indicator = enumValue(candidate.suggestedIndicatorType, KPI_INDICATOR_TYPES);
  const measurement = enumValue(candidate.suggestedMeasurementType, KPI_MEASUREMENT_TYPES);
  const direction = enumValue(candidate.suggestedDirection, KPI_DIRECTIONS);
  const name = clean(candidate.suggestedKpiName, 100);
  const objective = clean(candidate.draftSmartObjective, 600);
  if (!bucket || !indicator || !measurement || !direction || !name || !objective) return null;
  const rawFacts = candidate.extractedFacts && typeof candidate.extractedFacts === "object" ? candidate.extractedFacts as Record<string, unknown> : {};
  const numberOrNull = (raw: unknown) => typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  const extractedFacts: KpiExtractedFacts = { baseline: numberOrNull(rawFacts.baseline), target: numberOrNull(rawFacts.target), targetDate: /^\d{4}-\d{2}-\d{2}$/.test(String(rawFacts.targetDate ?? "")) ? String(rawFacts.targetDate) : null, measurementContext: clean(rawFacts.measurementContext, 160) || null };
  const missingFacts = Array.isArray(candidate.missingFacts) ? candidate.missingFacts.filter((item): item is KpiFactKey => KPI_FACT_KEYS.includes(item as KpiFactKey)) : [];
  const rawQuestions = candidate.followUpQuestions ?? candidate.questions;
  const questions = Array.isArray(rawQuestions) ? rawQuestions.slice(0, 5).flatMap((raw: unknown, index: number) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>; const factKey = enumValue(item.factKey ?? item.field, KPI_FACT_KEYS); const label = clean(item.label ?? item.question, 220); const inputType = enumValue(item.inputType, ["number", "text", "date"] as const) ?? (factKey === "targetDate" ? "date" : factKey === "measurementContext" ? "text" : "number");
    return factKey && label ? [{ id: clean(item.id, 60) || `question-${index + 1}`, factKey, label, helperText: clean(item.helperText, 220) || undefined, inputType, unitHint: clean(item.unitHint, 40) || undefined, required: item.required !== false }] : [];
  }) : [];
  const reviewFrequency = enumValue(candidate.suggestedReviewFrequency ?? candidate.reviewFrequencySuggestion, KPI_REVIEW_FREQUENCIES) ?? undefined;
  return { smart, complete: candidate.complete === true && missingFacts.length === 0, questions, suggestedKpiName: name, suggestedBucket: bucket, suggestedIndicatorType: indicator, suggestedMeasurementType: measurement, suggestedDirection: direction, suggestedReviewFrequency: reviewFrequency, extractedFacts, missingFacts, draftSmartObjective: objective, relationshipExplanation: clean(candidate.relationshipExplanation, 400) || undefined };
}

export function parseDriverSuggestions(value: unknown): KpiDriverSuggestion[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as Record<string, unknown>).suggestions)) return null;
  const suggestions = ((value as Record<string, unknown>).suggestions as unknown[]).slice(0, 5).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>; const name = clean(item.name, 100); const description = softenRelationshipCopy(clean(item.description, 240));
    return name && description ? [{ name, description }] : [];
  });
  return suggestions.length >= 1 ? suggestions : null;
}

export function formatNaturalKpiDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function softenRelationshipCopy(value: string) {
  return value
    .replace(/\bdirectly reduc(?:e|es|ing)\b/gi, "can contribute to reducing")
    .replace(/\bwill reduc(?:e|es)\b/gi, "can contribute to reducing")
    .replace(/\bguarantees?\b/gi, "can support")
    .replace(/\bensures?\b/gi, "can support")
    .replace(/\bprevents?\b/gi, "can help reduce");
}

export function normalizeKpiAnalysisForContext(analysis: KpiAnalysisResult, context: KpiAnalysisContext): KpiAnalysisResult {
  const functionalDriver = context.level === "functional" && Boolean(context.driver?.trim()) && Boolean(context.parentName?.trim());
  const firstPassYield = functionalDriver && /first pass yield/i.test(context.driver ?? analysis.suggestedKpiName);
  const targetDate = analysis.extractedFacts.targetDate;
  const smartObjective = targetDate ? analysis.draftSmartObjective.replaceAll(targetDate, formatNaturalKpiDate(targetDate)) : analysis.draftSmartObjective;
  const effectiveMeasurement = firstPassYield ? "percentage" : analysis.suggestedMeasurementType;
  const percentageUnitIsSafe = effectiveMeasurement === "percentage" && /yield|pass rate|compliance/i.test(analysis.suggestedKpiName);
  const questions = analysis.questions.map((question) => {
    if (question.factKey === "measurementContext") return { ...question, helperText: "Describe how this KPI is measured", unitHint: undefined };
    if (question.factKey === "baseline") return { ...question, helperText: "Enter the current value", unitHint: percentageUnitIsSafe ? "%" : undefined };
    if (question.factKey === "target") return { ...question, helperText: "Enter the target value", unitHint: percentageUnitIsSafe ? "%" : undefined };
    return { ...question, unitHint: undefined };
  });
  return { ...analysis, suggestedIndicatorType: functionalDriver ? "leading" : analysis.suggestedIndicatorType, suggestedMeasurementType: effectiveMeasurement, suggestedDirection: firstPassYield ? "higher_is_better" : analysis.suggestedDirection, questions, draftSmartObjective: smartObjective, relationshipExplanation: analysis.relationshipExplanation ? softenRelationshipCopy(analysis.relationshipExplanation) : undefined };
}

export function applyConfirmedKpiAnswers(analysis: KpiAnalysisResult, answers: KpiConfirmedAnswers): KpiAnalysisResult {
  const extractedFacts = { ...analysis.extractedFacts };
  for (const key of ["baseline", "target"] as const) {
    const raw = answers[key];
    if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) extractedFacts[key] = Number(raw);
  }
  if (typeof answers.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answers.targetDate)) extractedFacts.targetDate = answers.targetDate;
  if (typeof answers.measurementContext === "string" && answers.measurementContext.trim()) extractedFacts.measurementContext = answers.measurementContext.trim().slice(0, 160);
  const missingFacts = analysis.missingFacts.filter((key) => extractedFacts[key] === null);
  return { ...analysis, extractedFacts, missingFacts, questions: analysis.questions.filter((question) => missingFacts.includes(question.factKey)), complete: missingFacts.length === 0 };
}

export function validateKpiDefinition(input: VisualManagementKpiDefinition, existing: readonly VisualManagementKpiDefinition[]) {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "KPI name is required.";
  if (!input.originalObjective.trim()) errors.originalObjective = "Original objective is required.";
  if (!input.smartObjective.trim()) errors.smartObjective = "SMART objective is required.";
  if (!KPI_BUCKETS.includes(input.bucket)) errors.bucket = "Select a valid bucket.";
  if (!KPI_INDICATOR_TYPES.includes(input.indicatorType)) errors.indicatorType = "Select a valid indicator type.";
  if (!KPI_MEASUREMENT_TYPES.includes(input.measurementType)) errors.measurementType = "Select Count, Percentage, or Number.";
  if (!KPI_DIRECTIONS.includes(input.direction)) errors.direction = "Select a valid direction.";
  if (!Number.isFinite(input.baseline)) errors.baseline = "Baseline is required.";
  if (!Number.isFinite(input.target)) errors.target = "Target is required.";
  if (input.measurementType === "percentage" && (input.baseline < 0 || input.baseline > 100 || input.target < 0 || input.target > 100)) errors.measurement = "Percentages must be between 0 and 100.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.targetDate)) errors.targetDate = "Target date is required.";
  const thresholdError = validatePerformanceThreshold(input.direction, input.target, input.performanceThreshold);
  if (thresholdError) errors.performanceThreshold = thresholdError;
  if (input.level === "functional") {
    const parent = existing.find((item) => item.id === input.parentKpiId && item.level === "unit" && item.status === "active");
    if (!parent) errors.parentKpiId = "Select an active Unit KPI.";
    if (!input.functionName?.trim()) errors.functionName = "Function is required.";
    if (!input.ownerUserId) errors.ownerUserId = "KPI owner is required.";
    if (!input.reviewFrequency || !KPI_REVIEW_FREQUENCIES.includes(input.reviewFrequency)) errors.reviewFrequency = "Review frequency is required.";
  } else if (input.parentKpiId) errors.parentKpiId = "Unit KPIs cannot have a parent KPI.";
  return errors;
}
