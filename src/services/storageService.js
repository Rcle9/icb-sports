import { supabase } from "./supabaseClient";

export async function uploadImageToBucket(file, bucketName, folder = "uploads") {
  if (!file) throw new Error("No file selected.");

  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Failed to get public image URL.");
  }

  return data.publicUrl;
}