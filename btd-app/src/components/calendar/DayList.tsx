import { useState } from "react";
import Icon from "../icons/Icon";
import { CalendarEntry, aboutLines, detailLines } from "../../lib/calendar";
import { groupOf, plainSummary } from "../../lib/calendarGroups";
import { feeling, painSpotSentence } from "../../lib/myVoice";

// A day's entries as a plain list: "Pain · A lot" over "New or different ·
// my head". Tap one to see all of it, change it, or delete it. The star
// brings it to the next appointment.

export default function DayList({
  entries,
  all,
  canChange,
  canDelete,
  canPlan,
  writerName,
  teller,
  onEdit,
  onDelete,
  onToggleVisit,
  empty = "Nothing yet. Tap a button above to start.",
}: {
  entries: CalendarEntry[];
  /** Every entry, for "Day 2" of a period. */
  all: CalendarEntry[];
  canChange: (e: CalendarEntry) => boolean;
  canDelete: (e: CalendarEntry) => boolean;
  canPlan: boolean;
  writerName: (e: CalendarEntry) => string | null;
  teller?: (e: CalendarEntry) => string;
  onEdit: (e: CalendarEntry) => void;
  onDelete: (e: CalendarEntry) => void;
  onToggleVisit: (e: CalendarEntry) => void;
  empty?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (!entries.length) return <p className="text-15 text-body">{empty}</p>;
  return (
    <ul className="grid gap-2.5">
      {entries.map((e) => {
        const g = groupOf(e);
        const s = plainSummary(e, all);
        const isOpen = open === e.id;
        const by = writerName(e);
        return (
          <li key={e.id} className={`rounded-card ${g.row}`}>
            <div className="flex items-center gap-3 p-3 pl-4">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : e.id)}
                className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className={`h-3 w-3 shrink-0 rounded-full ${g.dot}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-17 font-extrabold text-navy">{s.title}</span>
                  {(s.sub || by || e.private) && (
                    <span className="block text-13 text-body">
                      {[s.sub, by ? `Logged by ${by}` : "", e.private ? "Just for me" : ""].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              </button>
              {canPlan && !e.checkInId && (
                <button
                  type="button"
                  aria-pressed={e.addToVisit}
                  aria-label={e.addToVisit ? "Saved for my next visit. Tap to take it off." : "Bring this to my next visit"}
                  onClick={() => onToggleVisit(e)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/70"
                >
                  <Icon name={e.addToVisit ? "star-filled" : "star"} size={22} className={e.addToVisit ? "text-coral-hover" : "text-navy"} />
                </button>
              )}
            </div>
            {isOpen && (
              <div className="border-t border-navy/10 px-4 pb-4 pt-3">
                <p className="text-13 font-semibold text-muted">
                  {new Date(e.loggedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  {e.checkInId ? " · From My Voice" : ""}
                </p>
                <ul className="mt-1 grid gap-0.5 text-15 text-navy">
                  {[...detailLines(e, (id) => feeling(id).short, painSpotSentence), ...aboutLines(e, false, teller)].map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                  {e.note && <li className="italic">“{e.note}”</li>}
                </ul>
                {canDelete(e) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canChange(e) && (
                      <button type="button" onClick={() => onEdit(e)} className="btd-btn-outline min-h-[44px] bg-white px-4 py-2 text-sm">
                        Change it
                      </button>
                    )}
                    <button type="button" onClick={() => onDelete(e)} className="min-h-[44px] px-3 text-sm font-semibold text-clay hover:underline">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
