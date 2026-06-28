import { supabase } from "./supabaseClient";

export async function createActivityLog(payload) {
  const { data, error } = await supabase
    .from("activity_logs")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActivityLogs() {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}