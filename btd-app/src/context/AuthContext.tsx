import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, authEnabled, cameFromPasswordResetLink } from "../lib/supabaseClient";
import { API_BASE } from "../lib/api";

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  passwordRecoveryMode: boolean;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; signedIn?: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

// Keep in step with public.is_voiced_admin() in supabase/rejections-and-messages.sql,
// which is what actually lets an admin read and answer messages.
const DEFAULT_ADMIN_EMAILS = ["withvoiced@gmail.com", "voiced@gmail.com"];

/** Where links in Supabase's emails (sign-up confirmation, email change) send
 *  people back to. Without it Supabase falls back to the project's "Site URL",
 *  which is often still localhost — and that is the blank screen people saw
 *  after clicking "confirm your email". */
function emailRedirectTo(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(cameFromPasswordResetLink);

  useEffect(() => {
    if (!authEnabled) {
      setLoading(false);
      return;
    }

    // If this ever rejects — a blocked storage write, a network blip while the
    // OAuth code is being exchanged — loading must still end. Leaving it true
    // is what leaves people staring at a blank page.
    supabase.auth
      .getSession()
      .then(({ data }: any) => {
        setUser(data.session?.user ?? null);
        if (cameFromPasswordResetLink()) setPasswordRecoveryMode(true);
      })
      .catch((error: unknown) => {
        console.error("Could not read the saved session:", error);
      })
      .finally(() => {
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
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

  // The site's own admin inbox is always an admin; VITE_ADMIN_EMAILS can add
  // more people without a code change.
  const adminEmails = [...DEFAULT_ADMIN_EMAILS, ...(import.meta.env.VITE_ADMIN_EMAILS || "").split(",")]
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: emailRedirectTo("/profile") },
      });
      // A session straight away means the project doesn't require email
      // confirmation, so there is no email to wait for.
      return { error: error?.message ?? null, signedIn: Boolean(data?.session) };
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
      // Come back to our own callback route rather than straight to "/", so
      // there is a page whose whole job is to say "signing you in…" while the
      // code in the URL is exchanged for a session.
      const next = `${window.location.pathname}${window.location.search}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        next === "/login" ? "/" : next
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
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

    async updateEmail(newEmail) {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: emailRedirectTo("/profile") }
      );
      return { error: error?.message ?? null };
    },

    async deleteAccount() {
      const disabled = guardDisabled();
      if (disabled) return disabled;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return { error: "Your session has expired. Sign in again, then try once more." };
      try {
        const res = await fetch(`${API_BASE}/api/delete-account`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) return { error: body.error || "We couldn't delete your account. Please try again." };
      } catch {
        return { error: "We couldn't reach the server. Check your connection and try again." };
      }
      // The account is gone server-side; drop the now-dead session here too.
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      setUser(null);
      return { error: null };
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
