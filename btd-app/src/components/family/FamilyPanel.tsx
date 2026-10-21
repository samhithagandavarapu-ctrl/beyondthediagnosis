import { useEffect, useState } from "react";
import Icon from "../icons/Icon";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
  FamilyInvite,
  FamilyPerson,
  acceptInvite,
  cancelInvite,
  createInvite,
  getBirthYear,
  isUnder13,
  listFamily,
  listMyInvites,
  showCode,
  unlink,
} from "../../lib/family";
import BirthYearForm from "./BirthYearForm";

// Profile → Family: who I'm linked with, making and entering codes, and
// unlinking. What a linked grown-up can and can't do is set by the database;
// the words here describe it.

export default function FamilyPanel() {
  const { user } = useAuth();
  const { refresh: refreshNotices } = useNotifications();
  const [loaded, setLoaded] = useState(false);
  const [people, setPeople] = useState<FamilyPerson[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [birthYear, setBirthYearState] = useState<number | null>(null);
  const [under13Child, setUnder13Child] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);

  async function load() {
    if (!user) return;
    try {
      const [p, i, y] = await Promise.all([listFamily(), listMyInvites(), getBirthYear(user.id)]);
      setPeople(p);
      setInvites(i);
      setBirthYearState(y);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;
  if (!loaded) return <p className="text-15 text-body">Loading…</p>;
  if (loadFailed) {
    return (
      <div className="grid gap-3">
        <p role="alert" className="text-15 text-body">Couldn't load your family links. Check your connection and try again.</p>
        <button type="button" onClick={load} className="btd-btn-outline min-h-[44px] justify-self-start px-5 py-2 text-sm">
          Try again
        </button>
      </div>
    );
  }

  const children = people.filter((p) => p.role === "child");
  const grownUps = people.filter((p) => p.role === "caregiver");
  const youngAndWaiting = birthYear !== null && isUnder13(birthYear) && !grownUps.some((g) => g.consent);

  async function make(role: "caregiver" | "child", forUnder13: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await createInvite(role, forUnder13);
    setBusy(false);
    if (res.error) setError(res.error);
    await load();
  }

  async function enter() {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await acceptInvite(code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCode("");
    await load();
    refreshNotices();
    setNotice("You're linked.");
  }

  async function remove(p: FamilyPerson) {
    const what =
      p.role === "child"
        ? `You won't see ${p.name}'s calendar any more. Anything you logged there stays in it.`
        : `${p.name} won't see your calendar any more. Anything they logged stays in it.`;
    if (!window.confirm(`Unlink from ${p.name}? ${what} ${p.name} will be told.`)) return;
    const res = await unlink(p.linkId);
    if (res.error) setError(res.error);
    else setNotice(`Unlinked from ${p.name}.`);
    await load();
  }

  if (birthYear === null) {
    return (
      <div className="grid gap-3">
        <p className="text-15 text-body">Before linking accounts, one question.</p>
        <BirthYearForm onSaved={load} />
      </div>
    );
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

      <section aria-labelledby="fam-grownups" className="grid gap-3">
        <h3 id="fam-grownups" className="text-17 font-extrabold text-navy">
          My grown-ups
        </h3>
        {grownUps.length === 0 ? (
          <p className="text-15 text-body">No one is linked to your calendar.</p>
        ) : (
          <ul className="grid gap-2">
            {grownUps.map((g) => (
              <PersonRow
                key={g.linkId}
                person={g}
                detail="Can see your calendar, except things you mark “Just for me”. Can add notes of their own. Can't change or delete yours."
                onUnlink={() => remove(g)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="fam-children" className="grid gap-3">
        <h3 id="fam-children" className="text-17 font-extrabold text-navy">
          My children
        </h3>
        {children.length === 0 ? (
          <p className="text-15 text-body">You haven't linked a child's account.</p>
        ) : (
          <ul className="grid gap-2">
            {children.map((c) => (
              <PersonRow
                key={c.linkId}
                person={c}
                detail={`You can see ${c.name}'s calendar, except things they mark “Just for me”, and add your own notes to it. They can delete your notes but not change them.${
                  c.consent ? " You gave permission for them as an under-13." : ""
                }`}
                onUnlink={() => remove(c)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="fam-link" className="grid gap-4 rounded-card bg-mist p-5">
        <h3 id="fam-link" className="text-17 font-extrabold text-navy">
          Link someone
        </h3>

        {youngAndWaiting ? (
          <p className="text-15 text-navy">
            Because you're under 13, a parent needs to link first. Ask them to open Profile → Family
            on their account, tap <strong>Add my child</strong>, tick <strong>My child is under 13</strong>,
            and give you the code. Enter it below.
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => make("caregiver", under13Child)}
                className="btd-btn-sky min-h-[48px] gap-2 px-5 py-3 text-sm"
              >
                <Icon name="plus" size={18} />
                Add my child
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => make("child", false)}
                className="btd-btn-outline min-h-[48px] gap-2 px-5 py-3 text-sm"
              >
                <Icon name="plus" size={18} />
                Add a grown-up
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input type="checkbox" className="h-4 w-4" checked={under13Child} onChange={(e) => setUnder13Child(e.target.checked)} />
              My child is under 13 (I'm their parent or guardian and I give permission)
            </label>
            <p className="text-13 text-muted">
              <strong>Add my child</strong> makes a code for your child to enter on their account.{" "}
              <strong>Add a grown-up</strong> makes a code for a parent or helper, so they can see your
              calendar. A child can have up to 2 grown-ups.
            </p>
          </div>
        )}

        {invites.length > 0 && (
          <ul className="grid gap-2">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-4 rounded-card border-2 border-navy bg-white p-4">
                <span className="font-display text-28 font-extrabold tracking-[0.12em] text-navy" aria-label={`Code ${i.code.split("").join(" ")}`}>
                  {showCode(i.code)}
                </span>
                <span className="min-w-0 flex-1 text-13 text-body">
                  {i.creatorRole === "caregiver"
                    ? i.forUnder13
                      ? "For your child under 13 to enter when they sign up or in their Profile → Family."
                      : "For your child to enter in their Profile → Family."
                    : "For your grown-up to enter in their Profile → Family."}{" "}
                  Works once, until{" "}
                  {new Date(i.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(showCode(i.code))}
                    className="btd-btn-outline min-h-[40px] px-4 py-2 text-sm"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await cancelInvite(i.id);
                      load();
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enter();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="grid gap-1 text-sm font-semibold text-navy">
            Have a code? Enter it
            <input
              className="btd-input w-[12rem] uppercase tracking-[0.12em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABC-123"
              autoComplete="off"
              maxLength={8}
            />
          </label>
          <button type="submit" disabled={busy || !code.trim()} className="btd-btn-coral min-h-[48px] px-5 py-3 text-sm disabled:opacity-40">
            Link
          </button>
        </form>
      </section>
    </div>
  );
}

function PersonRow({ person, detail, onUnlink }: { person: FamilyPerson; detail: string; onUnlink: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-card border border-navy/12 bg-white p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-tint text-navy">
        <Icon name={person.role === "child" ? "person" : "heart"} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-15 font-extrabold text-navy">{person.name}</span>
        <span className="block text-13 text-body">{detail}</span>
      </span>
      <button type="button" onClick={onUnlink} className="min-h-[40px] px-3 text-sm font-semibold text-clay hover:underline">
        Unlink
      </button>
    </li>
  );
}
