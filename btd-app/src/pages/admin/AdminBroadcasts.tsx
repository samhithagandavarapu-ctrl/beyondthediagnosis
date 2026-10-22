import { useEffect, useState } from "react";
import Icon from "../../components/icons/Icon";
import { Broadcast, deleteBroadcast, listBroadcasts, sendBroadcast, setBroadcastActive } from "../../lib/broadcasts";
import { shortDate } from "../../lib/adminApi";

// Send a message to everyone: it lands in every signed-in person's
// Notifications, and can also pop up once for everyone who visits.

const empty = { title: "", body: "", linkUrl: "", linkLabel: "", popup: false };

export default function AdminBroadcasts() {
  const [draft, setDraft] = useState(empty);
  const [list, setList] = useState<Broadcast[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  const load = () => listBroadcasts().then(setList);
  useEffect(() => {
    load();
  }, []);

  async function send() {
    if (!draft.title.trim()) return setNotice({ error: true, text: "Give it a title first." });
    const where = draft.popup ? "everyone's Notifications, and as a pop-up for every visitor" : "everyone's Notifications";
    if (!window.confirm(`Send "${draft.title.trim()}" to ${where}?`)) return;
    setBusy(true);
    const error = await sendBroadcast(draft);
    setBusy(false);
    if (error) return setNotice({ error: true, text: error });
    setNotice({ error: false, text: "Sent. People see it the next time they open Voiced." });
    setDraft(empty);
    load();
  }

  async function act(fn: () => Promise<string | null>) {
    const error = await fn();
    if (error) setNotice({ error: true, text: error });
    load();
  }

  const field = "grid gap-1.5 text-15 font-bold text-navy";

  return (
    <div className="btd-container max-w-3xl py-10 pb-20">
      <h1 className="font-display text-30 font-extrabold text-navy">Broadcasts</h1>
      <p className="mt-2 text-17 text-body">
        Send a message to everyone on Voiced. It shows in each person's Notifications (the bell), and you can also
        have it pop up once for everyone who visits.
      </p>

      <section className="btd-card mt-8 grid gap-4 p-6">
        <h2 className="text-21 font-extrabold text-navy">New broadcast</h2>
        <label className={field}>
          Title
          <input className="btd-input text-base" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label className={field}>
          Message
          <textarea
            className="btd-input min-h-[110px] text-base"
            maxLength={2000}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        </label>
        <label className={field}>
          Link (optional)
          <input className="btd-input text-base" value={draft.linkUrl} onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })} />
          <span className="text-13 font-normal text-muted">A full web address (https://…), or a page on Voiced like /stories.</span>
        </label>
        <label className={field}>
          Link words
          <input className="btd-input text-base" value={draft.linkLabel} onChange={(e) => setDraft({ ...draft, linkLabel: e.target.value })} />
        </label>
        <label className="flex items-start gap-3 text-15 font-semibold text-navy">
          <input
            type="checkbox"
            checked={draft.popup}
            onChange={(e) => setDraft({ ...draft, popup: e.target.checked })}
            className="mt-1 h-5 w-5 shrink-0 accent-navy"
          />
          <span>Also pop up once for everyone who visits, signed in or not</span>
        </label>
        {notice && (
          <p
            role={notice.error ? "alert" : "status"}
            className={`rounded border px-3 py-2 text-sm ${notice.error ? "border-coral bg-coral/20 text-coral-ink" : "border-sky bg-sky-tint text-sky-ink"}`}
          >
            {notice.text}
          </p>
        )}
        <button type="button" onClick={send} disabled={busy} className="btd-btn-coral min-h-[52px] justify-self-start gap-2 px-7 text-base disabled:opacity-50">
          <Icon name="send" size={20} />
          {busy ? "Sending…" : "Send to everyone"}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="text-21 font-extrabold text-navy">Sent</h2>
        {list === null ? (
          <p className="mt-3 text-15 text-muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="mt-3 text-15 text-muted">Nothing sent yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {list.map((b) => (
              <li key={b.id} className={`btd-card grid gap-2 p-5 ${b.active ? "" : "opacity-60"}`}>
                <p className="text-13 font-bold uppercase tracking-[0.08em] text-muted">
                  {shortDate(b.createdAt)} · {b.active ? "Showing" : "Turned off"}
                  {b.popup ? " · Pop-up" : ""}
                </p>
                <p className="text-17 font-extrabold text-navy">{b.title}</p>
                {b.body && <p className="whitespace-pre-wrap text-15 text-body">{b.body}</p>}
                <div className="mt-1 flex flex-wrap gap-4 text-sm font-bold">
                  <button type="button" onClick={() => act(() => setBroadcastActive(b.id, !b.active))} className="text-link hover:underline">
                    {b.active ? "Turn off" : "Turn back on"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm("Delete this broadcast for good?") && act(() => deleteBroadcast(b.id))}
                    className="text-clay hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
