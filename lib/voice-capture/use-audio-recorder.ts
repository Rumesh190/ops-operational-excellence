"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "stopped" | "error";

export interface UseAudioRecorderResult {
  state: RecorderState;
  elapsedSeconds: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  mimeType: string | null;
  errorMessage: string | null;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

export const MAX_RECORDING_SECONDS = 120;

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

/**
 * Reusable microphone capture: requests access only when `start()` is called,
 * enforces a max duration, and always releases mic tracks on stop/cancel/unmount.
 * Intended to be reused by future voice-capture consumers beyond Gemba.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  const isSupported =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const revokeUrl = useCallback(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    clearTimer();
  }, [clearTimer]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    clearTimer();
    releaseStream();
    revokeUrl();
    chunksRef.current = [];
    setAudioBlob(null);
    setElapsedSeconds(0);
    setState("idle");
  }, [clearTimer, releaseStream, revokeUrl]);

  const start = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("Voice recording is not supported in this browser.");
      setState("error");
      return;
    }
    setErrorMessage(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const supportedType = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setErrorMessage("Recording failed. Please try again.");
        setState("error");
        clearTimer();
        releaseStream();
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        revokeUrl();
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setMimeType(blob.type);
        releaseStream();
        setState("stopped");
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(seconds);
        if (seconds >= MAX_RECORDING_SECONDS) stop();
      }, 250);
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : "";
      setErrorMessage(
        name === "NotAllowedError"
          ? "Microphone access was denied. Allow microphone access to record, or continue without voice."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "Unable to start recording. Please try again."
      );
      setState("error");
      releaseStream();
    }
  }, [isSupported, releaseStream, revokeUrl, stop, clearTimer]);

  useEffect(
    () => () => {
      clearTimer();
      releaseStream();
      revokeUrl();
    },
    [clearTimer, releaseStream, revokeUrl]
  );

  return { state, elapsedSeconds, audioBlob, audioUrl, mimeType, errorMessage, isSupported, start, stop, cancel };
}
