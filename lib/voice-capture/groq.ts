/**
 * Server-only Groq provider constants + error mapping, shared by the Gemba
 * voice transcription and structured-extraction API routes. Never import
 * this from client code — it exists purely to avoid duplicating the
 * upstream-error-to-client-message mapping between the two routes.
 */

export const GROQ_API_BASE = "https://api.groq.com/openai/v1";
export const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
export const GROQ_EXTRACTION_MODEL = "openai/gpt-oss-20b";

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

/**
 * Maps a failed Groq HTTP response to a safe client-facing message and the
 * HTTP status this route should return, without leaking the API key or raw
 * upstream body to the client. The raw `detail` is only ever written to the
 * server log, never returned in the response.
 */
export function describeGroqFailure(status: number, detail: string, context: string) {
  console.error(`[${context}] Groq upstream error`, status, detail);
  if (status === 401 || status === 403) {
    return { status: 502, message: "Voice AI provider rejected the request (invalid or unauthorized API key)." };
  }
  if (status === 429) {
    return { status: 429, message: "Voice AI provider rate limit reached. Please try again shortly." };
  }
  if (status === 400 || status === 413 || status === 415) {
    return { status: 400, message: "The audio or request could not be processed by the voice AI provider." };
  }
  return { status: 502, message: "Voice AI provider is unavailable right now. Please try again." };
}
