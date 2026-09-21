"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Info, LoaderCircle, LockKeyhole } from "lucide-react";

import { getNextFiveSAuditTitle } from "@/lib/five-s/audit-store";
import { useCurrentUser } from "@/lib/current-user";
import {
  canAuditZone,
  toLocalInputDate,
  useFiveSZoneConfiguration,
} from "@/lib/five-s/configuration";
import FiveSPageHeader from "./FiveSPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/components/preferences/use-i18n";
import { useAdminUsers } from "@/features/five-s/administration/store";

interface FiveSAuditCreateProps {
  onBack: () => void;
  onStart: (audit: {
    title: string;
    plant: string;
    department: string;
    area: string;
    auditor: string;
    dueDate: string;
  }) => void;
}

function formatDate(value: string, locale: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function FieldInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`More information about ${label}`}
          />
        }
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 text-xs leading-5">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function ReadOnlyField({ label, value, placeholder, mono = false, helper }: { label: string; value?: string; placeholder: string; mono?: boolean; helper?: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex min-h-5 items-center gap-1.5">
        <Label>{label}</Label>
        {helper && <FieldInfo label={label}>{helper}</FieldInfo>}
      </div>
      <div
        className="flex h-11 min-h-11 items-center gap-2 rounded-md border border-input bg-muted/35 px-3 text-sm text-foreground"
        aria-label={`${label}: ${value || placeholder}`}
      >
        <LockKeyhole className="size-3.5 shrink-0 text-muted-foreground" />
        <span className={value ? (mono ? "font-mono font-medium" : "font-medium") : "text-muted-foreground"}>
          {value || placeholder}
        </span>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export default function FiveSAuditCreate({ onBack, onStart }: FiveSAuditCreateProps) {
  const { locale, t } = useI18n();
  const currentUser = useCurrentUser();
  const adminUser = useAdminUsers().find((user) => user.id === currentUser.id);
  const currentPlant = adminUser?.plant ?? currentUser.plant;
  const currentZone = adminUser?.zoneMemberships[0]?.zone ?? currentUser.primaryZone;
  const zoneConfiguration = useFiveSZoneConfiguration();
  const createdAt = useMemo(() => new Date(), []);
  const today = useMemo(() => toLocalInputDate(createdAt), [createdAt]);
  const defaultDueDate = useMemo(() => {
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 2);
    return toLocalInputDate(date);
  }, [createdAt]);

  const [zone, setZone] = useState<string>("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [starting, setStarting] = useState(false);

  const selectedZone = zoneConfiguration.find((item) => item.name === zone);
  const generatedAuditTitle = zone
    ? getNextFiveSAuditTitle(currentPlant, zone)
    : "";

  const createdDate = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(createdAt);
  const createdTime = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(createdAt);

  const ownZoneSelected = Boolean(zone && !canAuditZone({ primaryZone: currentZone }, zone));
  const isValid = Boolean(selectedZone && generatedAuditTitle && dueDate >= today && !ownZoneSelected);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid || !selectedZone || starting || !canAuditZone({ primaryZone: currentZone }, selectedZone.name)) return;

    setStarting(true);
    window.setTimeout(() => onStart({ title: generatedAuditTitle, plant: currentPlant, department: selectedZone.department, area: selectedZone.name, auditor: currentUser.name, dueDate }), 220);
  }

  return (
    <div className="min-h-full w-full">
      <div className="sticky top-0 z-30 -mx-6 border-b border-border bg-background/95 px-6 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:-mx-8 lg:px-8">
        <FiveSPageHeader
          eyebrow=""
          title="Create 5S Audit"
          description={generatedAuditTitle || t("audit.selectZoneForId")}
          className="border-b-0 pb-3"
          leading={
            <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label={t("common.back")} className="-ml-2 shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          }
          actions={
            <>
              <Button type="button" variant="outline" onClick={onBack}>{t("common.cancel")}</Button>
              <Button type="submit" form="five-s-audit-form" disabled={!isValid || starting}>
                {starting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Check className="size-4" />}
                {starting ? t("audit.starting") : t("audit.startAction")}
              </Button>
            </>
          }
        />
      </div>

      <div className="w-full px-6 py-5 lg:px-8 lg:py-6">
        <form id="five-s-audit-form" onSubmit={handleSubmit} className="mx-auto grid w-full max-w-[1600px] gap-5">
          <Card className="gap-0">
            <CardContent className="p-5 lg:p-6">
              <section>
                <h2 className="text-sm font-semibold">{t("audit.workplaceInformation")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("audit.workplaceHelp")}</p>

                <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  <ReadOnlyField label={t("audit.plant")} value={currentPlant} placeholder={t("audit.profilePlantUnavailable")} />

                  <div className="grid gap-2">
                    <Label>{t("audit.zone")}</Label>
                    <Select value={zone} onValueChange={(value) => setZone(value ?? "")}>
                      <SelectTrigger className="h-11 min-h-11 w-full px-3">
                        <SelectValue placeholder={t("audit.selectZone")} />
                      </SelectTrigger>
                      <SelectContent>
                        {zoneConfiguration.map((item) => (
                          <SelectItem key={item.code} value={item.name} disabled={item.name === currentZone}>{item.name}{item.name === currentZone ? ` — ${t("audit.ownZone")}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div key={`leader-${zone}`} className="motion-success-in"><ReadOnlyField label={t("audit.zoneLeader")} value={selectedZone?.leader} placeholder={t("audit.selectZoneFirst")} /></div>
                  <div key={`audit-${generatedAuditTitle}`} className="motion-success-in"><ReadOnlyField
                    label={t("audit.auditId")}
                    value={generatedAuditTitle}
                    placeholder={t("audit.generatedAfterZone")}
                    mono
                    helper={t("audit.generatedIdHelp")}
                  /></div>
                </div>
              </section>

              <section className="mt-5 border-t border-border/65 pt-5">
                <h2 className="text-sm font-semibold">{t("audit.details")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("audit.detailsHelp")}</p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <ReadOnlyField label={t("audit.auditor")} value={currentUser.name} placeholder={t("audit.auditorUnavailable")} />
                  <div className="grid gap-2">
                    <div className="flex min-h-5 items-center gap-1.5">
                      <Label htmlFor="five-s-due-date">{t("audit.dueDate")}</Label>
                      <FieldInfo label={t("audit.dueDate")}>
                        {formatDate(defaultDueDate, locale)}. {t("audit.dueDateHelp")}
                      </FieldInfo>
                    </div>
                    <Input
                      id="five-s-due-date"
                      type="date"
                      value={dueDate}
                      min={today}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="h-11 min-h-11 px-3"
                    />
                  </div>
                </div>
              </section>

              <section className="mt-5 border-t border-border/65 pt-5">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <h2 className="text-sm font-semibold">{t("audit.summary")}</h2>
                  <div className="mt-4 grid min-w-0 gap-x-5 gap-y-4 sm:grid-cols-2 2xl:grid-cols-4">
                    <SummaryItem label={t("audit.auditId")} value={generatedAuditTitle || t("audit.pendingZoneSelection")} mono />
                    <SummaryItem label={t("audit.plant")} value={currentPlant} />
                    <SummaryItem label={t("audit.zone")} value={selectedZone?.name || t("common.notSelected")} />
                    <SummaryItem label={t("audit.zoneLeader")} value={selectedZone?.leader || t("common.pending")} />
                    <SummaryItem label={t("audit.auditor")} value={currentUser.name} />
                    <SummaryItem label={t("common.created")} value={`${createdDate} · ${createdTime}`} />
                    <SummaryItem label={t("audit.schedule")} value={`${t("audit.due")} ${formatDate(dueDate, locale)}`} />
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>

        </form>
      </div>
    </div>
  );
}
