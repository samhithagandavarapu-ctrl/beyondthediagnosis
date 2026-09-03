import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchPendingStories, fetchApprovedForAdmin, setStoryStatus, StoryRow } from "../lib/stories";
import { authEnabled } from "../lib/supabaseClient";

export default function AdminStories() {
  const { user, isAdmin, loading } = useAuth();
  const [pending, setPending] = useState<StoryRow[]>([]);
  const [approved, setApproved] = useState<StoryRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  async function refresh() {
    setFetching(true);
    const [p, a] = await Promise.all([fetchPendingStories(), fetchApprovedForAdmin()]);
    setPending(p);
    setApproved(a);
    setFetching(false);
  }

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  async function act(id: string, status: "approved" | "rejected" | "pending") {
    setBusyId(id);
    await setStoryStatus(id, status);
    await refresh();
    setBusyId(null);
  }

  if (loading) return null;

  if (!user) {
    return (
      <div className="btd-container py-14 max-w-md">
        <h1 className="text-2xl font-display font-semibold mb-2">Admin</h1>
        <p className="text-slate mb-4">You need to sign in with the owner account to see this page.</p>
        <Link to="/login" className="text-gold-dark font-semibold hover:underline">Sign in →</Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="btd-container py-14 max-w-md">
        <h1 className="text-2xl font-display font-semibold mb-2">Not authorized</h1>
        <p className="text-slate">
          This page is only visible to the site owner's account.
        </p>
      </div>
    );
  }

  return (
    <div className="btd-container py-10 max-w-3xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Story review</h1>
      <p className="text-slate mb-8">
        Only you can see this page. Approve a story to publish it to the public Stories
        page, or reject it to keep it hidden.
      </p>

      {!authEnabled && (
        <div className="btd-card p-4 mb-6 bg-clay/10 border-clay/40 text-sm text-ink">
          Story submissions aren't connected yet — see README "Setting up login."
        </div>
      )}

      {fetching ? (
        <p className="text-slate">Loading…</p>
      ) : (
        <>
          <h2 className="font-display font-semibold text-lg mb-3">
            Pending ({pending.length})
          </h2>
          <div className="space-y-4 mb-10">
            {pending.length === 0 && <p className="text-slate text-sm">Nothing waiting for review.</p>}
            {pending.map((s) => (
              <div key={s.id} className="btd-card p-5">
                <span className="text-[11px] uppercase tracking-wide font-semibold text-sage-dark">
                  {s.audience} {s.submitter_name ? `· ${s.submitter_name}` : "· Anonymous"}
                </span>
                <h3 className="font-display font-semibold text-lg mt-1 mb-1">{s.title}</h3>
                <p className="text-sm text-slate leading-relaxed mb-3 whitespace-pre-wrap">{s.excerpt}</p>
                <div className="flex gap-2">
                  <button
                    disabled={busyId === s.id}
                    onClick={() => act(s.id, "approved")}
                    className="px-3 py-1.5 rounded bg-sage-dark text-paper text-xs font-semibold disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={busyId === s.id}
                    onClick={() => act(s.id, "rejected")}
                    className="px-3 py-1.5 rounded border border-clay text-clay text-xs font-semibold disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-display font-semibold text-lg mb-3">
            Published ({approved.length})
          </h2>
          <div className="space-y-3">
            {approved.map((s) => (
              <div key={s.id} className="btd-card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-slate-light">{s.audience}</p>
                </div>
                <button
                  disabled={busyId === s.id}
                  onClick={() => act(s.id, "pending")}
                  className="px-3 py-1.5 rounded border border-ink/20 text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  Unpublish
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
