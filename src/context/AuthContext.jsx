import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

const AuthContext = createContext(null);

function fallbackProfile(user) {
  return {
    id: user?.id,
    full_name: user?.email || "User",
    email: user?.email || "",
    role: "user",
  };
}

async function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    ),
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(currentUser) {
    if (!currentUser?.id) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .limit(1)
      );

      if (error) {
        console.error("Profile load error:", error.message);
        const fallback = fallbackProfile(currentUser);
        setProfile(fallback);
        return fallback;
      }

      const currentProfile = data?.[0] || fallbackProfile(currentUser);
      setProfile(currentProfile);
      return currentProfile;
    } catch (err) {
      console.error("Profile timeout/error:", err.message);
      const fallback = fallbackProfile(currentUser);
      setProfile(fallback);
      return fallback;
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
        } = await withTimeout(supabase.auth.getSession());

        if (error) throw error;

        const currentUser = session?.user || null;

        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Auth init error:", err.message);

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
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
        loadProfile(currentUser).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (!user) return null;
    return loadProfile(user);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}