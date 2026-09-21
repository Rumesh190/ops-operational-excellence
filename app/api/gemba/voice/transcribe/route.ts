import { NextRequest, NextResponse } from "next/server";

import { GROQ_API_BASE, GROQ_TRANSCRIPTION_MODEL, describeGroqFailure, getGroqApiKey } from "@/lib/voice-capture/groq";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const LOG_CONTEXT = "gemba/voice/transcribe";

export async function POST(request: NextRequest) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.error(`[${LOG_CONTEXT}] GROQ_API_KEY is not set`);
    return NextResponse.json(
      { error: "Voice transcription is not configured on this server. Set GROQ_API_KEY to enable it." },
      { status: 501 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid audio upload." }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio was received." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Recording is too large to transcribe." }, { status: 413 });
  }
  if (audio.type && !audio.type.startsWith("audio/")) {
    return NextResponse.json({ error: "Unsupported audio format." }, { status: 400 });
  }

  // Groq's audio/transcriptions endpoint is OpenAI-compatible; the recorded
  // WebM/MP4/Ogg blob is forwarded as-is, same as before the provider switch.
  const upstreamForm = new FormData();
  upstreamForm.append("file", audio, "recording.webm");
  upstreamForm.append("model", GROQ_TRANSCRIPTION_MODEL);
  // No `language` field: omitting it lets Groq Whisper auto-detect the
  // spoken language (English/Tamil/mixed) instead of forcing English.

  try {
    const upstream = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      const failure = describeGroqFailure(upstream.status, detail, LOG_CONTEXT);
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    let result: { text?: string; language?: string };
    try {
      result = (await upstream.json()) as { text?: string; language?: string };
    } catch (caught) {
      console.error(`[${LOG_CONTEXT}] malformed provider response`, caught);
      return NextResponse.json({ error: "Transcription returned an unreadable response." }, { status: 502 });
    }
    if (!result.text) {
      return NextResponse.json({ error: "Transcription returned no text." }, { status: 502 });
    }
    return NextResponse.json({ transcript: result.text, language: result.language });
  } catch (caught) {
    console.error(`[${LOG_CONTEXT}] request failed`, caught);
    return NextResponse.json({ error: "Transcription service is unavailable. Please try again." }, { status: 502 });
  }
}
