import { useNavigate } from "react-router-dom";
import { managedKey, possessive, useAccountMode } from "../context/AccountModeContext";
import Icon from "./icons/Icon";

// The bar under the nav that says, on every page, whose space this is. It has
// no close button on purpose: the whole point is that it's always there.

export default function ModeBanner() {
  const { mode, previewing, endPreview, startPreview, managed, managedList, setManagedKey, myName, roleLabel } = useAccountMode();
  const navigate = useNavigate();

  if (mode === "none") return null;

  if (previewing) {
    const name = managed?.name ?? "your child";
    return (
      <div role="region" aria-label="Preview" className="border-b-2 border-navy bg-coral">
        <div className="btd-container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <p className="flex items-center gap-2 text-15 font-bold text-navy sm:text-17">
            <Icon name="eye" size={20} />
            You're seeing {possessive(name)} view
          </p>
          <button
            type="button"
            onClick={() => {
              endPreview();
              navigate("/");
            }}
            className="btd-btn min-h-[48px] gap-2 bg-navy px-6 text-15 text-mist hover:bg-navy/90"
          >
            <Icon name="chevron-right" size={18} className="rotate-180" />
            Back to my account
          </button>
        </div>
      </div>
    );
  }

  if (mode === "parent" && !managed) {
    return (
      <div role="region" aria-label="Account" className="btd-dark border-b-[3px] border-sky">
        <div className="btd-container flex items-center gap-2 py-3 text-15 font-semibold text-mist">
          <Icon name="family" size={20} className="shrink-0" />
          <span>
            <span className="font-bold">Parent or caregiver account</span> — add the person you look after to get started
          </span>
        </div>
      </div>
    );
  }

  if (mode === "parent") {
    const name = managed?.name ?? "your child";
    return (
      <div role="region" aria-label="Account" className="btd-dark border-b-[3px] border-sky">
        <div className="btd-container flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-15 font-semibold text-mist">
            <span className="inline-flex items-center gap-2">
              <Icon name="family" size={20} className="shrink-0" />
              <span>
                <span className="font-bold">{roleLabel} account</span> — you're managing
              </span>
            </span>
            {managedList.length > 1 ? (
              <label className="inline-flex items-center">
                <span className="sr-only">Who you're managing</span>
                <select
                  value={managed ? managedKey(managed) : ""}
                  onChange={(e) => setManagedKey(e.target.value)}
                  className="min-h-[40px] rounded-full border-2 border-mist/60 bg-navy px-3 py-1 text-15 font-bold text-mist"
                >
                  {managedList.map((m) => (
                    <option key={managedKey(m)} value={managedKey(m)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="font-bold text-butter">{name}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              startPreview();
              navigate("/");
            }}
            className="btd-btn min-h-[44px] gap-2 border-2 border-mist/70 px-4 text-sm text-mist hover:bg-mist hover:text-navy"
          >
            <Icon name="eye" size={18} />
            See what {name} sees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Account" className="border-b-[3px] border-butter bg-sky">
      <div className="btd-container flex items-center gap-3 py-3">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-butter text-navy">
          <Icon name="star-filled" size={20} />
        </span>
        <p className="font-display text-17 font-extrabold text-navy sm:text-21">
          Hi {myName || "there"}! This is your space.
        </p>
      </div>
    </div>
  );
}

/** "For: Maya" at the top of a tool, so it's clear whose information it is. */
export function ForLabel({ className = "" }: { className?: string }) {
  const { forName, view } = useAccountMode();
  if (!forName) return null;
  const self = view === "self";
  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-13 font-bold ${
        self ? "border-2 border-butter bg-sky text-navy" : "bg-navy text-mist"
      } ${className}`}
    >
      <Icon name={self ? "star" : "person"} size={15} />
      For: {forName}
    </p>
  );
}

/** "Parent", "Support worker" (whatever they are to the person they look
 *  after) or "Self-advocate", next to My account. */
export function ModeBadge() {
  const { mode, roleLabel } = useAccountMode();
  if (mode === "none") return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-11 font-bold uppercase tracking-[0.06em] ${
        mode === "parent" ? "bg-navy text-mist" : "border border-navy/20 bg-sky text-navy"
      }`}
    >
      {mode === "parent" ? roleLabel : "Self-advocate"}
    </span>
  );
}
