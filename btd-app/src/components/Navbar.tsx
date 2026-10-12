import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import Icon from "./icons/Icon";
import { CTA_LABEL } from "../data/site";

const links = [
  { to: "/tools", label: "The Tools" },
  { to: "/my-voice", label: "My Voice" },
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
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-mist/[0.92] backdrop-blur-[10px]">
      <div className="btd-container flex items-center gap-6 py-3.5">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.svg" alt="" className="h-[34px] w-[34px]" />
          <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em]">
            Voiced
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
          <Link
            to="/assistant"
            className="btd-btn-coral ml-2 mr-1 px-[18px] py-[11px] text-sm shadow-[0_1px_0_rgba(33,50,68,0.15)]"
          >
            {CTA_LABEL}
          </Link>
          {user ? (
            <>
              {/* A named destination, not a bare email address: "My profile" says
                  where the link goes, and the account it belongs to is a hint
                  underneath rather than the label itself. */}
              <NavLink
                to="/notifications"
                className={linkClass}
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} new`
                    : "Notifications"
                }
              >
                <span className="flex items-center gap-1.5">
                  <Icon name="bell" size={18} />
                  <span className="hidden lg:inline">Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="grid h-5 min-w-[20px] place-items-center rounded-full bg-coral-hover px-1.5 text-11 font-bold text-coral-ink"
                    >
                      {unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
              <NavLink to="/profile" className={linkClass} title={user.email || user.phone || undefined}>
                My profile
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
