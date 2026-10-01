import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { doctor as defaultDoctor } from "@/lib/mock-data";

export interface UserProfile {
  name: string;
  email: string | null;
  specialty: string;
  initials: string;
  isAuthenticated: boolean;
  user: User | null;
}

export function extractInitials(name: string): string {
  if (!name) return "DR";
  const clean = name.replace(/^(dr\.|dra\.|dr|dra)\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DR";
  const first = parts[0];
  if (!first) return "DR";
  if (parts.length === 1) return first.substring(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  if (!last || !first[0] || !last[0]) return first.substring(0, 2).toUpperCase();
  return (first[0] + last[0]).toUpperCase();
}

function formatDisplayName(user: User): string {
  const metadata = user.user_metadata;
  if (metadata && typeof metadata["full_name"] === "string" && metadata["full_name"].trim()) {
    return metadata["full_name"].trim();
  }
  if (metadata && typeof metadata["name"] === "string" && metadata["name"].trim()) {
    return metadata["name"].trim();
  }
  if (user.email) {
    const parts = user.email.split("@");
    const username = parts[0];
    if (username) {
      return username
        .replace(/[._-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => (w[0] ? w[0].toUpperCase() : "") + w.slice(1))
        .join(" ");
    }
  }
  return defaultDoctor.name;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Obter sessão atual persistida
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error("[useAuth] Erro ao obter sessão:", error.message);
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 2. Escutar eventos de auth (SIGNED_IN, SIGNED_OUT, USER_UPDATED, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[useAuth] Erro ao deslogar:", error.message);
      throw error;
    }
    setUser(null);
    setSession(null);
  };

  const displayName = user ? formatDisplayName(user) : defaultDoctor.name;
  const metadata = user?.user_metadata;
  const specialtyMeta =
    metadata && typeof metadata["specialty"] === "string" ? metadata["specialty"] : null;
  const displaySpecialty =
    specialtyMeta || (user ? "Médico(a) Conectado(a)" : defaultDoctor.specialty);
  const displayInitials = user ? extractInitials(displayName) : defaultDoctor.initials;

  const profile: UserProfile = {
    name: displayName,
    email: user?.email ?? null,
    specialty: displaySpecialty,
    initials: displayInitials,
    isAuthenticated: !!user,
    user,
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
  };
}
