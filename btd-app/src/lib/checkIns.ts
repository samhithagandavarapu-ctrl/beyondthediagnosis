import { authEnabled, supabase } from "./supabaseClient";
import { CheckIn, PainReport, normalizeCheckIn, sortCheckIns } from "./myVoice";

// My Voice check-ins: every one kept as its own dated entry, so there's a
// history to look back on and to choose from for the doctor sheet.
//
// Signed in, they're kept in your account (the my_voice_check_ins table — see
// supabase/my-voice-check-ins.sql) so they follow you to any device. Signed
// out, or before that table exists, they're kept in this browser. Signing in
// moves any check-ins made on this device into the account, the same way
// Appointment Prep drafts do.

export type CheckInStore = "account" | "device";

const LOCAL_KEY = "voiced:my-voice-check-ins";
// What My Voice kept before there was a list: one check-in, and one body map.
const OLD_CHECKIN_KEY = "verity-my-voice-checkin";
const OLD_PAIN_KEY = "verity-my-voice-pain";

// ---- This device ----

function readLocal(): CheckIn[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as CheckIn[]).map(normalizeCheckIn) : [];

    // The old single check-in and body map become the first entry (or two).
    const oldCheckIn = localStorage.getItem(OLD_CHECKIN_KEY);
    const oldPain = localStorage.getItem(OLD_PAIN_KEY);
    if (oldCheckIn || oldPain) {
      const checkIn = oldCheckIn ? normalizeCheckIn(JSON.parse(oldCheckIn) as CheckIn) : null;
      const pain = oldPain ? (JSON.parse(oldPain) as PainReport) : null;
      // One entry if they were made in the same sitting; two if not.
      const sameSitting =
        checkIn &&
        pain &&
        Math.abs(Date.parse(checkIn.createdAt) - Date.parse(pain.createdAt)) < 60 * 60 * 1000;
      if (checkIn && pain?.spots.length && !checkIn.pain?.length && sameSitting) {
        list.push({ ...checkIn, pain: pain.spots });
      } else {
        if (checkIn) list.push(checkIn);
        if (pain?.spots.length) {
          list.push(normalizeCheckIn({ createdAt: pain.createdAt, pain: pain.spots }));
        }
      }
      writeLocal(list);
      localStorage.removeItem(OLD_CHECKIN_KEY);
      localStorage.removeItem(OLD_PAIN_KEY);
    }
    return sortCheckIns(list);
  } catch {
    return [];
  }
}

function writeLocal(list: CheckIn[]) {
  try {
    if (list.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    // Full or blocked storage just means check-ins aren't kept on this device.
  }
}

// ---- The account ----

type Row = { id: string; data: CheckIn; created_at: string };

const toRow = (c: CheckIn) => ({
  id: c.id,
  data: c,
  created_at: c.createdAt,
  updated_at: c.updatedAt ?? c.createdAt,
});

/** Every check-in for whoever is here, newest first, and where they live.
 *  `accountMissing` is true when someone is signed in but the account can't
 *  hold check-ins yet (the SQL hasn't been run), so they're on this device. */
export async function listCheckIns(
  userId: string | null
): Promise<{ checkIns: CheckIn[]; store: CheckInStore; accountMissing: boolean }> {
  const local = readLocal();
  if (!userId || !authEnabled) {
    return { checkIns: local, store: "device", accountMissing: false };
  }

  // Bring anything made on this device into the account first.
  if (local.length) {
    const { error } = await supabase
      .from("my_voice_check_ins")
      .upsert(local.map(toRow), { onConflict: "id" });
    if (!error) writeLocal([]);
  }

  const { data, error } = await supabase
    .from("my_voice_check_ins")
    .select("id, data, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Couldn't load check-ins from the account:", error.message);
    return { checkIns: readLocal(), store: "device", accountMissing: true };
  }
  return {
    checkIns: sortCheckIns((data as Row[]).map((r) => normalizeCheckIn({ ...r.data, id: r.id }))),
    store: "account",
    accountMissing: false,
  };
}

/** Save one check-in (new, or changed) where it lives. Returns where it
 *  actually went: if the account can't take it, it's kept on this device
 *  instead of lost. */
export async function saveCheckInTo(userId: string | null, checkIn: CheckIn): Promise<CheckInStore> {
  if (userId && authEnabled) {
    const { error } = await supabase
      .from("my_voice_check_ins")
      .upsert(toRow(checkIn), { onConflict: "id" });
    if (!error) return "account";
    console.error("Couldn't save the check-in to the account:", error.message);
  }
  writeLocal([checkIn, ...readLocal().filter((c) => c.id !== checkIn.id)]);
  return "device";
}

export async function deleteCheckInFrom(userId: string | null, id: string): Promise<void> {
  writeLocal(readLocal().filter((c) => c.id !== id));
  if (userId && authEnabled) {
    const { error } = await supabase.from("my_voice_check_ins").delete().eq("id", id);
    if (error) console.error("Couldn't delete the check-in from the account:", error.message);
  }
}
