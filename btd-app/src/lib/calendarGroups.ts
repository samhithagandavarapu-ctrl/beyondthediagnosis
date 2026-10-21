import { IconName } from "../components/icons/Icon";
import {
  BEHAVIORS,
  CalendarEntry,
  CategoryId,
  EATING_AMOUNT,
  EMOTIONS,
  ENERGY_LEVELS,
  SKIN_CHANGES,
  SLEEP_QUALITY,
  strengthWords,
} from "./calendar";
import { feeling, painArea } from "./myVoice";
import { cycles, daysBetween } from "./cycles";

// The six tiles on Today, each with its own colour and word, so the month's
// dots never need a key to make sense. Everything the calendar can hold sits
// in one of them; "Something else" opens the rest.

export type GroupId = "period" | "pain" | "feelings" | "sleep" | "tummy" | "else";

export type Group = {
  id: GroupId;
  label: string;
  icon: IconName;
  /** Tile background and border. */
  tile: string;
  /** Icon colour on the tile. */
  ink: string;
  /** The dot on the week strip and the month, and the day list's marker. */
  dot: string;
  /** The day list's row background. */
  row: string;
};

export const GROUPS: Group[] = [
  { id: "period", label: "My period", icon: "drop", tile: "bg-[#FFE1DA] border-[#FFE1DA]", ink: "text-[#B2442E]", dot: "bg-[#D9573D]", row: "bg-[#FFE9E4]" },
  { id: "pain", label: "Pain", icon: "pain-sharp", tile: "bg-[#FFF0CF] border-[#FFF0CF]", ink: "text-[#8A6100]", dot: "bg-[#C99300]", row: "bg-[#FFF4DB]" },
  { id: "feelings", label: "Feelings", icon: "hub-feelings", tile: "bg-sky-tint border-sky-tint", ink: "text-[#1B5C8F]", dot: "bg-[#3D8FCC]", row: "bg-sky-tint" },
  { id: "sleep", label: "Sleep", icon: "moon", tile: "bg-[#E9E5F8] border-[#E9E5F8]", ink: "text-[#5040A0]", dot: "bg-[#6E5CC4]", row: "bg-[#EFECFA]" },
  { id: "tummy", label: "Tummy & bathroom", icon: "utensils", tile: "bg-[#DDF1E4] border-[#DDF1E4]", ink: "text-[#22663A]", dot: "bg-[#3C9A5C]", row: "bg-[#E6F5EB]" },
  { id: "else", label: "Something else", icon: "plus", tile: "bg-white border-navy/15", ink: "text-navy", dot: "bg-[#7A8794]", row: "bg-mist" },
];

const BY_CATEGORY: Record<CategoryId, GroupId> = {
  period: "period",
  pain: "pain",
  mood: "feelings",
  sleep: "sleep",
  bathroom: "tummy",
  eating: "tummy",
  behavior: "else",
  skin: "else",
  energy: "else",
  event: "else",
  other: "else",
};

export const group = (id: GroupId): Group => GROUPS.find((g) => g.id === id) ?? GROUPS[GROUPS.length - 1];
export const groupOf = (e: Pick<CalendarEntry, "category">): Group => group(BY_CATEGORY[e.category] ?? "else");

/** The kinds behind "Something else", in the order they're offered. */
export const ELSE_KINDS: { id: CategoryId; label: string; icon: IconName }[] = [
  { id: "behavior", label: "Something is different", icon: "shuffle" },
  { id: "skin", label: "My skin", icon: "skin" },
  { id: "energy", label: "My energy", icon: "battery" },
  { id: "eating", label: "Eating", icon: "utensils" },
  { id: "event", label: "Something scary happened", icon: "alert" },
];

const labelOf = <T extends { id: string; label: string }>(list: readonly T[], id: string | undefined) =>
  list.find((x) => x.id === id)?.label ?? "";

/** What a short name for its kind says: "Pain", "Tummy & bathroom", "My skin". */
function kindWord(e: CalendarEntry): string {
  if (e.customLabel?.trim()) return e.customLabel.trim();
  const g = groupOf(e);
  if (g.id !== "else") return g.id === "period" ? "Period" : g.label;
  return ELSE_KINDS.find((k) => k.id === e.category)?.label ?? "Something else";
}

/** A day-list row in plain words: "Pain · A lot" over "New or different ·
 *  my head". No icons needed to read it. */
export function plainSummary(e: CalendarEntry, entries: CalendarEntry[] = []): { title: string; sub: string } {
  const d = e.details;
  let answer = "";
  const extra: string[] = [];
  switch (e.category) {
    case "period":
      answer = d.ended ? "Stopped" : d.spotting ? "Spotting" : d.firstDay ? "Started" : "Still going";
      if (!d.ended && !d.spotting) {
        const c = [...cycles(entries)].reverse().find((x) => x.start <= e.entryDate);
        if (c) extra.push(`Day ${daysBetween(c.start, e.entryDate) + 1}`);
      }
      break;
    case "mood":
      answer = d.feelings?.length
        ? d.feelings.map((f) => labelOf(EMOTIONS, f)).join(", ")
        : d.overall
          ? feeling(d.overall).short
          : strengthWords(e);
      break;
    case "sleep":
      answer = labelOf(SLEEP_QUALITY, d.sleepQuality) || strengthWords(e);
      break;
    case "energy":
      answer = d.energy === "normal" ? "Usual" : labelOf(ENERGY_LEVELS, d.energy);
      break;
    case "eating":
      answer = labelOf(EATING_AMOUNT, d.eatingAmount) || strengthWords(e);
      break;
    case "behavior":
      answer = d.changes?.length ? d.changes.map((c) => labelOf(BEHAVIORS, c)).join(", ") : "";
      break;
    case "skin":
      answer = d.skin?.length ? d.skin.map((x) => labelOf(SKIN_CHANGES, x)).join(", ") : "";
      break;
    case "event":
      answer = d.whatHappened?.trim() ?? "";
      break;
    default:
      answer = strengthWords(e);
  }
  if (e.category === "pain") {
    answer = strengthWords(e) || answer;
    const where = (d.spots ?? []).map((s) => painArea(s.area).label);
    if (where.length) extra.push(where.join(", "));
  }
  const usual = e.typical === "new" ? "New or different" : e.typical === "typical" ? "Normal for me" : e.typical === "unsure" ? "Not sure if it's usual" : "";
  const sub = [usual, ...extra, e.note?.trim() ? `“${e.note.trim()}”` : ""].filter(Boolean).join(" · ");
  return { title: answer ? `${kindWord(e)} · ${answer}` : kindWord(e), sub };
}

/** Whether "Is this normal for you?" is worth asking: only when it's strong,
 *  or when the answer itself is a worry. Keeps quick logs quick. */
export function asksIfUsual(e: CalendarEntry): boolean {
  const d = e.details;
  switch (e.category) {
    case "mood":
      return !!d.feelings?.some((f) => ["sad", "angry", "worried", "mood-swings"].includes(f));
    case "sleep":
      return d.sleepQuality === "bad";
    case "energy":
      return d.energy === "low";
    case "eating":
      return d.eatingAmount === "less" || d.eatingAmount === "more";
    case "behavior":
      return !!d.changes?.length;
    case "period":
    case "event":
      return false;
    default:
      return e.severityScale === "faces" && (e.severity ?? 0) >= 2;
  }
}
