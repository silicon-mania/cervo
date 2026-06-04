import { randomUUID } from "node:crypto";

import { uploadSupabaseStorageObject } from "@/server/storage/supabase";

const acceptedCaptureImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const maxCaptureImageBytes = 5 * 1024 * 1024;

export type CaptureImageFile = {
  name: string;
  type: string;
  size: number;
  file: Blob;
};

export type StoredCaptureImage = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export function validateCaptureImageFile(image: CaptureImageFile) {
  if (!acceptedCaptureImageTypes.has(image.type)) {
    throw new Error("Only PNG, JPEG, GIF, or WebP images can be appended.");
  }

  if (image.size > maxCaptureImageBytes) {
    throw new Error("Capture image is too large.");
  }
}

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .trim()
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  return sanitized || "capture-image";
}

export async function storeCaptureImages({
  workspaceId,
  documentId,
  captureId,
  images,
}: {
  workspaceId: string;
  documentId: string;
  captureId: string;
  images: CaptureImageFile[];
}): Promise<StoredCaptureImage[]> {
  const storedImages: StoredCaptureImage[] = [];

  for (const image of images) {
    validateCaptureImageFile(image);

    const fileName = sanitizeFileName(image.name);
    const storagePath = [
      workspaceId,
      "documents",
      documentId,
      captureId,
      `${randomUUID()}-${fileName}`,
    ].join("/");

    const storedImage = await uploadSupabaseStorageObject({
      path: storagePath,
      file: image.file,
      contentType: image.type,
    });

    storedImages.push({
      storagePath: storedImage.path,
      fileName,
      mimeType: image.type,
      size: image.size,
    });
  }

  return storedImages;
}
