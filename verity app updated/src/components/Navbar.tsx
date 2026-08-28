import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/assistant", label: "AI Assistant" },
  { to: "/appointment-prep", label: "Appointment Prep" },
  { to: "/resources", label: "Resources" },
  { to: "/provider-education", label: "Provider Education" },
  { to: "/stories", label: "Community Stories" },
];

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-ink/10 bg-paper/90 backdrop-blur sticky top-0 z-30">
      <div className="btd-container flex items-center justify-between py-3">
        <NavLink to="/" className="flex items-center gap-2 group">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-semibold text-ink">Verity</span>
        </NavLink>
        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-ink text-paper"
                      : "text-slate hover:bg-ink/5 hover:text-ink"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-slate-light max-w-[140px] truncate">
                {user.email || user.phone}
              </span>
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 rounded-sm text-sm font-medium border border-ink/15 text-slate hover:border-ink/40"
              >
                Sign out
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              className="px-3 py-1.5 rounded-sm text-sm font-semibold bg-ink text-paper hover:bg-slate transition-colors"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>
      {/* mobile nav */}
      <nav className="md:hidden btd-container flex flex-wrap gap-2 pb-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-2.5 py-1 rounded-sm text-xs font-medium border ${
                isActive ? "bg-ink text-paper border-ink" : "text-slate border-ink/15"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
