import { useState } from "react";
import { acceptInvite, isUnder13, setBirthYear } from "../../lib/family";

// "What year were you born?" — asked once. Under 13, a parent's under-13 code
// is needed before anything can save to the account (the parent's
// permission); the code can go in right here.

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 101 }, (_, i) => thisYear - 3 - i);

export default function BirthYearForm({ onSaved }: { onSaved: () => void }) {
  const [year, setYear] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const young = year !== "" && isUnder13(Number(year));

  async function save() {
    if (!year) return;
    setBusy(true);
    setError(null);
    const saved = await setBirthYear(Number(year));
    if (saved.error) {
      setBusy(false);
      setError(saved.error);
      return;
    }
    if (young && code.trim()) {
      const linked = await acceptInvite(code);
      if (linked.error) setError(`Saved your birth year. ${linked.error}`);
    }
    setBusy(false);
    onSaved();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-3"
    >
      <label className="grid gap-1 text-15 font-bold text-navy">
        What year were you born?
        <select className="btd-input max-w-[12rem]" value={year} onChange={(e) => setYear(e.target.value)} required>
          <option value="">Choose a year</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <p className="text-13 text-muted">
        We ask once, and it can't be changed later. Under 13, a parent links your account and gives
        permission before anything is saved to it.
      </p>
      {young && (
        <label className="grid gap-1 text-15 font-bold text-navy">
          Your parent's code
          <input
            className="btd-input max-w-[12rem] uppercase tracking-[0.12em]"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABC-123"
            autoComplete="off"
            maxLength={8}
          />
          <span className="text-13 font-normal text-body">
            Ask your parent to open Profile → Family on their account, tap “Add my child”, and tick
            “My child is under 13”. You can add it later too.
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-coral-ink">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !year} className="btd-btn-coral min-h-[48px] justify-self-start px-6 py-3 text-sm disabled:opacity-40">
        Save
      </button>
    </form>
  );
}
