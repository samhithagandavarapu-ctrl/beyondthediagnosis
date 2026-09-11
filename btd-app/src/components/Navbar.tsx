import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CTA_LABEL } from "../data/site";

const links = [
  { to: "/tools", label: "The Tools" },
  { to: "/understanding-overshadowing", label: "The Problem" },
  { to: "/future", label: "Future Work" },
  { to: "/provider-education", label: "For Providers" },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center min-h-[40px] px-3 py-[9px] rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-navy text-mist" : "text-body hover:bg-sky/30 hover:text-navy"
  }`;

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-mist/[0.92] backdrop-blur-[10px]">
      <div className="btd-container flex items-center gap-6 py-3.5">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.svg" alt="" className="h-[34px] w-[34px]" />
          <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em]">
            Verity
          </span>
        </NavLink>
        <nav aria-label="Main" className="ml-auto flex flex-wrap items-center justify-end gap-1">
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>
          {isAdmin && (
            <NavLink to="/admin/stories" className={linkClass}>
              Admin
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink
                to="/profile"
                className="hidden sm:inline px-2 text-xs text-muted max-w-[140px] truncate hover:text-navy hover:underline"
              >
                {user.email || user.phone}
              </NavLink>
              <button
                onClick={() => signOut()}
                className="min-h-[40px] px-3 py-[9px] rounded-lg text-sm font-medium text-body hover:bg-sky/30 hover:text-navy"
              >
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className={linkClass}>
              Sign in
            </NavLink>
          )}
          <Link
            to="/assistant"
            className="btd-btn-coral ml-2 px-[18px] py-[11px] text-sm shadow-[0_1px_0_rgba(33,50,68,0.15)]"
          >
            {CTA_LABEL}
          </Link>
        </nav>
      </div>
      {/* mobile nav */}
      <nav aria-label="Sections" className="md:hidden btd-container flex flex-wrap gap-2 pb-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full text-xs font-medium border ${
                isActive ? "bg-navy text-mist border-navy" : "text-body border-navy/15"
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
