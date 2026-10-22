import { useEffect, useState } from "react";
import Icon from "../../components/icons/Icon";
import { AdminPerson, adminApi, kindLabel, shortDate } from "../../lib/adminApi";

// Look someone up and, when they ask, delete their account. Only sign-in
// details show here, never anyone's health information.

export default function AdminAccounts() {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<AdminPerson[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function search(q = query) {
    setBusy(true);
    setError(null);
    const { data, error } = await adminApi<{ people: AdminPerson[]; total: number }>("search", { query: q });
    setBusy(false);
    if (error || !data) return setError(error);
    setPeople(data.people);
    setTotal(data.total);
  }

  useEffect(() => {
    search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(p: AdminPerson) {
    const who = p.name || p.login || "this account";
    const extra = p.children ? ` Children's profiles only they look after, with no login of their own, are deleted too.` : "";
    if (!window.confirm(`Delete ${who}? Their sign-in and everything saved to their account will be deleted.${extra} This can't be undone.`)) return;
    setNotice(null);
    const { error } = await adminApi("delete-user", { userId: p.id });
    if (error) return setError(error);
    setNotice(`Deleted ${who}.`);
    search();
  }

  return (
    <div className="btd-container max-w-4xl py-10 pb-20">
      <h1 className="font-display text-30 font-extrabold text-navy">Accounts</h1>
      <p className="mt-2 text-17 text-body">
        Find someone by name, email, phone or username. You only see sign-in details here, never
        anyone's health information.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
        <label className="sr-only" htmlFor="admin-search">
          Search accounts
        </label>
        <input
          id="admin-search"
          className="btd-input min-w-0 flex-1 basis-64 text-base"
          placeholder="Name, email, phone or username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btd-btn-coral min-h-[48px] gap-2 px-6 text-base disabled:opacity-50">
          <Icon name="search" size={18} />
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-5 rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-5 rounded border border-sky bg-sky-tint px-3 py-2 text-sm text-sky-ink">
          {notice}
        </p>
      )}

      {people && (
        <>
          <p className="mt-6 text-13 font-semibold text-muted">
            {query.trim() ? `${people.length} found` : `Newest first · ${total} accounts in all`}
            {people.length === 100 ? " (showing the first 100; search to narrow it down)" : ""}
          </p>
          <ul className="mt-3 grid gap-3">
            {people.map((p) => (
              <li key={p.id} className="btd-card flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-17 font-extrabold text-navy">{p.name || p.login || "No name"}</p>
                  {p.login && p.name && <p className="break-all text-15 text-body">{p.login}</p>}
                  <p className="mt-1 text-13 text-muted">
                    {kindLabel(p)} · Joined {shortDate(p.createdAt)} · Last signed in {shortDate(p.lastSignInAt)}
                    {p.children ? ` · Looks after ${p.children}` : ""}
                    {p.grownUps ? ` · ${p.grownUps} grown-up${p.grownUps === 1 ? "" : "s"} linked` : ""}
                  </p>
                </div>
                {!p.admin && (
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="btd-btn min-h-[44px] gap-2 border-2 border-clay/60 px-4 text-sm text-clay hover:bg-clay/10"
                  >
                    <Icon name="trash" size={16} />
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
