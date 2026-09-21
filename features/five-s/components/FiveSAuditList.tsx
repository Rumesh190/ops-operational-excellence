"use client";

import {
  type MouseEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  Eye,
  FileBarChart,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ProgressBar } from "@/components/ui/progress-bar";
import FiveSPageHeader from "./FiveSPageHeader";
import { useI18n } from "@/components/preferences/use-i18n";
import { AUDIT_LIFECYCLE_STAGES, getAuditLifecycleStage, type AuditLifecycleStage } from "@/lib/five-s/lifecycle-status";

import {
  resetFiveSAudits,
} from "@/lib/five-s/audit-store";

import type { FiveSAudit } from "../types/five-s";

/* =========================================================
   PROPS
   ========================================================= */

interface FiveSAuditListProps {
  audits: FiveSAudit[];

  onStartAudit?: () => void;

  onViewAudit?: (
    audit: FiveSAudit
  ) => void;

  onDeleteAudit?: (
    audit: FiveSAudit
  ) => void;

  /** Optional navigation bar rendered between the page header and content. */
  nav?: React.ReactNode;
}

/* =========================================================
   FILTER TYPES
   ========================================================= */

type DateRange =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "quarter";

/* =========================================================
   DATE FILTER OPTIONS
   ========================================================= */

const DATE_RANGE_OPTIONS: {
  value: DateRange;
  label: string;
}[] = [
  {
    value: "all",
    label: "All time",
  },
  {
    value: "today",
    label: "Today",
  },
  {
    value: "7d",
    label: "Last 7 days",
  },
  {
    value: "30d",
    label: "Last 30 days",
  },
  {
    value: "quarter",
    label: "Last quarter",
  },
];

/* =========================================================
   STATUS BADGE
   ========================================================= */

function getLifecycleStatusVariant(stage: AuditLifecycleStage) {
  if (stage === "Completed") return "success" as const;
  if (stage === "Review") return "warning" as const;
  if (stage === "In Progress") return "info" as const;
  if (stage === "Draft") return "info" as const;
  return "muted" as const;
}

/* =========================================================
   CREATED DATE
   ========================================================= */

