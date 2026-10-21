import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../icons/Icon";
import { useAuth } from "../../context/AuthContext";
import { useAccountMode } from "../../context/AccountModeContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
  FamilyInvite,
  FamilyPerson,
  acceptInvite,
  cancelInvite,
  createInvite,
  listMyInvites,
  showCode,
  unlink,
  usernameOf,
} from "../../lib/family";
import { AddChildForm, ChildAccess } from "./ChildCards";

// Profile → Family. Each person has one profile:
//  - a parent adds their children's profiles here (once), and gives each one
//    a way in: a username login (12 and under) or an invite (13 and up);
//  - a self-advocate who signed up on their own can invite a grown-up with a
//    code, and the grown-up enters it here.
// What a linked grown-up can and can't see is set by the database; the words
// here describe it.

export default function FamilyPanel() {
  const { user } = useAuth();
  const { mode, family } = useAccountMode();
  const { refresh: refreshNotices } = useNotifications();
  const [params] = useSearchParams();
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [code, setCode] = useState(() => params.get("code") ?? "");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A child's own username login doesn't manage anyone.
  const childLogin = Boolean(usernameOf(user?.email));

  async function loadInvites() {
    setInvites(await listMyInvites());
  }
  useEffect(() => {
    if (user) loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  const { children, grownUps } = family;
  const asParent = mode === "parent" || children.length > 0;

  async function inviteGrownUp() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await createInvite("child");
    setBusy(false);
    if (res.error) setError(res.error);
    await loadInvites();
  }

  async function enter() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await acceptInvite(code);
    setBusy(false);
    if (res.error) return setError(res.error);
    setCode("");
    await family.reload();
    refreshNotices();
    setNotice("You're linked.");
  }

  async function remove(p: FamilyPerson) {
    if (!window.confirm(`Unlink ${p.name}? They won't see your profile any more. Anything they added stays. ${p.name} will be told.`)) return;
    const res = await unlink(p.linkId);
    if (res.error) setError(res.error);
    else setNotice(`Unlinked ${p.name}.`);
    await family.reload();
  }

  return (
    <div className="grid gap-7">
      {error && (
        <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink">
          {notice}
        </p>
      )}

      {asParent && (
        <section aria-labelledby="fam-children" className="grid gap-3">
          <h3 id="fam-children" className="text-17 font-extrabold text-navy">
            My children
          </h3>
          <p className="text-15 text-body">
            Each child has one profile. You and they see the same calendar, Me board and
            Appointment Prep — except calendar notes they mark “Just for me”.
          </p>
          {children.length === 0 && <p className="text-15 text-body">You haven't added a child yet.</p>}
          <ul className="grid gap-3">
            {children.map((c) => (
              <li key={c.linkId} className="grid gap-3 rounded-card border border-navy/12 bg-white p-4">
                <span className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
                    <Icon name="person" size={22} />
                  </span>
                  <span className="text-17 font-extrabold text-navy">{c.name}</span>
                </span>
                <ChildAccess child={c} />
              </li>
            ))}
          </ul>
          {adding ? (
            <div className="rounded-card border-2 border-sky bg-sky-tint p-4">
              <AddChildForm
                submitLabel="Add"
                onAdded={(_, name) => {
                  setAdding(false);
                  setNotice(`${name} is added.`);
                }}
              />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="btd-btn-sky min-h-[48px] justify-self-start gap-2 px-5 text-sm">
              <Icon name="plus" size={18} />
              {children.length ? "Add another child" : "Add my child"}
            </button>
          )}
        </section>
      )}

      {!asParent && (
        <section aria-labelledby="fam-grownups" className="grid gap-3">
          <h3 id="fam-grownups" className="text-17 font-extrabold text-navy">
            My grown-ups
          </h3>
          {grownUps.length === 0 ? (
            <p className="text-15 text-body">No grown-up is linked to your profile.</p>
          ) : (
            <ul className="grid gap-2">
              {grownUps.map((g) => (
                <li key={g.linkId} className="flex flex-wrap items-center gap-4 rounded-card border border-navy/12 bg-white p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
                    <Icon name="heart" size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-15 font-extrabold text-navy">{g.name}</span>
                    <span className="block text-13 text-body">
                      Sees and adds to your calendar, Me board and Appointment Prep. Never sees what you
                      mark “Just for me”.
                    </span>
                  </span>
                  {!childLogin && (
                    <button type="button" onClick={() => remove(g)} className="min-h-[40px] px-3 text-sm font-semibold text-clay hover:underline">
                      Unlink
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {childLogin ? (
            <p className="text-15 text-body">Your grown-up looks after who's linked to your profile.</p>
          ) : (
            <div className="grid gap-3 rounded-card bg-mist p-5">
              <button
                type="button"
                disabled={busy}
                onClick={inviteGrownUp}
                className="btd-btn-sky min-h-[48px] justify-self-start gap-2 px-5 py-3 text-sm"
              >
                <Icon name="plus" size={18} />
                Invite a caregiver
              </button>
              <p className="text-13 text-muted">
                Makes a code for a parent or helper. They make their own Voiced account as a parent or
                caregiver, then enter the code. Up to 2 grown-ups.
              </p>
              {invites.length > 0 && (
                <ul className="grid gap-2">
                  {invites.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center gap-4 rounded-card border-2 border-navy bg-white p-4">
                      <span className="font-display text-28 font-extrabold tracking-[0.12em] text-navy" aria-label={`Code ${i.code.split("").join(" ")}`}>
                        {showCode(i.code)}
                      </span>
                      <span className="min-w-0 flex-1 text-13 text-body">
                        For your grown-up to enter in their Profile → Family. Works once, until{" "}
                        {new Date(i.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/profile?section=family&code=${i.code}`)}
                          className="btd-btn-outline min-h-[40px] px-4 py-2 text-sm"
                        >
                          Copy a link
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await cancelInvite(i.id);
                            loadInvites();
                          }}
                          className="min-h-[40px] px-3 text-sm font-semibold text-link hover:underline"
                        >
                          Cancel code
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {!childLogin && mode !== "self" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
          className="grid gap-2 rounded-card bg-mist p-5"
        >
          <label className="grid gap-1 text-sm font-semibold text-navy">
            Got a code from someone you help? Enter it
            <input
              className="btd-input w-[12rem] uppercase tracking-[0.12em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABC-123"
              autoComplete="off"
              maxLength={8}
            />
          </label>
          <span className="text-13 text-muted">
            For someone who made their own Voiced account and invited you. You'll see their profile here.
          </span>
          <button type="submit" disabled={busy || !code.trim()} className="btd-btn-coral min-h-[48px] justify-self-start px-5 py-3 text-sm disabled:opacity-40">
            Link
          </button>
        </form>
      )}
    </div>
  );
}
