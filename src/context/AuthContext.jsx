import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getUserProfile } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ role: "user" });
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    try {
      const profileData = await getUserProfile(userId);
      if (profileData) {
        setProfile(profileData);
      } else {
        setProfile({ role: "user" });
      }
    } catch (error) {
      console.error("Profile fetch failed:", error.message);
      setProfile({ role: "user" });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession error:", error.message);
        }

        if (!isMounted) return;

        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        // stop loading immediately after session check
        setLoading(false);

        // fetch profile after UI is already allowed to continue
        if (sessionUser) {
          fetchProfile(sessionUser.id);
        } else {
          setProfile({ role: "user" });
        }
      } catch (error) {
        console.error("initAuth error:", error.message);
        if (!isMounted) return;
        setUser(null);
        setProfile({ role: "user" });
        setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);

      if (sessionUser) {
        fetchProfile(sessionUser.id);
      } else {
        setProfile({ role: "user" });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}