function getCreatedDate(
  audit: FiveSAudit
): Date | null {
  if (!audit.startedAt) {
    return null;
  }

  const date = new Date(
    `${audit.startedAt}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/* =========================================================
   CREATED DATE LABEL
   ========================================================= */

function formatCreatedDate(
  audit: FiveSAudit,
  locale: string
): string {
  const date =
    getCreatedDate(audit);

  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

/* =========================================================
   DATE RANGE MATCH
   ========================================================= */

function matchesDateRange(
  audit: FiveSAudit,
  range: DateRange
): boolean {
  if (range === "all") {
    return true;
  }

  const createdDate =
    getCreatedDate(audit);

  if (!createdDate) {
    return false;
  }

  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const createdStart = new Date(
    createdDate.getFullYear(),
    createdDate.getMonth(),
    createdDate.getDate()
  );

  const difference =
    todayStart.getTime() -
    createdStart.getTime();

  const days =
    difference /
    (1000 * 60 * 60 * 24);

  switch (range) {
    case "today":
      return days === 0;

    case "7d":
      return (
        days >= 0 &&
        days <= 7
      );

    case "30d":
      return (
        days >= 0 &&
        days <= 30
      );

    case "quarter":
      return (
        days >= 0 &&
        days <= 90
      );

    default:
      return true;
  }
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function FiveSAuditList({
  audits,
  onStartAudit,
  onViewAudit,
  onDeleteAudit,
  nav,
}: FiveSAuditListProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [
    search,
    setSearch,
  ] = useState("");

  /*
   * Keep every Select controlled from
   * the first render to avoid the Base UI
   * uncontrolled -> controlled warning.
   */

  const [
    status,
    setStatus,
  ] = useState<AuditLifecycleStage | "all">("all");

  const [
    plant,
    setPlant,
  ] = useState<string>("all");

  const [
    department,
    setDepartment,
  ] = useState<string>("all");

  const [
    dateRange,
    setDateRange,
  ] = useState<DateRange>("all");

  /* =========================================================
     UNIQUE PLANTS
     ========================================================= */

  const plants =
    useMemo(() => {
      return Array.from(
        new Set(
          audits
            .map(
              (audit) =>
                audit.plant
            )
            .filter(Boolean)
        )
      ).sort();
    }, [audits]);

  /* =========================================================
     UNIQUE DEPARTMENTS
     ========================================================= */

  const departments =
    useMemo(() => {
      return Array.from(
        new Set(
          audits
            .map(
              (audit) =>
                audit.department
            )
            .filter(Boolean)
        )
      ).sort();
    }, [audits]);

  /* =========================================================
     FILTERED AUDITS
     ========================================================= */

  const filteredAudits =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return audits.filter(
        (audit) => {
          const matchesSearch =
            query === "" ||
            audit.id
              .toLowerCase()
              .includes(query) ||
            audit.title
              .toLowerCase()
              .includes(query) ||
            audit.department
              .toLowerCase()
              .includes(query) ||
            audit.plant
              .toLowerCase()
              .includes(query) ||
            audit.area
              .toLowerCase()
              .includes(query) ||
            audit.auditor
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            status === "all" ||
            getAuditLifecycleStage(audit) === status;

          const matchesPlant =
            plant === "all" ||
            audit.plant === plant;

          const matchesDepartment =
            department === "all" ||
            audit.department ===
              department;

          const matchesDate =
            matchesDateRange(
              audit,
              dateRange
            );

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPlant &&
            matchesDepartment &&
            matchesDate
          );
        }
      );
    }, [
      audits,
      search,
      status,
      plant,
      department,
      dateRange,
    ]);

  /* =========================================================
     ACTIVE FILTERS
     ========================================================= */

  const hasActiveFilters =
    search.trim() !== "" ||
    status !== "all" ||
    plant !== "all" ||
    department !== "all" ||
    dateRange !== "all";

  /* =========================================================
     CLEAR FILTERS
     ========================================================= */

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPlant("all");
    setDepartment("all");
    setDateRange("all");
  }

  /* =========================================================
     ROW CLICK
     ========================================================= */

  function handleRowClick(
    audit: FiveSAudit
  ) {
    onViewAudit?.(audit);
  }

  /* =========================================================
     DELETE
     ========================================================= */

  function handleDelete(
    event: MouseEvent<HTMLButtonElement>,
    audit: FiveSAudit
  ) {
    event.stopPropagation();

    onDeleteAudit?.(audit);
  }

  /* =========================================================
     VIEW
     ========================================================= */

  function handleView(
    event: MouseEvent<HTMLButtonElement>,
    audit: FiveSAudit
  ) {
    event.stopPropagation();

    onViewAudit?.(audit);
  }

  function handleViewReport(
    event: MouseEvent<HTMLButtonElement>,
    audit: FiveSAudit
  ) {
    event.stopPropagation();
    router.push(`/5s/audits/${encodeURIComponent(audit.id)}/report?from=listing`);
  }

  /* =========================================================
     RESTORE DEMO DATA
     ========================================================= */

  function handleRestoreDemoData(
    event: MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();

    const confirmed =
      window.confirm(
        "Restore the original 5S demo audits? This will replace the current 5S audit list."
      );

    if (!confirmed) {
      return;
    }

    resetFiveSAudits();
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="grid gap-4">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <FiveSPageHeader
        eyebrow="OPS Workspace"
        title="Audits"
        description={`${audits.length} audits across all plants`}
        actions={
          <>
          {/* Restore Demo Data */}

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={
              handleRestoreDemoData
            }
            aria-label="Restore demo data"
            title="Restore demo data"
            className="text-muted-foreground"
          >
            <RefreshCcw className="size-4" />
          </Button>

          {/* Start Audit */}

          <Button
            type="button"
            onClick={
              onStartAudit
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t("audit.start")}
          </Button>
          </>
        }
      >

      {/* =====================================================
          SEARCH
          ===================================================== */}

      <div className="contents">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <InputGroup className="w-full sm:w-[360px] lg:w-[420px]">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>

            <InputGroupInput
              type="search"
              placeholder={`${t("common.search")}...`}
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Search 5S audits"
            />
          </InputGroup>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                clearFilters
              }
            >
              <X className="size-4" />
              Clear
            </Button>
          )}
        </div>

      {/* =====================================================
          FILTER BAR
          ===================================================== */}

        <div className="flex flex-wrap items-center gap-2">
        {/* STATUS */}

        <Select
          value={status}
          onValueChange={(
            value
          ) => {
            setStatus(
              (value ??
                "all") as
                | AuditLifecycleStage
                | "all"
            );
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by status"
          >
            <SelectValue>
              {(
                value: string | null
              ) => {
                if (
                  value ===
                    "all" ||
                  value == null
                ) {
                  return "All statuses";
                }

                return value;
              }}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All statuses
            </SelectItem>

            {AUDIT_LIFECYCLE_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* PLANT */}

        <Select
          value={plant}
          onValueChange={(
            value
          ) => {
            setPlant(
              value ?? "all"
            );
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by plant"
          >
            <SelectValue>
              {(
                value: string | null
              ) => {
                if (
                  value ===
                    "all" ||
                  value == null
                ) {
                  return "All plants";
                }

                return value;
              }}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All plants
            </SelectItem>

            {plants.map(
              (item) => (
                <SelectItem
                  key={item}
                  value={item}
                >
                  {item}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* DEPARTMENT */}

        <Select
          value={department}
          onValueChange={(
            value
          ) => {
            setDepartment(
              value ?? "all"
            );
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by department"
          >
            <SelectValue>
              {(
                value: string | null
              ) => {
                if (
                  value ===
                    "all" ||
                  value == null
                ) {
                  return "All departments";
                }

                return value;
              }}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">
              All departments
            </SelectItem>

            {departments.map(
              (item) => (
                <SelectItem
                  key={item}
                  value={item}
                >
                  {item}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        {/* DATE RANGE */}

        <Select
          value={dateRange}
          onValueChange={(
            value
          ) => {
            setDateRange(
              (value ??
                "all") as DateRange
            );
          }}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by date range"
          >
            <SelectValue>
              {(
                value: string | null
              ) => {
                return (
                  DATE_RANGE_OPTIONS.find(
                    (
                      option
                    ) =>
                      option.value ===
                      value
                  )?.label ??
                  "All time"
                );
              }}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            {DATE_RANGE_OPTIONS.map(
              (option) => (
                <SelectItem
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        </div>
      </div>
      </FiveSPageHeader>

      {nav}

      {/* =====================================================
          TABLE
          ===================================================== */}

      <div className="grid gap-3 md:hidden">
        {filteredAudits.map((audit) => {
          const score = audit.maxScore > 0 ? Math.round((audit.score / audit.maxScore) * 100) : 0;
          return <article key={audit.id} onClick={() => handleRowClick(audit)} className="min-w-0 rounded-xl border bg-card p-4 shadow-sm active:bg-muted/40">
            <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="break-words text-base font-semibold leading-6">{audit.title}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{audit.area} · {audit.plant}</p></div><Badge variant={getLifecycleStatusVariant(getAuditLifecycleStage(audit))}>{getAuditLifecycleStage(audit)}</Badge></div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3 text-sm"><div className="min-w-0"><dt className="text-xs text-muted-foreground">{t("audit.auditor")}</dt><dd className="mt-1 break-words font-medium">{audit.auditor}</dd></div><div><dt className="text-xs text-muted-foreground">{t("audit.score")}</dt><dd className="mt-1 font-semibold">{score}%</dd></div><div><dt className="text-xs text-muted-foreground">{t("common.progress")}</dt><dd className="mt-1 font-medium">{audit.completionPercentage}%</dd></div><div><dt className="text-xs text-muted-foreground">{t("common.created")}</dt><dd className="mt-1 font-medium">{formatCreatedDate(audit, locale)}</dd></div></dl>
            <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" onClick={(event) => handleView(event, audit)}><Eye className="size-4" /> {t("common.view")}</Button>{audit.status === "Completed" ? <Button onClick={(event) => handleViewReport(event, audit)}><FileBarChart className="size-4" /> {t("common.report")}</Button> : <Button onClick={(event) => handleView(event, audit)}>{t("common.continue")}</Button>}</div>
          </article>;
        })}
      </div>

      <Card className="hidden overflow-hidden md:block">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[900px] table-fixed border-collapse">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
              </colgroup>

              {/* =================================================
                  HEADER
                  ================================================= */}

              <thead>
                <tr className="border-b border-border/65 bg-muted/35">
                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Audit
                  </th>

                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("audit.plant")} / {t("audit.zone")}
                  </th>

                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("audit.auditor")}
                  </th>

                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("common.created")}
                  </th>

                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Progress
                  </th>

                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("audit.score")}
                  </th>

                  <th className="h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {t("common.status")}
                  </th>

                  <th className="h-11 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              {/* =================================================
                  BODY
                  ================================================= */}

              <tbody>
                {filteredAudits.map(
                  (audit) => {
                    const score =
                      audit.maxScore >
                      0
                        ? Math.round(
                            (audit.score /
                              audit.maxScore) *
                              100
                          )
                        : 0;

                    const progress =
                      Math.min(
                        Math.max(
                          audit.completionPercentage,
                          0
                        ),
                        100
                      );

                    return (
                      <tr
                        key={
                          audit.id
                        }
                        onClick={() =>
                          handleRowClick(
                            audit
                          )
                        }
                        className="group cursor-pointer border-b border-border/50 transition-colors hover:bg-primary/[0.025] last:border-0 dark:hover:bg-white/[0.025]"
                      >
                        {/* AUDIT */}

                        <td className="px-4 py-3.5 align-middle">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {
                                audit.title
                              }
                            </p>

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {
                                audit.department
                              }
                            </p>
                          </div>
                        </td>

                        {/* PLANT / AREA */}

                        <td className="px-4 py-3.5 align-middle">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">
                              {
                                audit.plant
                              }
                            </p>

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {
                                audit.area
                              }
                            </p>
                          </div>
                        </td>

                        {/* AUDITOR */}

                        <td className="px-4 py-3.5 align-middle">
                          <p className="truncate text-sm text-foreground">
                            {
                              audit.auditor
                            }
                          </p>
                        </td>

                        {/* CREATED */}

                        <td className="px-4 py-3.5 align-middle">
                          <p className="whitespace-nowrap text-sm text-foreground">
                            {formatCreatedDate(
                              audit,
                              locale
                            )}
                          </p>
                        </td>

                        {/* PROGRESS */}

                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex min-w-0 items-center gap-3">
                            <ProgressBar
                              value={
                                progress
                              }
                              className="min-w-0 flex-1"
                            />

                            <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                              {
                                progress
                              }
                              %
                            </span>
                          </div>
                        </td>

                        {/* SCORE */}

                        <td className="px-4 py-3.5 align-middle">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {score}%
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {
                                audit.score
                              }{" "}
                              /{" "}
                              {
                                audit.maxScore
                              }
                            </p>
                          </div>
                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-3.5 align-middle">
                          <Badge variant={getLifecycleStatusVariant(getAuditLifecycleStage(audit))} className="whitespace-nowrap">
                            {getAuditLifecycleStage(audit)}
                          </Badge>
                        </td>

                        {/* ACTIONS */}

                        <td
                          className="px-4 py-3.5 align-middle text-right"
                          onClick={(
                            event
                          ) =>
                            event.stopPropagation()
                          }
                        >
                          <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${audit.title}`}
                              title="View audit"
                              onClick={(
                                event
                              ) =>
                                handleView(
                                  event,
                                  audit
                                )
                              }
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="size-4" />
                            </Button>

                            {audit.status === "Completed" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View report for ${audit.title}`}
                                title="View audit report"
                                onClick={(event) => handleViewReport(event, audit)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <FileBarChart className="size-4" />
                              </Button>
                            )}

                            {onDeleteAudit && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Delete ${audit.title}`}
                                title="Delete audit"
                                onClick={(
                                  event
                                ) =>
                                  handleDelete(
                                    event,
                                    audit
                                  )
                                }
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}

                {/* =================================================
                    EMPTY STATE
                    ================================================= */}

                {filteredAudits.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-16 text-center"
                    >
                      <Filter className="mx-auto size-8 text-muted-foreground/50" />

                      <p className="mt-3 text-sm font-medium text-foreground">
                        No audits found
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Try changing your
                        search or filters.
                      </p>

                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={
                            clearFilters
                          }
                          className="mt-4"
                        >
                          Clear filters
                        </Button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
