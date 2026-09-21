"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Info, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/components/preferences/use-i18n";
import { referenceText } from "@/lib/five-s/reference-guides";
import type { FiveSQuestion } from "../types/five-s";

export default function FiveSReferenceGuide({ question, questionText }: { question: FiveSQuestion; questionText: string }) {
  const { language, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);

  const title = referenceText(language, question.referenceTitleKey) || "Organization reference";
  const guidance = referenceText(language, question.referenceGuidanceKey) || question.description || "Use this image as guidance while assessing the organization question.";
  const alt = referenceText(language, question.referenceAltKey) || `Reference for ${questionText}`;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setFullScreen(false);
      setZoom(1);
      setFailed(false);
    }
  }

  if (!question.referenceImage) return null;

  const image = failed ? (
    <div className="flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted/60 px-6 text-center text-muted-foreground">
      <ImageOff className="size-9" aria-hidden="true" />
      <p className="text-sm font-medium">{t("audit.referenceUnavailable")}</p>
    </div>
  ) : question.questionSource === "custom" ? (
    // Custom references may be local data URLs or organization-hosted assets.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={question.referenceImage} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className="max-h-[58vh] w-full object-contain" />
  ) : (
    // The element only mounts after this guide opens, so none of the 39 assets are preloaded with the audit.
    <Image
      src={question.referenceImage}
      alt={alt}
      width={1440}
      height={960}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="max-h-[58vh] w-full object-contain"
    />
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 text-muted-foreground hover:text-primary"
              aria-label={t("audit.viewReference")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
            />
          }
        >
          <Info className="size-[18px]" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>{t("audit.viewReference")}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] gap-4 rounded-xl p-4 sm:max-w-[900px] sm:p-6">
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-2 top-2 size-11 sm:size-8" aria-label={t("common.close")} onClick={() => handleOpenChange(false)}><X /></Button>
          <DialogHeader className="pr-10">
            <DialogTitle>{t("audit.referenceGuide")}</DialogTitle>
            <DialogDescription className="text-base font-medium leading-6 text-foreground">{questionText}</DialogDescription>
          </DialogHeader>

          {!failed ? (
            <button
              type="button"
              className="group relative flex min-h-52 w-full items-center justify-center overflow-hidden rounded-lg border bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/[0.03]"
              aria-label={t("audit.openFullScreen")}
              onClick={() => setFullScreen(true)}
            >
              {image}
              <span className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-md bg-black/65 text-white opacity-100 shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
                <Maximize2 className="size-4" aria-hidden="true" />
              </span>
            </button>
          ) : image}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{t("audit.whatGoodLooksLike")}</p>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{guidance}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t("audit.referenceDisclaimer")}</p>
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.close")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fullScreen} onOpenChange={setFullScreen}>
        <DialogContent showCloseButton={false} className="inset-0 left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none bg-black p-0 ring-0">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{alt}</DialogDescription>
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-black/65 p-1 text-white">
            <Button type="button" variant="ghost" size="icon" className="size-11 text-white hover:bg-white/15 hover:text-white sm:size-9" aria-label={t("audit.zoomOut")} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}><Minus /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-11 text-white hover:bg-white/15 hover:text-white sm:size-9" aria-label={t("audit.resetZoom")} onClick={() => setZoom(1)}><RotateCcw /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-11 text-white hover:bg-white/15 hover:text-white sm:size-9" aria-label={t("audit.zoomIn")} onClick={() => setZoom((value) => Math.min(3, value + 0.25))}><Plus /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-11 text-white hover:bg-white/15 hover:text-white sm:size-9" aria-label={t("common.close")} onClick={() => setFullScreen(false)}><X /></Button>
          </div>
          <div className="flex h-full w-full items-center justify-center overflow-auto p-4 pt-16">
            {/* Custom references can be data URLs or organization-hosted assets. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {question.questionSource === "custom" ? <img src={question.referenceImage} alt={alt} className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `scale(${zoom})` }} /> : <Image src={question.referenceImage} alt={alt} width={1440} height={960} className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `scale(${zoom})` }} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
