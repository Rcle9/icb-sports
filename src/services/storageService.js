// src/services/storageService.js

import { supabase } from "./supabaseClient";

function getFileExtension(file) {
  const name = file?.name || "";
  const extension = name.split(".").pop();

  return extension || "png";
}

function cleanFolder(folder = "uploads") {
  return String(folder || "uploads")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function createSafeFileName(file) {
  const extension = getFileExtension(file);
  const originalName = String(file?.name || "image")
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${originalName || "image"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;
}

function validateImageFile(file) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (file.type && !validTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF images are allowed.");
  }

  const maxSize = 8 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Image size must be 8MB or below.");
  }
}

export async function uploadImageToBucket(
  file,
  bucketName,
  folder = "uploads"
) {
  validateImageFile(file);

  if (!bucketName) {
    throw new Error("Storage bucket name is required.");
  }

  const safeFolder = cleanFolder(folder);
  const fileName = createSafeFileName(file);
  const filePath = `${safeFolder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to get public image URL.");
  }

  return data.publicUrl;
}

export async function uploadMultipleImagesToBucket(
  files = [],
  bucketName,
  folder = "uploads"
) {
  const fileList = Array.from(files || []);

  if (!fileList.length) return [];

  const uploadedUrls = [];

  for (const file of fileList) {
    const url = await uploadImageToBucket(file, bucketName, folder);
    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

export async function uploadFacilityImage(file, facilityId = "new") {
  return uploadImageToBucket(file, "facility-images", `facilities/${facilityId}`);
}

export async function uploadFacilityImages(files = [], facilityId = "new") {
  return uploadMultipleImagesToBucket(
    files,
    "facility-images",
    `facilities/${facilityId}`
  );
}

export async function uploadInventoryImage(file, itemId = "new") {
  return uploadImageToBucket(file, "inventory-images", `inventory/${itemId}`);
}

export async function uploadInventoryImages(files = [], itemId = "new") {
  return uploadMultipleImagesToBucket(
    files,
    "inventory-images",
    `inventory/${itemId}`
  );
}

export async function uploadPaymentProof(file, bookingId = "new") {
  return uploadImageToBucket(
    file,
    "payment-proofs",
    `payment-proofs/${bookingId}`
  );
}

export async function uploadPaymentQr(file, type = "payment") {
  return uploadImageToBucket(file, "payment-qr", `qr/${type}`);
}

export function getStoragePathFromPublicUrl(publicUrl, bucketName) {
  if (!publicUrl || !bucketName) return "";

  const marker = `/storage/v1/object/public/${bucketName}/`;
  const index = publicUrl.indexOf(marker);

  if (index === -1) return "";

  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

export async function deleteFileFromBucket(publicUrl, bucketName) {
  if (!publicUrl || !bucketName) return true;

  const filePath = getStoragePathFromPublicUrl(publicUrl, bucketName);

  if (!filePath) return true;

  const { error } = await supabase.storage.from(bucketName).remove([filePath]);

  if (error) throw error;

  return true;
}

export async function deleteFilesFromBucket(publicUrls = [], bucketName) {
  if (!Array.isArray(publicUrls) || !publicUrls.length || !bucketName) {
    return true;
  }

  const filePaths = publicUrls
    .map((url) => getStoragePathFromPublicUrl(url, bucketName))
    .filter(Boolean);

  if (!filePaths.length) return true;

  const { error } = await supabase.storage.from(bucketName).remove(filePaths);

  if (error) throw error;

  return true;
}

export function isValidImageUrl(url) {
  const value = String(url || "").trim();

  if (!value) return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  );
}

export function getImagePreviewUrl(file) {
  if (!file) return "";

  return URL.createObjectURL(file);
}

/* Backward-compatible export names */
export async function uploadFile(file, bucketName, folder = "uploads") {
  return uploadImageToBucket(file, bucketName, folder);
}

export async function uploadImage(file, bucketName, folder = "uploads") {
  return uploadImageToBucket(file, bucketName, folder);
}

export async function deleteFile(publicUrl, bucketName) {
  return deleteFileFromBucket(publicUrl, bucketName);
}

export async function deleteImage(publicUrl, bucketName) {
  return deleteFileFromBucket(publicUrl, bucketName);
}