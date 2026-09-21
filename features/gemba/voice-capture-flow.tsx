"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Mic, RotateCcw, Square, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_RECORDING_SECONDS, useAudioRecorder } from "@/lib/voice-capture/use-audio-recorder";
import { extractObservationDetails, transcribeAudio } from "@/lib/voice-capture/transcription-client";
import type { GembaObservationType, GembaVoiceNote } from "./types";

/**
 * Voice is an input method for the canonical Add Observation form, not a
 * separate workflow: this component only records, transcribes, and asks AI
 * to extract fields, then hands everything back in one shot. There is no
 * intermediate transcript-review or "suggested details" screen — the
 * canonical form (features/gemba/gemba-walk-page.tsx) is where the user
 * reviews/edits AI-filled values.
 */
export interface VoiceCaptureResult {
  title?: string;
  type?: GembaObservationType;
  description?: string;
  location?: string;
  voiceNote?: GembaVoiceNote;
  /** Non-blocking message for the canonical form when AI extraction failed but the transcript/audio is still usable. */
  notice?: string;
}

export interface VoiceCaptureContext {
  plant: string;
  zone: string;
  walkPurpose: string;
}

type Step = "record" | "processing";
type ProcessingPhase = "transcribing" | "analyzing" | "error";

export function VoiceCaptureFlow({
  selectedType,
  context,
  currentUserName,
  onCancel,
  onComplete,
}: {
  selectedType: GembaObservationType;
  context: VoiceCaptureContext;
  currentUserName: string;
  onCancel: () => void;
  onComplete: (result: VoiceCaptureResult) => void;
}) {
  const recorder = useAudioRecorder();
  const [step, setStep] = useState<Step>("record");
  const [phase, setPhase] = useState<ProcessingPhase>("transcribing");
  const [transcriptionError, setTranscriptionError] = useState("");
  const runIdRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recorder.state === "stopped" && recorder.audioBlob) {
      void runPipeline(recorder.audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state, recorder.audioBlob]);

  function buildVoiceNote(transcript?: string): GembaVoiceNote {
    return {
      id: `GEM-VOICE-${crypto.randomUUID()}`,
      durationSeconds: recorder.elapsedSeconds,
      mimeType: recorder.mimeType || "audio/webm",
      transcript,
      // This component unmounts right after onComplete (the dialog moves to the
      // canonical form), which runs useAudioRecorder's own cleanup effect and
      // revokes recorder.audioUrl. Mint an independent object URL from the same
      // Blob so the voice note stays playable afterward.
      audioUrl: recorder.audioBlob ? URL.createObjectURL(recorder.audioBlob) : undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUserName,
    };
  }

  async function runPipeline(blob: Blob) {
    const runId = ++runIdRef.current;
    setStep("processing");
    setTranscriptionError("");
    setPhase("transcribing");

    let transcript: string;
    try {
      const result = await transcribeAudio(blob);
      if (runId !== runIdRef.current) return;
      transcript = result.transcript;
    } catch (caught) {
      if (runId !== runIdRef.current) return;
      setPhase("error");
      setTranscriptionError(caught instanceof Error ? caught.message : "Transcription failed.");
      return;
    }

    setPhase("analyzing");
    try {
      const extracted = await extractObservationDetails(transcript, {
        plant: context.plant,
        zone: context.zone,
        walkPurpose: context.walkPurpose,
        selectedType,
      });
      if (runId !== runIdRef.current) return;
      onComplete({
        title: extracted.title || undefined,
        type: extracted.type ?? undefined,
        description: extracted.description || transcript,
        location: extracted.location || undefined,
        voiceNote: buildVoiceNote(transcript),
      });
    } catch {
      if (runId !== runIdRef.current) return;
      onComplete({
        description: transcript,
        voiceNote: buildVoiceNote(transcript),
        notice: "We couldn't fill all details automatically. Review and complete the observation below.",
      });
    }
  }

  function continueManually() {
    onComplete({ voiceNote: recorder.audioBlob ? buildVoiceNote() : undefined });
  }

  function cancelAll() {
    recorder.cancel();
    onCancel();
  }

  if (step === "record") {
    const blocked = !recorder.isSupported || recorder.state === "error";
    return (
      <div className="grid gap-4 py-2 text-center">
        <p className="text-sm leading-5 text-muted-foreground">Speak naturally. Mention what happened, where it happened, and any important details.</p>
        {blocked ? (
          <div className="grid gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] p-4">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle className="size-4" />
              {recorder.errorMessage || "Voice recording is not available in this browser."}
            </p>
            <p className="text-xs text-muted-foreground">You can continue and fill in the observation manually instead.</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "mx-auto grid size-20 place-items-center rounded-full border-2",
                recorder.state === "recording" ? "border-red-500 bg-red-500/10 text-red-600" : "border-muted-foreground/30 text-muted-foreground"
              )}
              aria-hidden
            >
              <Mic className="size-8" />
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatElapsed(recorder.elapsedSeconds)}</p>
            <p role="status" className="text-sm font-medium">
              {recorder.state === "recording" ? "Recording..." : recorder.state === "requesting" ? "Requesting microphone access..." : "Ready"}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">Recording stops automatically at {formatElapsed(MAX_RECORDING_SECONDS)}.</p>
          </>
        )}
        <div className="flex justify-center gap-2 pt-2">
          <Button type="button" variant="outline" onClick={cancelAll}>
            <X className="size-4" />
            Cancel
          </Button>
          {recorder.state === "recording" && (
            <Button type="button" onClick={() => recorder.stop()}>
              <Square className="size-4" />
              Stop Recording
            </Button>
          )}
          {blocked && (
            <Button type="button" onClick={continueManually}>
              Continue Manually
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 py-2">
      <ProcessingRow done label="Audio captured" detail={formatElapsed(recorder.elapsedSeconds)} />
      <ProcessingRow active={phase === "transcribing"} done={phase === "analyzing"} label="Transcribing speech..." detail="This may take a few seconds" />
      <ProcessingRow active={phase === "analyzing"} label="Analyzing context..." detail="Identifying key details" />
      {transcriptionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-700 dark:text-red-400">
          <p className="font-medium">Transcription failed</p>
          <p className="mt-1 text-xs leading-5">{transcriptionError} Your recording has been kept.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => recorder.audioBlob && void runPipeline(recorder.audioBlob)}>
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={continueManually}>
              Continue Manually
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessingRow({ label, detail, active, done }: { label: string; detail: string; active?: boolean; done?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px]",
          done ? "bg-emerald-500 text-white" : active ? "border-2 border-primary" : "border-2 border-muted-foreground/30"
        )}
      >
        {done ? "✓" : ""}
      </span>
      <span>
        <span className={cn("block font-medium", !active && !done && "text-muted-foreground")}>{label}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </div>
  );
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
