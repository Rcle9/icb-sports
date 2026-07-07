// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

const PROFILE_CACHE_KEY = "icb_profile_cache";

function normalizeRole(role) {
  const clean = String(role || "").toLowerCase().trim();

  if (clean === "admin") return "admin";
  if (clean === "staff") return "staff";
  return "user";
}

function getCachedProfile(userId) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);

    if (cached?.id !== userId) return null;

    return {
      ...cached,
      role: normalizeRole(cached.role),
    };
  } catch {
    return null;
  }
}

function saveCachedProfile(profile) {
  try {
    if (!profile?.id) return;

    localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({
        ...profile,
        role: normalizeRole(profile.role),
      })
    );
  } catch {
    // ignore storage error
  }
}

function clearCachedProfile() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore storage error
  }
}

function fallbackProfile(user, cachedProfile = null) {
  return {
    id: user?.id,
    full_name:
      cachedProfile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      "User",
    email: cachedProfile?.email || user?.email || "",
    role: normalizeRole(
      cachedProfile?.role ||
        user?.user_metadata?.role ||
        user?.app_metadata?.role ||
        "user"
    ),
  };
}

async function withTimeout(promise, ms = 10000) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timeout")), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  async function loadProfile(currentUser) {
    if (!currentUser?.id) {
      setProfile(null);
      clearCachedProfile();
      return null;
    }

    const cachedProfile = getCachedProfile(currentUser.id);

    if (cachedProfile) {
      setProfile(cachedProfile);
    }

    try {
      setProfileLoading(true);

      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle(),
        10000
      );

      if (error) throw error;

      const currentProfile = data
        ? {
            ...data,
            role: normalizeRole(data.role),
          }
        : fallbackProfile(currentUser, cachedProfile);

      setProfile(currentProfile);
      saveCachedProfile(currentProfile);

      return currentProfile;
    } catch (err) {
      console.error("Profile timeout/error:", err.message);

      const safeProfile = cachedProfile || fallbackProfile(currentUser, null);

      setProfile(safeProfile);
      saveCachedProfile(safeProfile);

      return safeProfile;
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setLoading(true);

        const {
          data: { session },
          error,
        } = await withTimeout(supabase.auth.getSession(), 10000);

        if (error) throw error;

        const currentUser = session?.user || null;

        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          const cachedProfile = getCachedProfile(currentUser.id);

          if (cachedProfile) {
            setProfile(cachedProfile);
          }

          await loadProfile(currentUser);
        } else {
          setProfile(null);
          clearCachedProfile();
        }
      } catch (err) {
        console.error("Auth init error:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;

      setUser(currentUser);

      if (currentUser) {
        const cachedProfile = getCachedProfile(currentUser.id);

        if (cachedProfile) {
          setProfile(cachedProfile);
        }

        loadProfile(currentUser).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        clearCachedProfile();
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (!user) return null;
    return loadProfile(user);
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      refreshProfile,
      isAdmin: profile?.role === "admin",
      isStaff: profile?.role === "staff",
      isUser: profile?.role === "user",
    }),
    [user, profile, loading, profileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}