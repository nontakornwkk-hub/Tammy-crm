"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

async function loadBitmap(file: File) {
  const url = URL.createObjectURL(file);
  try { const image = new Image(); image.src = url; await image.decode(); return image; }
  finally { URL.revokeObjectURL(url); }
}

export async function compressImage(file: File, maxBytes = 5 * 1024 * 1024) {
  if (file.size <= maxBytes) return file;
  const image = await loadBitmap(file);
  let width = image.naturalWidth; let height = image.naturalHeight; let quality = .9;
  const canvas = document.createElement("canvas");
  for (let pass = 0; pass < 8; pass += 1) {
    const ratio = Math.min(1, 2400 / Math.max(width, height)); width = Math.round(width * ratio); height = Math.round(height * ratio);
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    quality -= .1; width = Math.round(width * .86); height = Math.round(height * .86);
  }
  throw new Error("ไม่สามารถบีบอัดรูปให้ต่ำกว่า 5 MB ได้");
}

export async function removeImageBackground(file: File, maxDimension = 1600) {
  const image = await loadBitmap(file);
  const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("อุปกรณ์นี้ไม่รองรับการลบพื้นหลัง");
  context.drawImage(image, 0, 0, width, height);
  const frame = context.getImageData(0, 0, width, height); const pixels = frame.data;
  const sample = (x: number, y: number) => { const index = (y * width + x) * 4; return [pixels[index], pixels[index + 1], pixels[index + 2]] as const; };
  const insetX = Math.min(4, width - 1); const insetY = Math.min(4, height - 1);
  const references = [sample(0, 0), sample(width - 1, 0), sample(0, height - 1), sample(width - 1, height - 1), sample(insetX, insetY), sample(width - 1 - insetX, height - 1 - insetY)];
  const distance = (pixelIndex: number) => Math.min(...references.map(([r, g, b]) => Math.hypot(pixels[pixelIndex] - r, pixels[pixelIndex + 1] - g, pixels[pixelIndex + 2] - b)));
  const visited = new Uint8Array(width * height); const queue = new Int32Array(width * height); let head = 0; let tail = 0;
  const enqueue = (position: number) => { if (visited[position]) return; const pixelIndex = position * 4; if (pixels[pixelIndex + 3] === 0 || distance(pixelIndex) <= 88) { visited[position] = 1; queue[tail++] = position; } };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const position = queue[head++]; const x = position % width; const y = Math.floor(position / width); const pixelIndex = position * 4; const delta = distance(pixelIndex);
    pixels[pixelIndex + 3] = delta <= 42 ? 0 : Math.min(pixels[pixelIndex + 3], Math.round(((delta - 42) / 46) * 255));
    if (x > 0) enqueue(position - 1); if (x < width - 1) enqueue(position + 1); if (y > 0) enqueue(position - width); if (y < height - 1) enqueue(position + width);
  }
  context.putImageData(frame, 0, 0);
  let left = width; let top = height; let right = -1; let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (pixels[(y * width + x) * 4 + 3] > 12) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  const padding = Math.round(Math.max(width, height) * .025); left = Math.max(0, left - padding); top = Math.max(0, top - padding); right = Math.min(width - 1, right + padding); bottom = Math.min(height - 1, bottom + padding);
  const output = document.createElement("canvas"); output.width = Math.max(1, right - left + 1); output.height = Math.max(1, bottom - top + 1);
  output.getContext("2d")?.drawImage(canvas, left, top, output.width, output.height, 0, 0, output.width, output.height);
  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("ลบพื้นหลังไม่สำเร็จ");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-transparent.png`, { type: "image/png" });
}

export async function uploadPublicImage(supabase: SupabaseClient, file: File, folder: string, options?: { removeBackground?: boolean }) {
  if (!file.type.startsWith("image/")) throw new Error("รองรับเฉพาะไฟล์รูปภาพ");
  const prepared = options?.removeBackground ? await removeImageBackground(file) : file;
  const compressed = prepared.size > 5 * 1024 * 1024 && prepared.type !== "image/png" ? await compressImage(prepared) : prepared;
  if (compressed.size > 5 * 1024 * 1024) throw new Error("ไฟล์ PNG หลังลบพื้นหลังมีขนาดเกิน 5 MB กรุณาใช้รูปขนาดเล็กลง");
  const extension = compressed.type === "image/jpeg" ? "jpg" : (compressed.name.split(".").pop() || "png");
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const storage = supabase.storage.from("tammy-media");
  const { error } = await storage.upload(path, compressed, { contentType: compressed.type, cacheControl: "3600" });
  if (error) throw error;
  return storage.getPublicUrl(path).data.publicUrl;
}
