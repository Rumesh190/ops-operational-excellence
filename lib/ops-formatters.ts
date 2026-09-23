/**
 * OPS Presentation Formatters
 * 
 * Shared formatting utilities for consistent data presentation
 * across the OPS application.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  return new Date(DATE_ONLY.test(value) ? `${value}T00:00:00` : value);
}

export function formatOpsDate(value?: string | Date) {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatOpsDateTime(value?: string | Date) {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const datePart = formatOpsDate(date);
  const timePart = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} · ${timePart}`;
}

export function formatOpsMoney(value?: number, fallback = "Non-financial") {
  if (typeof value !== "number") return fallback;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatOpsCount(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function formatOpsPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "percent",
    maximumFractionDigits,
  }).format(value / 100);
}

export function formatOpsRelativeDate(value: string | Date, now = new Date()) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = 86_400_000;
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((dateStart - nowStart) / day);
  const includesTime = value instanceof Date || !DATE_ONLY.test(value);
  const elapsed = now.getTime() - date.getTime();
  if (includesTime && elapsed >= 0 && elapsed < day) {
    const hours = Math.max(1, Math.floor(elapsed / 3_600_000));
    return `${hours}h ago`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return formatOpsDate(date);
}

/**
 * Format duration in days with human-readable singular/plural wording
 * User-facing presentation (Feedback #14)
 * 
 * @param days - Number of days
 * @returns Formatted string (e.g., "1 day", "3 days")
 */
export function formatDaysLabel(days: number): string {
  if (days === 1) {
    return '1 day';
  }
  return `${days} days`;
}

/**
 * Format days remaining for due dates with human-readable wording
 * User-facing presentation (Feedback #14)
 * 
 * @param days - Number of days remaining (positive = future, negative = overdue)
 * @returns Formatted string
 */
export function formatDaysRemaining(days: number): string {
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return '1 day remaining';
  }
  if (days > 1) {
    return `${days} days remaining`;
  }
  if (days === -1) {
    return 'Overdue by 1 day';
  }
  return `Overdue by ${Math.abs(days)} days`;
}