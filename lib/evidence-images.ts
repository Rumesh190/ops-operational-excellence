export const MAX_EVIDENCE_IMAGES = 5;
export const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_EVIDENCE_DIMENSION = 1600;

export class EvidenceImageError extends Error { constructor(public code: "type" | "size" | "count" | "decode", message: string) { super(message); this.name = "EvidenceImageError"; } }

export function validateEvidenceSelection(files: File[], existingCount = 0) {
  if (existingCount + files.length > MAX_EVIDENCE_IMAGES) throw new EvidenceImageError("count", "Maximum 5 evidence images allowed.");
  for (const file of files) {
    if (!file.type.startsWith("image/")) throw new EvidenceImageError("type", "Only image files can be uploaded as evidence.");
    if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new EvidenceImageError("size", "Image is too large. Please upload an image smaller than 8 MB.");
  }
}

function readFile(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new EvidenceImageError("decode", "Unable to read this image.")); reader.onerror = () => reject(new EvidenceImageError("decode", "Unable to read this image.")); reader.readAsDataURL(file); }); }
function decodeImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new EvidenceImageError("decode", "Unable to process this image.")); image.src = src; }); }

export async function optimizeEvidenceImage(file: File) {
  validateEvidenceSelection([file]);
  const source = await readFile(file); const image = await decodeImage(source);
  const scale = Math.min(1, MAX_EVIDENCE_DIMENSION / image.naturalWidth, MAX_EVIDENCE_DIMENSION / image.naturalHeight);
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d"); if (!context) throw new EvidenceImageError("decode", "Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
  return { dataUrl, size: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75), width: canvas.width, height: canvas.height, originalSize: file.size };
}

/**
 * Same optimization pipeline as `optimizeEvidenceImage`, but outputs a Blob
 * instead of a base64 data URL. Used by Gemba photo evidence, which persists
 * the Blob to IndexedDB rather than embedding it in the localStorage-backed
 * observation record. Other callers of `optimizeEvidenceImage` are untouched.
 */
export async function optimizeEvidenceImageToBlob(file: File) {
  validateEvidenceSelection([file]);
  const source = await readFile(file); const image = await decodeImage(source);
  const scale = Math.min(1, MAX_EVIDENCE_DIMENSION / image.naturalWidth, MAX_EVIDENCE_DIMENSION / image.naturalHeight);
  const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d"); if (!context) throw new EvidenceImageError("decode", "Image processing is unavailable in this browser.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.76));
  if (!blob) throw new EvidenceImageError("decode", "Unable to process this image.");
  return { blob, size: blob.size, width: canvas.width, height: canvas.height, originalSize: file.size, mimeType: blob.type || "image/jpeg" };
}
