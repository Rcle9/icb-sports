// src/services/supabaseClient.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function validateSupabaseConfig() {
  if (!supabaseUrl) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Please check your .env file and restart the dev server."
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY. Please check your .env file and restart the dev server."
    );
  }
}

validateSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: window.localStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export async function getSupabaseUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user || null;
}

export async function getSupabaseSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  return session || null;
}

export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) throw error;

    return {
      connected: true,
      message: "Supabase connected successfully.",
    };
  } catch (error) {
    return {
      connected: false,
      message: error.message || "Unable to connect to Supabase.",
    };
  }
}

export function getPublicStorageUrl(bucketName, filePath) {
  if (!bucketName || !filePath) return "";

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return data?.publicUrl || "";
}

export default supabase;