import { useState } from "react";
import Icon from "../../components/icons/Icon";
import { CleanupList, adminApi, kindLabel, shortDate } from "../../lib/adminApi";

// The yearly cleanup the Privacy Policy promises: accounts nobody has used in
// 2 years, and stories that weren't published. Check the list, email the
// people who have an address, then come back and delete.

export default function AdminCleanup() {
  const [list, setList] = useState<CleanupList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function check() {
    setBusy(true);
    setError(null);
    setDone(null);
    const { data, error } = await adminApi<CleanupList>("cleanup-preview");
    setBusy(false);
    if (error || !data) return setError(error);
    setList(data);
  }

  async function run() {
    if (!list) return;
    const sure = window.confirm(
      `Delete ${list.people.length} account(s) and ${list.stories.length} unpublished story/stories? This can't be undone.`
    );
    if (!sure) return;
    setBusy(true);
    const { data, error } = await adminApi<{ deleted: number; storiesDeleted: number; failed: string[] }>("cleanup-run");
    setBusy(false);
    if (error || !data) return setError(error);
    setDone(
      `Done: ${data.deleted} account(s) and ${data.storiesDeleted} story/stories deleted.` +
        (data.failed.length ? ` Couldn't delete: ${data.failed.join(", ")}.` : "")
    );
    setList(null);
  }

  const emails = list?.people.filter((p) => p.kind === "email" && p.login).map((p) => p.login!) ?? [];

  return (
    <div className="btd-container max-w-4xl py-10 pb-20">
      <h1 className="font-display text-30 font-extrabold text-navy">Yearly cleanup</h1>
      <p className="mt-2 max-w-[44em] text-17 leading-[1.6] text-body">
        Our Privacy Policy promises that once a year (every October) we delete accounts nobody has
        signed in to for 2 years, and stories we decided not to publish. A child's profile only
        counts as unused if the child and all their grown-ups haven't signed in.
      </p>

      <ol className="mt-6 grid gap-2 text-15 leading-[1.6] text-body">
        <li><strong className="text-navy">1.</strong> Check who would be removed.</li>
        <li><strong className="text-navy">2.</strong> Email the people who have an email address, so they can sign in to keep their account. Wait about 2 weeks.</li>
        <li><strong className="text-navy">3.</strong> Come back and check again: anyone who signed in drops off the list. Then delete.</li>
      </ol>

      <button type="button" onClick={check} disabled={busy} className="btd-btn-coral mt-6 min-h-[52px] gap-2 px-7 text-base disabled:opacity-50">
        <Icon name="search" size={20} />
        {busy && !list ? "Checking…" : "Check who would be removed"}
      </button>

      {error && (
        <p role="alert" className="mt-5 rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="mt-5 rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink">
          {done}
        </p>
      )}

      {list && (
        <section className="mt-8 grid gap-6">
          <p className="text-15 text-body">
            Not used since before <strong className="text-navy">{shortDate(list.cutoff)}</strong>:{" "}
            {list.people.length} account(s), and {list.stories.length} unpublished story/stories.
          </p>

          {list.people.length > 0 && (
            <div className="btd-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-17 font-extrabold text-navy">Accounts</h2>
                {emails.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(emails.join(", "));
                        setCopied(true);
                      } catch {
                        setError("Couldn't copy. Select the addresses below instead.");
                      }
                    }}
                    className="btd-btn-outline min-h-[44px] px-4 text-sm"
                  >
                    {copied ? "Copied" : `Copy ${emails.length} email address(es)`}
                  </button>
                )}
              </div>
              <ul className="mt-3 grid gap-2 text-15">
                {list.people.map((p) => (
                  <li key={p.id} className="border-t border-navy/10 pt-2">
                    <span className="font-bold text-navy">{p.name || p.login || "No name"}</span>
                    {p.login && p.name ? ` · ${p.login}` : ""}
                    <span className="block text-13 text-muted">
                      {kindLabel(p)} · Last signed in {shortDate(p.lastSignInAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {list.stories.length > 0 && (
            <div className="btd-card p-5">
              <h2 className="text-17 font-extrabold text-navy">Unpublished stories</h2>
              <ul className="mt-3 grid gap-1 text-15 text-body">
                {list.stories.map((s) => (
                  <li key={s.id}>
                    {s.title || "Untitled"} <span className="text-13 text-muted">· sent {shortDate(s.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {list.people.length + list.stories.length > 0 ? (
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="btd-btn min-h-[52px] justify-self-start gap-2 bg-clay px-7 text-base text-white hover:bg-clay/90 disabled:opacity-50"
            >
              <Icon name="trash" size={20} />
              {busy ? "Deleting…" : "Delete all of these"}
            </button>
          ) : (
            <p className="flex items-center gap-2 text-15 font-semibold text-navy">
              <Icon name="check" size={18} />
              Nothing to clean up this year.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
