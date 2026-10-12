import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  REJECTION_REASONS,
  fetchPendingStories,
  fetchApprovedForAdmin,
  setStoryStatus,
  StoryRow,
} from "../lib/stories";
import { authEnabled } from "../lib/supabaseClient";
import PageLoading from "../components/PageLoading";

export default function AdminStories() {
  const { user, isAdmin, loading } = useAuth();
  const [pending, setPending] = useState<StoryRow[]>([]);
  const [approved, setApproved] = useState<StoryRow[]>([]);
  const [busyId, setBusyId] = useState<StoryRow["id"] | null>(null);
  const [fetching, setFetching] = useState(true);
  // The story being turned down, and why.
  const [rejecting, setRejecting] = useState<StoryRow["id"] | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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

  async function act(id: StoryRow["id"], status: "approved" | "rejected" | "pending") {
    setBusyId(id);
    setNotice(null);
    const { error } = await setStoryStatus(id, status);
    if (error) setNotice({ tone: "error", text: error });
    await refresh();
    setBusyId(null);
  }

  function startReject(id: StoryRow["id"]) {
    setRejecting(id);
    setReason("");
    setNote("");
    setNotice(null);
  }

  async function confirmReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejecting || !reason) return;
    const id = rejecting;
    setBusyId(id);
    const { error, reasonSaved } = await setStoryStatus(id, "rejected", { reason, note: note.trim() });
    if (error) setNotice({ tone: "error", text: error });
    else if (reasonSaved === false)
      setNotice({
        tone: "error",
        text: "Rejected, but the reason couldn't be saved — run supabase/rejections-and-messages.sql in Supabase so writers can be told why.",
      });
    else
      setNotice({
        tone: "ok",
        text: "Rejected. If they sent it in while signed in, they'll see why in their Notifications.",
      });
    setRejecting(null);
    await refresh();
    setBusyId(null);
  }

  if (loading) return <PageLoading />;

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
        Only admins can see this page. Approve a story to publish it to the public Stories
        page, or reject it with a reason — the writer is told why.
      </p>

      {!authEnabled && (
        <div className="btd-card p-4 mb-6 bg-clay/10 border-clay/40 text-sm text-ink">
          Story submissions aren't connected yet — see README "Setting up login."
        </div>
      )}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mb-6 rounded border px-3 py-2 text-sm ${
            notice.tone === "error"
              ? "border-coral bg-coral/20 text-coral-ink"
              : "border-sky bg-sky-tint text-sky-ink"
          }`}
        >
          {notice.text}
        </p>
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
                    onClick={() => startReject(s.id)}
                    className="px-3 py-1.5 rounded border border-clay text-clay text-xs font-semibold disabled:opacity-50"
                  >
                    Reject…
                  </button>
                </div>
                {rejecting === s.id && (
                  <form onSubmit={confirmReject} className="mt-4 grid gap-3 rounded-tile border-2 border-coral/60 p-4">
                    <fieldset>
                      <legend className="text-sm font-bold text-navy">Why isn't it being published?</legend>
                      <p className="mt-0.5 text-13 text-muted">
                        The writer is told it didn't follow the community guidelines, with
                        this reason, and that they can reach out with questions.
                      </p>
                      <div className="mt-2 grid gap-1.5">
                        {REJECTION_REASONS.map((r) => (
                          <label key={r} className="flex items-center gap-2 text-sm text-ink">
                            <input
                              type="radio"
                              name={`reason-${s.id}`}
                              value={r}
                              checked={reason === r}
                              onChange={() => setReason(r)}
                              className="h-4 w-4"
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div>
                      <label htmlFor={`note-${s.id}`} className="block text-sm font-bold text-navy">
                        Note to the writer <span className="font-normal text-muted">(optional)</span>
                      </label>
                      <textarea
                        id={`note-${s.id}`}
                        className="btd-input mt-1 min-h-[60px]"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. If you take out the clinic's name, we'd love to publish it."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={!reason || busyId === s.id}
                        className="px-3 py-1.5 rounded bg-coral-ink text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Reject and let them know
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejecting(null)}
                        className="px-3 py-1.5 rounded border border-ink/20 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
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
