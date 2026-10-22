import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Broadcast, listBroadcasts } from "../lib/broadcasts";
import { isExternalLink } from "../lib/siteSettings";
import Icon from "./icons/Icon";

// A broadcast the team marked "pop up": shown once to every visitor, newest
// first, and never again in this browser after it's closed.

const SEEN_KEY = "voiced:broadcast-popups-seen";

function seen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export default function BroadcastPopup() {
  const { isAdmin } = useAuth();
  const [shown, setShown] = useState<Broadcast | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    let cancelled = false;
    listBroadcasts().then((list) => {
      const done = seen();
      const next = list.find((b) => b.active && b.popup && !done.includes(b.id));
      if (!cancelled && next) setShown(next);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!shown) return null;

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen(), shown!.id].slice(-50)));
    } catch {
      // Without storage it may show again next visit.
    }
    setShown(null);
  }

  const link = shown.linkUrl;
  const linkClass = "btd-btn-coral min-h-[48px] gap-2 px-6 text-base";

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="broadcast-title" className="fixed inset-0 z-[70] grid place-items-center bg-navy/50 p-4">
      <div className="btd-card grid w-full max-w-md gap-4 p-6">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-butter text-navy">
          <Icon name="bell" size={24} />
        </span>
        <p className="text-13 font-bold uppercase tracking-[0.08em] text-muted">From the Voiced team</p>
        <h2 id="broadcast-title" className="text-23 font-extrabold text-navy">
          {shown.title}
        </h2>
        {shown.body && <p className="whitespace-pre-wrap text-15 leading-[1.6] text-body">{shown.body}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {link &&
            (isExternalLink(link) ? (
              <a href={link} target="_blank" rel="noopener noreferrer" onClick={close} className={linkClass}>
                {shown.linkLabel || "Learn more"}
              </a>
            ) : (
              <Link to={link} onClick={close} className={linkClass}>
                {shown.linkLabel || "Learn more"}
              </Link>
            ))}
          <button type="button" onClick={close} autoFocus className="btd-btn-outline min-h-[48px] px-6 text-base">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
