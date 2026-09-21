import { NextRequest, NextResponse } from "next/server";

import { GROQ_API_BASE, GROQ_EXTRACTION_MODEL, describeGroqFailure, getGroqApiKey } from "@/lib/voice-capture/groq";

export const runtime = "nodejs";

const VALID_TYPES = ["Positive", "Opportunity", "Issue"] as const;
const MAX_TRANSCRIPT_LENGTH = 4000;
const LOG_CONTEXT = "gemba/voice/extract";

interface ExtractRequestBody {
  transcript?: string;
  context?: {
    plant?: string;
    zone?: string;
    walkPurpose?: string;
    selectedType?: string;
  };
}

const SYSTEM_PROMPT =
  'You convert a shop-floor Gemba walk voice note transcript into a structured observation suggestion for an operational excellence app. ' +
  'Respond with strict JSON only, matching this shape: {"title": string (max 80 chars), "type": "Positive"|"Opportunity"|"Issue"|null, "description": string, "location": string|null}. ' +
  "Use only information present in the transcript or the provided context. Do not invent facts. " +
  "The transcript may be in English, Tamil, or mixed Tamil/English — read it as-is and do not translate it in your output fields. " +
  "If the transcript does not clearly indicate a type, use null.";

export async function POST(request: NextRequest) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.error(`[${LOG_CONTEXT}] GROQ_API_KEY is not set`);
    return NextResponse.json(
      { error: "AI-assisted suggestions are not configured on this server. Set GROQ_API_KEY to enable it." },
      { status: 501 }
    );
  }

  let body: ExtractRequestBody;
  try {
    body = (await request.json()) as ExtractRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const transcript = body.transcript?.trim();
  if (!transcript) return NextResponse.json({ error: "No transcript provided." }, { status: 400 });
  if (transcript.length > MAX_TRANSCRIPT_LENGTH) return NextResponse.json({ error: "Transcript is too long." }, { status: 400 });

  const context = body.context ?? {};
  const userPrompt =
    `Plant: ${context.plant ?? "Unknown"}\n` +
    `Zone: ${context.zone ?? "Unknown"}\n` +
    `Walk purpose: ${context.walkPurpose ?? "Unknown"}\n` +
    `User-selected type (a strong hint, but return null if the transcript disagrees): ${context.selectedType ?? "none"}\n\n` +
    `Transcript:\n${transcript}`;

  try {
    const upstream = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_EXTRACTION_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      const failure = describeGroqFailure(upstream.status, detail, LOG_CONTEXT);
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    let payload: { choices?: Array<{ message?: { content?: string } }> };
    try {
      payload = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
    } catch (caught) {
      console.error(`[${LOG_CONTEXT}] malformed provider response`, caught);
      return NextResponse.json({ error: "The AI response could not be read." }, { status: 502 });
    }
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json({ error: "Could not generate suggested details." }, { status: 502 });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "The AI response could not be parsed." }, { status: 502 });
    }
    if (typeof parsed !== "object" || parsed === null) {
      return NextResponse.json({ error: "The AI response was invalid." }, { status: 502 });
    }

    const candidate = parsed as Record<string, unknown>;
    const title = typeof candidate.title === "string" ? candidate.title.slice(0, 80) : "";
    const description = typeof candidate.description === "string" ? candidate.description : "";
    const location = typeof candidate.location === "string" && candidate.location.trim() ? candidate.location.trim() : null;
    const type =
      typeof candidate.type === "string" && (VALID_TYPES as readonly string[]).includes(candidate.type)
        ? (candidate.type as (typeof VALID_TYPES)[number])
        : null;

    return NextResponse.json({ title, type, description, location });
  } catch (caught) {
    console.error(`[${LOG_CONTEXT}] request failed`, caught);
    return NextResponse.json({ error: "Suggestion service is unavailable. Please fill in details manually." }, { status: 502 });
  }
}
