"use client";

export interface TranscriptionResult {
  transcript: string;
  language?: string;
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "audio";
}

export async function transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("audio", blob, `recording.${extensionFor(blob.type)}`);
  const response = await fetch("/api/gemba/voice/transcribe", { method: "POST", body: formData });
  const data = (await response.json().catch(() => null)) as { transcript?: string; language?: string; error?: string } | null;
  if (!response.ok || !data) throw new Error(data?.error || "Transcription failed. Please try again or continue manually.");
  if (!data.transcript) throw new Error("Transcription returned no text.");
  return { transcript: data.transcript, language: data.language };
}

export type ExtractedObservationType = "Positive" | "Opportunity" | "Issue" | null;

export interface ExtractedObservationDetails {
  title: string;
  type: ExtractedObservationType;
  description: string;
  location: string | null;
}

export interface ExtractObservationContext {
  plant: string;
  zone: string;
  walkPurpose: string;
  selectedType?: "Positive" | "Opportunity" | "Issue";
}

export async function extractObservationDetails(
  transcript: string,
  context: ExtractObservationContext
): Promise<ExtractedObservationDetails> {
  const response = await fetch("/api/gemba/voice/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, context }),
  });
  const data = (await response.json().catch(() => null)) as (ExtractedObservationDetails & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error || "Could not generate suggested details from this transcript.");
  return data;
}
