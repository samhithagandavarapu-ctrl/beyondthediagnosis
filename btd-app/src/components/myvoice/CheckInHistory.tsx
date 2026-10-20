import { CheckIn, checkInLines, feeling } from "../../lib/myVoice";
import { shortDate } from "../../lib/shortDate";
import Icon from "../icons/Icon";

/** "Tue, Oct 20 · 3:40 PM": a check-in's own date and time. */
export function checkInWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** How they felt across their check-ins, oldest on the left: one face per
 *  day they checked in, so a parent or doctor can see a pattern at a glance.
 *  Shows only once there are two faces to compare. */
export function FeelingsOverTime({ checkIns, max = 10 }: { checkIns: CheckIn[]; max?: number }) {
  const withFace = checkIns
    .filter((c) => c.overall)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-max);
  if (withFace.length < 2) return null;

  return (
    <ol aria-label="How they felt over time, oldest first" className="flex flex-wrap items-end gap-2">
      {withFace.map((c) => {
        const f = feeling(c.overall!);
        return (
          <li key={c.id} className="flex w-[64px] flex-col items-center gap-1 text-center">
            <span className={`grid h-12 w-12 place-items-center rounded-full border border-navy/12 ${f.tone}`}>
              <Icon name={f.icon} size={30} className="text-navy" />
            </span>
            <span className="text-11 font-semibold leading-tight text-muted">{shortDate(c.createdAt)}</span>
            <span className="sr-only">{f.short}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** One saved check-in: when, the face, and what it says. */
export function CheckInSummary({ checkIn }: { checkIn: CheckIn }) {
  const lines = checkInLines(checkIn);
  return (
    <div className="flex items-start gap-4">
      {checkIn.overall ? (
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border border-navy/12 ${feeling(checkIn.overall).tone}`}
        >
          <Icon name={feeling(checkIn.overall).icon} size={34} className="text-navy" />
        </span>
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-navy/12 bg-mist">
          <Icon name="hub-feelings" size={30} className="text-navy/60" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-13 font-bold text-link">{checkInWhen(checkIn.createdAt)}</p>
        <div className="mt-1 grid gap-0.5">
          {lines.map((line, i) => (
            <p key={i} className="text-15 leading-[1.55] text-navy">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
