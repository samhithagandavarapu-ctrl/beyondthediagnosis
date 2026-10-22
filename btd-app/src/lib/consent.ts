import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { USERNAME_DOMAIN } from "./family";
import { HEALTH_CONSENT_VERSION, TERMS_VERSION } from "../data/legal";

// What someone has agreed to, kept on their own sign-in (user_metadata) with
// the version and the time, so there's a record of each agreement:
//  - terms: the Terms of Use and Privacy Policy, needed to use an account;
//  - health: a separate yes to keeping health information in their account
//    (Washington's My Health My Data Act asks for its own consent, not one
//    folded into the terms).
// A child's username login never sees either: their parent agreed for them
// when making the login.

type Agreement = { version: string; at: string };

/** A login a parent made for a child 12 or under. */
export const isChildLogin = (user: User | null | undefined) =>
  Boolean(user?.email?.endsWith(`@${USERNAME_DOMAIN}`));

const agreed = (user: User | null | undefined, key: "terms" | "health_consent", version: string) =>
  (user?.user_metadata?.[key] as Agreement | undefined)?.version === version;

export const hasAcceptedTerms = (user: User | null | undefined) =>
  isChildLogin(user) || agreed(user, "terms", TERMS_VERSION);

export const hasHealthConsent = (user: User | null | undefined) =>
  isChildLogin(user) || agreed(user, "health_consent", HEALTH_CONSENT_VERSION);

export const termsAgreement = (): Agreement => ({ version: TERMS_VERSION, at: new Date().toISOString() });

export async function recordTerms(): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ data: { terms: termsAgreement() } });
  return error?.message ?? null;
}

export async function recordHealthConsent(): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({
    data: { health_consent: { version: HEALTH_CONSENT_VERSION, at: new Date().toISOString() } },
  });
  return error?.message ?? null;
}

// Ticking "I agree" before Continue with Google, or before a confirmation
// email, happens before there's an account to save it on. It's remembered here
// and saved as soon as they're signed in.
const PENDING_KEY = "voiced:terms-agreed";

export function rememberTermsAgreed() {
  try {
    localStorage.setItem(PENDING_KEY, TERMS_VERSION);
  } catch {
    // Without storage they're just asked again once signed in.
  }
}

export function takeRememberedTerms(): boolean {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
    return v === TERMS_VERSION;
  } catch {
    return false;
  }
}

/** The AI features send what's typed to Anthropic. Children's logins don't
 *  get them: a child's words never leave Voiced. */
export async function assertNotChildLogin() {
  const { data } = await supabase.auth.getSession();
  if (isChildLogin(data.session?.user)) {
    throw new Error("The AI features are for grown-ups. Ask your grown-up to help with this one.");
  }
}
