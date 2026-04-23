import { supabase } from "./supabaseClient";

export async function uploadImageToBucket(file, bucket, folder = "") {
  if (!file) throw new Error("No file selected.");

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
}