import { supabase } from "./supabaseClient";

function getSiteUrl() {
  return window.location.origin;
}

function getDashboardRedirectUrl() {
  return `${getSiteUrl()}/dashboard`;
}

export async function signInUser({ email, password }) {
  const cleanEmail = String(email || "").trim();

  if (!cleanEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw error;

  return data;
}

export async function signUpUser({ fullName, email, password }) {
  const cleanEmail = String(email || "").trim();
  const cleanName = String(fullName || "").trim();

  if (!cleanName) {
    throw new Error("Full name is required.");
  }

  if (!cleanEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: cleanName,
        role: "user",
      },
      emailRedirectTo: `${getSiteUrl()}/login`,
    },
  });

  if (error) throw error;

  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getDashboardRedirectUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  return true;
}