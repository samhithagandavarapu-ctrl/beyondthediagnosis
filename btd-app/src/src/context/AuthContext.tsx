import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, authEnabled } from "../lib/supabaseClient";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  passwordRecoveryMode: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  useEffect(() => {
    if (!authEnabled) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecoveryMode(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function guardDisabled(): { error: string | null } | null {
    if (!authEnabled) {
      return {
        error:
          "Login isn't set up yet — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. See README 'Setting up login'.",
      };
    }
    return null;
  }

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = Boolean(user?.email && adminEmails.includes(user.email.toLowerCase()));

  const value: AuthState = {
    user,
    loading,
    isAdmin,
    passwordRecoveryMode,

    async signUpWithEmail(email, password) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    },

    async signInWithEmail(email, password) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },

    async signInWithGoogle() {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      return { error: error?.message ?? null };
    },

    async signInWithPhone(phone) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.signInWithOtp({ phone });
      return { error: error?.message ?? null };
    },

    async verifyPhoneOtp(phone, token) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
      return { error: error?.message ?? null };
    },

    async sendPasswordReset(email) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    },

    async updatePassword(newPassword) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (!error) setPasswordRecoveryMode(false);
      return { error: error?.message ?? null };
    },

    async signOut() {
      if (!authEnabled) return;
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
