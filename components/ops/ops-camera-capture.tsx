"use client";
/* eslint-disable @next/next/no-img-element -- the captured preview uses a temporary browser object URL. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CameraError = "denied" | "missing" | "unsupported" | "unavailable";

const ERROR_COPY: Record<CameraError, string> = {
  denied: "Camera access was denied. Allow camera access in your browser settings, or upload an existing photo.",
  missing: "No camera is available on this device. You can upload an existing photo instead.",
  unsupported: "Camera access is not supported in this browser. You can upload an existing photo instead.",
  unavailable: "Unable to start the camera. It may already be in use. You can upload an existing photo instead.",
};

function classifyCameraError(error: unknown): CameraError {
  if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return "unsupported";
  if (error instanceof DOMException && ["NotAllowedError", "SecurityError"].includes(error.name)) return "denied";
  if (error instanceof DOMException && ["NotFoundError", "OverconstrainedError"].includes(error.name)) return "missing";
  return "unavailable";
}

export function OpsCameraCapture({ onCapture, trigger, fileNamePrefix = "ops-photo", disabled = false }: {
  onCapture: (file: File) => void | Promise<void>;
  trigger: (openCamera: () => void) => React.ReactNode;
  fileNamePrefix?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [capture, setCapture] = useState<{ blob: Blob; url: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureUrlRef = useRef<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const clearCapture = useCallback(() => {
    if (captureUrlRef.current) URL.revokeObjectURL(captureUrlRef.current);
    captureUrlRef.current = null;
    setCapture(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) throw new DOMException("Camera unsupported", "NotSupportedError");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (reason) {
      stopCamera();
      setError(classifyCameraError(reason));
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => () => {
    stopCamera();
    if (captureUrlRef.current) URL.revokeObjectURL(captureUrlRef.current);
  }, [stopCamera]);

  function changeOpen(next: boolean) {
    if (!next) { stopCamera(); clearCapture(); setError(null); }
    setOpen(next);
  }

  function openCamera() {
    if (disabled) return;
    setOpen(true);
    requestAnimationFrame(() => void startCamera());
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) { setError("unavailable"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) { setError("unavailable"); return; }
      stopCamera();
      clearCapture();
      const url = URL.createObjectURL(blob);
      captureUrlRef.current = url;
      setCapture({ blob, url });
    }, "image/jpeg", 0.9);
  }

  async function confirmPhoto() {
    if (!capture) return;
    const file = new File([capture.blob], `${fileNamePrefix}-${Date.now()}.jpg`, { type: capture.blob.type || "image/jpeg", lastModified: Date.now() });
    await onCapture(file);
    changeOpen(false);
  }

  async function acceptUpload(file?: File) {
    if (!file) return;
    await onCapture(file);
    if (uploadRef.current) uploadRef.current.value = "";
    changeOpen(false);
  }

  return <>
    {/* The render prop attaches this callback to an event handler; it does not invoke it while rendering. */}
    {/* eslint-disable-next-line react-hooks/refs */}
    {trigger(openCamera)}
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4 sm:px-6"><DialogTitle>{capture ? "Review Photo" : "Take Photo"}</DialogTitle><DialogDescription>{capture ? "Retake the image or use it as evidence." : "Position the evidence clearly, then capture the photo."}</DialogDescription></DialogHeader>
        <div className="grid min-h-[280px] place-items-center bg-black p-3 sm:min-h-[440px] sm:p-5">
          {capture ? <img src={capture.url} alt="Captured evidence preview" className="max-h-[62vh] max-w-full object-contain" /> : error ? <div className="max-w-md rounded-xl bg-background p-6 text-center text-foreground"><Camera className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">Camera unavailable</p><p role="alert" className="mt-2 text-sm leading-6 text-muted-foreground">{ERROR_COPY[error]}</p><Button className="mt-5" variant="outline" onClick={() => uploadRef.current?.click()}><Upload className="size-4" />Upload Photo</Button></div> : <div className="relative size-full min-h-[250px] overflow-hidden rounded-lg bg-zinc-950 sm:min-h-[400px]"><video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview" className="size-full object-contain" />{starting && <div className="absolute inset-0 grid place-items-center text-sm text-white">Starting camera…</div>}</div>}
        </div>
        <input ref={uploadRef} hidden type="file" accept="image/*" onChange={(event) => void acceptUpload(event.target.files?.[0])} />
        {!error && <DialogFooter className="m-0 rounded-none px-4 py-4 sm:px-6">{capture ? <><Button variant="outline" onClick={() => { clearCapture(); void startCamera(); }}><RefreshCw className="size-4" />Retake</Button><Button onClick={() => void confirmPhoto()}>Use Photo</Button></> : <Button onClick={capturePhoto} disabled={starting}><Camera className="size-4" />Capture</Button>}</DialogFooter>}
      </DialogContent>
    </Dialog>
  </>;
}
