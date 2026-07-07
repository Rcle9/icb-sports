// src/services/auth.js

import {
  changePassword,
  forgotPassword,
  getCurrentProfile,
  getCurrentSession,
  getCurrentUser,
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  sendPasswordReset,
  signInUser,
  signInWithGoogle,
  signOutUser,
  signUpUser,
  updatePassword,
  updateUserEmail,
  updateUserMetadata,
  updateUserPassword,
} from "./authService";
import { supabase } from "./supabaseClient";

function normalizeRole(role) {
  const value = String(role || "user").toLowerCase();

  if (value === "admin") return "admin";
  if (value === "staff") return "staff";

  return "user";
}

export async function login(emailOrPayload, passwordValue) {
  return signInUser(emailOrPayload, passwordValue);
}

export async function register(payload = {}) {
  return signUpUser(payload);
}

export async function logout() {
  return signOutUser();
}

export async function getUserRole(userId) {
  if (!userId) return "user";

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("getUserRole error:", error.message);
    return "user";
  }

  return normalizeRole(data?.role);
}

export async function getUserProfileById(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

export async function getCurrentUserRole() {
  const user = await getCurrentUser();

  if (!user?.id) return "user";

  return getUserRole(user.id);
}

export async function requireAuth() {
  const session = await getCurrentSession();

  if (!session?.user) {
    throw new Error("You must be logged in.");
  }

  return session.user;
}

export async function requireRole(allowedRoles = []) {
  const user = await requireAuth();
  const role = await getUserRole(user.id);

  const allowed = allowedRoles.map((item) => normalizeRole(item));

  if (allowed.length > 0 && !allowed.includes(role)) {
    throw new Error("You are not allowed to access this page.");
  }

  return {
    user,
    role,
  };
}

export {
  changePassword,
  forgotPassword,
  getCurrentProfile,
  getCurrentSession,
  getCurrentUser,
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  sendPasswordReset,
  signInUser,
  signInWithGoogle,
  signOutUser,
  signUpUser,
  updatePassword,
  updateUserEmail,
  updateUserMetadata,
  updateUserPassword,
};