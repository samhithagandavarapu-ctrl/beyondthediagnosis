import { Link } from "react-router-dom";
import { useMyVoice } from "../../context/MyVoiceContext";
import { STICKER_KINDS, checkInLines, feeling, stickerKind } from "../../lib/myVoice";
import { shortDate } from "../../lib/shortDate";
import Icon from "../icons/Icon";
import Panel from "../Panel";
import StickerBadge from "./StickerBadge";

/** The saved check-in, kept on this device, with a way to delete it. */
export function LastCheckInPanel({ onStartCheckIn }: { onStartCheckIn: () => void }) {
  const { savedCheckIn, clearCheckIn } = useMyVoice();
  return (
    <Panel
      title="Your last check-in"
      intro={
        savedCheckIn ? (
          <>
            Kept on this device only — never uploaded. Bring it to an appointment
            through{" "}
            <Link to="/appointment-prep" className="font-semibold text-link hover:underline">
              Appointment Prep
            </Link>
            .
          </>
        ) : (
          <>
            Nothing saved yet. A check-in walks you through it — tap a body part, tap a
            face, done.
          </>
        )
      }
    >
      {savedCheckIn ? (
        <div className="rounded-tile bg-sky-tint p-5">
          <div className="flex items-start gap-4">
            {savedCheckIn.overall && (
              <Icon
                name={feeling(savedCheckIn.overall).icon}
                size={40}
                className="shrink-0 text-navy"
              />
            )}
            <div className="min-w-0">
              {checkInLines(savedCheckIn).map((line, i) => (
                <p
                  key={i}
                  className={`text-base leading-[1.6] text-sky-ink ${i > 0 ? "mt-1.5" : ""}`}
                >
                  {line}
                </p>
              ))}
              <p className="mt-3 text-13 text-muted">
                Saved {shortDate(savedCheckIn.createdAt)}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearCheckIn}
            className="mt-4 text-13 font-semibold text-link hover:underline"
          >
            Delete this check-in
          </button>
        </div>
      ) : (
        <button type="button" onClick={onStartCheckIn} className="btd-btn-sky px-[18px] py-[11px] text-sm">
          Start a check-in
        </button>
      )}
    </Panel>
  );
}

/** Every sticker there is, earned or not, and when each was earned. */
export function StickerBookPanel() {
  const { stickers } = useMyVoice();
  return (
    <Panel
      title="Sticker book"
      intro="Earned by doing things, not by showing up daily. Nothing expires and nothing is lost by taking a break."
    >
      <ul className="grid gap-5 sm:grid-cols-2">
        {STICKER_KINDS.map((kind) => {
          const earned = stickers.find((s) => s.id === kind.id);
          const meta = stickerKind(kind.id);
          return (
            <li key={kind.id} className="flex flex-col items-center text-center">
              <StickerBadge id={kind.id} earned={Boolean(earned)} size={124} />
              <span className="mt-2 text-sm font-bold text-navy">{meta.label}</span>
              <span className="mt-0.5 text-13 leading-[1.5] text-muted">
                {earned ? `Earned ${shortDate(earned.at)}` : `Not yet — ${meta.earnedFor}`}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
