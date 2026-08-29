import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchProfile, upsertProfile } from "../lib/profile";
import { Link } from "react-router-dom";

export default function Profile() {
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    fetchProfile(user.id).then((profile) => {
      if (profile) {
        setFullName(profile.full_name ?? "");
        setUsername(profile.username ?? "");
        setPhone(profile.phone ?? "");
      }
      setFetching(false);
    });
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error } = await upsertProfile(user.id, {
      full_name: fullName,
      username,
      phone,
    });
    setSaving(false);
    if (error) setError(error);
    else setSaved(true);
  }

  if (loading || fetching) return null;

  if (!user) {
    return (
      <div className="btd-container py-14 max-w-md">
        <h1 className="text-2xl font-display font-semibold mb-2">Profile</h1>
        <p className="text-slate mb-4">Sign in to view and edit your profile.</p>
        <Link to="/login" className="text-gold-dark font-semibold hover:underline">
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="btd-container py-10 max-w-md">
      <h1 className="text-3xl font-display font-semibold mb-2">Your profile</h1>
      <p className="text-slate mb-8">
        Your accessibility settings (large text, high contrast, easy read) are saved
        here too, and will follow you to any device you sign in on.
      </p>

      <form onSubmit={handleSave} className="btd-card p-6 space-y-4">
        {error && (
          <p className="text-sm text-clay bg-clay/10 border border-clay/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-sage-dark bg-sage/10 border border-sage/30 rounded px-3 py-2">
            Saved.
          </p>
        )}

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">Email</label>
          <input className="btd-input opacity-60" value={user.email || user.phone || ""} disabled />
          <p className="text-xs text-slate-light mt-1">
            This is how you sign in — it can't be changed here.
          </p>
        </div>

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">Full name</label>
          <input className="btd-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">Username</label>
          <input className="btd-input" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div>
          <label className="block font-semibold text-sm text-ink mb-1">Phone number</label>
          <input
            type="tel"
            className="btd-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 555 5555"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded bg-ink text-paper font-semibold text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
