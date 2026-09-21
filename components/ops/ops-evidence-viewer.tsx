"use client";
/* eslint-disable @next/next/no-img-element -- evidence sources may be captured data URLs. */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OpsEvidenceViewer({ open, onOpenChange, src, title, description, alt }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string;
  title?: string;
  description: string;
  alt?: string;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden bg-zinc-950 p-0 text-white ring-white/15 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-6xl"><DialogHeader className="border-b border-white/10 px-4 py-3"><DialogTitle>{title || "Evidence preview"}</DialogTitle><DialogDescription className="text-zinc-400">{description}</DialogDescription></DialogHeader>{src && <div className="flex min-h-0 items-center justify-center overflow-auto p-3 sm:p-6"><img src={src} alt={alt || title || description} className="max-h-full max-w-full object-contain" /></div>}</DialogContent></Dialog>;
}
