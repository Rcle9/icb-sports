// src/services/authService.js

import { supabase } from "./supabaseClient";

function getSiteUrl() {
  if (typeof window === "undefined") return "";

  return window.location.origin;
}

function getDashboardRedirectUrl() {
  return `${getSiteUrl()}/home`;
}

function getResetPasswordRedirectUrl() {
  return `${getSiteUrl()}/reset-password`;
}

function cleanEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanName(name) {
  return String(name || "").trim();
}

function normalizeSignInPayload(emailOrPayload, passwordValue) {
  if (typeof emailOrPayload === "object" && emailOrPayload !== null) {
    return {
      email: cleanEmail(emailOrPayload.email),
      password: String(emailOrPayload.password || ""),
    };
  }

  return {
    email: cleanEmail(emailOrPayload),
    password: String(passwordValue || ""),
  };
}

function normalizeSignUpPayload(payload = {}) {
  return {
    fullName: cleanName(payload.fullName || payload.full_name || payload.name),
    email: cleanEmail(payload.email),
    password: String(payload.password || ""),
  };
}

async function ensureUserProfile(user, fallbackRole = "user") {
  if (!user?.id) return null;

  const fullName =
    cleanName(user.user_metadata?.full_name) ||
    cleanName(user.user_metadata?.name) ||
    user.email?.split("@")[0] ||
    "User";

  const payload = {
    id: user.id,
    full_name: fullName,
    email: user.email || "",
    role: fallbackRole,
    updated_at: new Date().toISOString(),
  };

  const { data: existingProfile, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("Read profile error:", readError.message);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      [
        {
          ...payload,
          created_at: new Date().toISOString(),
        },
      ],
      {
        onConflict: "id",
      }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error("Ensure profile error:", error.message);
    return payload;
  }

  return data || payload;
}

export async function signInUser(emailOrPayload, passwordValue) {
  const { email, password } = normalizeSignInPayload(
    emailOrPayload,
    passwordValue
  );

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (data?.user) {
    await ensureUserProfile(data.user);
  }

  return data;
}

export async function signUpUser(payload = {}) {
  const { fullName, email, password } = normalizeSignUpPayload(payload);

  if (!fullName) {
    throw new Error("Full name is required.");
  }

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        name: fullName,
        role: "user",
      },
      emailRedirectTo: getDashboardRedirectUrl(),
    },
  });

  if (error) throw error;

  if (data?.user) {
    await ensureUserProfile(
      {
        ...data.user,
        email,
        user_metadata: {
          ...(data.user.user_metadata || {}),
          full_name: fullName,
          name: fullName,
        },
      },
      "user"
    );
  }

  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getDashboardRedirectUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw error;

  return data;
}

export async function resetPassword(email) {
  const finalEmail = cleanEmail(email);

  if (!finalEmail) {
    throw new Error("Email address is required.");
  }

  const { data, error } = await supabase.auth.resetPasswordForEmail(
    finalEmail,
    {
      redirectTo: getResetPasswordRedirectUrl(),
    }
  );

  if (error) throw error;

  return data;
}

export async function updateUserPassword(newPassword) {
  const password = String(newPassword || "");

  if (!password) {
    throw new Error("New password is required.");
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;

  return data;
}

export async function updateUserEmail(newEmail) {
  const email = cleanEmail(newEmail);

  if (!email) {
    throw new Error("Email address is required.");
  }

  const { data, error } = await supabase.auth.updateUser({
    email,
  });

  if (error) throw error;

  return data;
}

export async function updateUserMetadata(metadata = {}) {
  const { data, error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) throw error;

  return data;
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user || null;
}

export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  return session || null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();

  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return ensureUserProfile(user);
  }

  return data;
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  return true;
}

/* Backward-compatible export names */

export async function loginUser(emailOrPayload, passwordValue) {
  return signInUser(emailOrPayload, passwordValue);
}

export async function registerUser(payload = {}) {
  return signUpUser(payload);
}

export async function logoutUser() {
  return signOutUser();
}

export async function forgotPassword(email) {
  return resetPassword(email);
}

export async function sendPasswordReset(email) {
  return resetPassword(email);
}

export async function changePassword(newPassword) {
  return updateUserPassword(newPassword);
}

export async function updatePassword(newPassword) {
  return updateUserPassword(newPassword);
}

export async function getUserProfile() {
  return getCurrentProfile();
}