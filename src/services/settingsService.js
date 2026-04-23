import { supabase } from "./supabaseClient";

export async function getSystemSettings() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .order("setting_key", { ascending: true });

  if (error) throw error;
  return data;
}

export async function upsertSystemSetting(setting_key, setting_value) {
  const { data, error } = await supabase
    .from("system_settings")
    .upsert(
      {
        setting_key,
        setting_value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveSystemSettings(settingsObject) {
  const entries = Object.entries(settingsObject).map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value: String(setting_value ?? ""),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("system_settings")
    .upsert(entries, { onConflict: "setting_key" })
    .select();

  if (error) throw error;
  return data;
}