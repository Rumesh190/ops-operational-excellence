import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_GROQ_KEY = process.env.GROQ_API_KEY;

beforeEach(() => {
  delete process.env.GROQ_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  if (ORIGINAL_GROQ_KEY === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = ORIGINAL_GROQ_KEY;
});

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe("Gemba Voice Capture — Groq provider (transcription route)", () => {
  it("returns a clear, safe error when GROQ_API_KEY is missing (no network call attempted)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { POST } = await import("@/app/api/gemba/voice/transcribe/route");

    const formData = new FormData();
    formData.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "recording.webm");
    const request = new Request("http://localhost/api/gemba/voice/transcribe", { method: "POST", body: formData });

    const response = await POST(request as never);
    expect(response.status).toBe(501);
    const data = await response.json();
    expect(data.error).toMatch(/GROQ_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Groq's whisper-large-v3-turbo endpoint and returns the transcript on success", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ text: "Two pallets are blocking the exit.", language: "en" }));
    vi.stubGlobal("fetch", fetchSpy);
    const { POST } = await import("@/app/api/gemba/voice/transcribe/route");

    const formData = new FormData();
    formData.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "recording.webm");
    const request = new Request("http://localhost/api/gemba/voice/transcribe", { method: "POST", body: formData });

    const response = await POST(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.transcript).toBe("Two pallets are blocking the exit.");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBe("Bearer test-groq-key");
    const sentModel = (init.body as FormData).get("model");
    expect(sentModel).toBe("whisper-large-v3-turbo");
    expect((init.body as FormData).get("language")).toBeNull();
  });

  it("maps a Groq rate-limit failure to a 429 without leaking upstream details", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "rate limited, key=sk-secret" }, false, 429)));
    const { POST } = await import("@/app/api/gemba/voice/transcribe/route");

    const formData = new FormData();
    formData.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "recording.webm");
    const request = new Request("http://localhost/api/gemba/voice/transcribe", { method: "POST", body: formData });

    const response = await POST(request as never);
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).not.toMatch(/sk-secret/);
    expect(data.error).toMatch(/rate limit/i);
  });

  it("maps an invalid-API-key (401) failure to a safe upstream error", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "invalid_api_key" }, false, 401)));
    const { POST } = await import("@/app/api/gemba/voice/transcribe/route");

    const formData = new FormData();
    formData.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "recording.webm");
    const request = new Request("http://localhost/api/gemba/voice/transcribe", { method: "POST", body: formData });

    const response = await POST(request as never);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toMatch(/invalid or unauthorized/i);
  });

  it("handles a network failure without crashing", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { POST } = await import("@/app/api/gemba/voice/transcribe/route");

    const formData = new FormData();
    formData.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "recording.webm");
    const request = new Request("http://localhost/api/gemba/voice/transcribe", { method: "POST", body: formData });

    const response = await POST(request as never);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toMatch(/unavailable/i);
  });

  it("rejects a non-audio upload before making any provider call", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { POST } = await import("@/app/api/gemba/voice/transcribe/route");

    const formData = new FormData();
    formData.append("audio", new Blob(["not audio"], { type: "text/plain" }), "recording.txt");
    const request = new Request("http://localhost/api/gemba/voice/transcribe", { method: "POST", body: formData });

    const response = await POST(request as never);
    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Gemba Voice Capture — Groq provider (structured extraction route)", () => {
  it("returns a clear, safe error when GROQ_API_KEY is missing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { POST } = await import("@/app/api/gemba/voice/extract/route");

    const request = new Request("http://localhost/api/gemba/voice/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Pallets are blocking the exit.", context: { plant: "Egmore", zone: "Zone B", walkPurpose: "Safety" } }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(501);
    const data = await response.json();
    expect(data.error).toMatch(/GROQ_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Groq's chat/completions endpoint with the fast text model and parses structured output", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const completion = { choices: [{ message: { content: JSON.stringify({ title: "Blocked exit", type: "Issue", description: "Two pallets block the emergency exit.", location: "Packing Area" }) } }] };
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(completion));
    vi.stubGlobal("fetch", fetchSpy);
    const { POST } = await import("@/app/api/gemba/voice/extract/route");

    const request = new Request("http://localhost/api/gemba/voice/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Pallets are blocking the exit.", context: { plant: "Egmore", zone: "Zone B", walkPurpose: "Safety", selectedType: "Issue" } }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ title: "Blocked exit", type: "Issue", description: "Two pallets block the emergency exit.", location: "Packing Area" });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.model).toBe("openai/gpt-oss-20b");
    expect(sentBody.response_format).toEqual({ type: "json_object" });
  });

  it("does not override a user-selected type when the model returns a different one — client applies the same rule, but the route must still pass the raw suggestion through untouched", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const completion = { choices: [{ message: { content: JSON.stringify({ title: "Good practice", type: "Positive", description: "Tools are stored correctly.", location: null }) } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(completion)));
    const { POST } = await import("@/app/api/gemba/voice/extract/route");

    const request = new Request("http://localhost/api/gemba/voice/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Tools are stored correctly.", context: { selectedType: "Issue" } }),
    });

    const response = await POST(request as never);
    const data = await response.json();
    // The route itself never enforces the user's selection — it is a pure suggestion passthrough;
    // "do not silently override" is enforced client-side in voice-capture-flow.tsx.
    expect(data.type).toBe("Positive");
  });

  it("keeps the reviewed transcript usable when extraction fails upstream", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "internal error" }, false, 500)));
    const { POST } = await import("@/app/api/gemba/voice/extract/route");

    const request = new Request("http://localhost/api/gemba/voice/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Tools are stored correctly." }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(typeof data.error).toBe("string");
    // The client (extractObservationDetails) throws on this and voice-capture-flow.tsx
    // falls back to the raw transcript as the description — verified in
    // tests/gemba-voice-capture.characterization.test.ts's store-level coverage
    // and the voice-capture-flow.tsx catch branch (not re-tested here, no DOM harness).
  });

  it("rejects a malformed (non-JSON) model response instead of crashing", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const completion = { choices: [{ message: { content: "not valid json" } }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(completion)));
    const { POST } = await import("@/app/api/gemba/voice/extract/route");

    const request = new Request("http://localhost/api/gemba/voice/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: "Tools are stored correctly." }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toMatch(/could not be parsed/i);
  });
});
