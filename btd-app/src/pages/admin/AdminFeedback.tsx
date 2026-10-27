import { useEffect, useState } from "react";
import Icon from "../../components/icons/Icon";
import { shortDate } from "../../lib/adminApi";
import { FEATURES, FeedbackRow, deleteFeedback, feedbackCsv, listFeedback, roleLabel } from "../../lib/feedback";

// Every answer families sent from /feedback, newest first, with the totals at
// the top and a download of the whole lot as a spreadsheet. An admin can
// delete an answer (spam, a test, or someone asking); it asks first, and
// that's the only way an answer ever goes.

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="btd-card grid gap-1 p-5">
      <p className="text-13 font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className="font-display text-28 font-extrabold text-navy">{value}</p>
      {note && <p className="text-13 text-muted">{note}</p>}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-13 font-bold text-muted">{label}</p>
      <p className="whitespace-pre-wrap text-15 text-body">{value}</p>
    </div>
  );
}

export default function AdminFeedback() {
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(r: FeedbackRow) {
    const what = `${roleLabel(r.role) || "Someone"}'s answers from ${shortDate(r.createdAt)}`;
    if (!window.confirm(`Delete ${what} for good? This can't be undone. Download the spreadsheet first if you want a copy.`)) return;
    setDeleting(r.id);
    const err = await deleteFeedback(r.id);
    setDeleting(null);
    if (err) return setError(err);
    setError(null);
    setRows((list) => (list ?? []).filter((x) => x.id !== r.id));
  }

  useEffect(() => {
    listFeedback().then(({ data, error }) => {
      setRows(data);
      setError(error);
    });
  }, []);

  function download() {
    if (!rows) return;
    const url = URL.createObjectURL(new Blob([feedbackCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `voiced-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const all = rows ?? [];
  const eased = all.filter((r) => r.ease);
  const avgEase = eased.length ? (eased.reduce((s, r) => s + (r.ease ?? 0), 0) / eased.length).toFixed(1) : "–";
  const bring = all.filter((r) => r.wouldBring);
  const again = all.filter((r) => r.useAgain);
  const tried = FEATURES.map((f) => ({ f, n: all.filter((r) => r.tried.includes(f)).length })).sort((a, b) => b.n - a.n);

  return (
    <div className="btd-container max-w-4xl py-10 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-30 font-extrabold text-navy">Feedback</h1>
          <p className="mt-2 text-17 text-body">
            What families said on the feedback page. Share the link{" "}
            <strong className="text-navy">{window.location.origin}/feedback</strong> with testers.
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={!all.length}
          className="btd-btn-coral min-h-[48px] gap-2 px-6 text-base disabled:opacity-50"
        >
          <Icon name="file" size={20} />
          Download spreadsheet
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}

      {rows === null ? (
        <p className="mt-8 text-15 text-muted">Loading…</p>
      ) : !all.length ? (
        !error && <p className="mt-8 text-15 text-muted">No feedback yet.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Answers" value={String(all.length)} />
            <Stat label="Easy to use" value={`${avgEase} / 5`} note={`from ${eased.length}`} />
            <Stat
              label="Would bring summary"
              value={pct(bring.filter((r) => r.wouldBring === "yes").length, bring.length)}
              note={`yes, from ${bring.length}`}
            />
            <Stat
              label="Will use again"
              value={pct(again.filter((r) => r.useAgain === "definitely").length, again.length)}
              note={`definitely, from ${again.length}`}
            />
          </div>

          <section className="btd-card mt-4 p-5">
            <p className="text-13 font-bold uppercase tracking-[0.08em] text-muted">What people tried</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {tried.map(({ f, n }) => (
                <li key={f} className="rounded-full bg-sky-tint px-3 py-1 text-sm font-bold text-navy">
                  {f} · {n}
                </li>
              ))}
            </ul>
          </section>

          <ul className="mt-8 grid gap-4">
            {all.map((r) => (
              <li key={r.id} className="btd-card grid gap-3 p-5">
                <p className="text-13 font-bold uppercase tracking-[0.08em] text-muted">
                  {shortDate(r.createdAt)} · {roleLabel(r.role) || "Didn't say who"}
                  {r.signedIn ? " · Signed in" : ""}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-15 text-navy">
                  {r.ease && <span>Ease: <strong>{r.ease}/5</strong></span>}
                  {r.wouldBring && <span>Would bring summary: <strong>{r.wouldBring}</strong></span>}
                  {r.useAgain && <span>Use again: <strong>{r.useAgain}</strong></span>}
                  {r.personLiked && <span>Person liked it: <strong>{r.personLiked}</strong></span>}
                  {r.personCouldTell && <span>Could tell doctor: <strong>{r.personCouldTell}</strong></span>}
                </div>
                <Line label="Tried" value={r.tried.join(", ")} />
                <Line label="Why / why not" value={r.wouldBringWhy} />
                <Line label="Confusing or felt wrong" value={r.confusing} />
                <Line label="Wish it did" value={r.wish} />
                {r.contactOk && <Line label="OK to contact" value={r.contact || "Yes, but left no contact"} />}
                <button
                  type="button"
                  onClick={() => remove(r)}
                  disabled={deleting === r.id}
                  className="inline-flex items-center gap-1.5 justify-self-start text-sm font-bold text-coral-ink hover:underline disabled:opacity-50"
                >
                  <Icon name="trash" size={16} />
                  {deleting === r.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
