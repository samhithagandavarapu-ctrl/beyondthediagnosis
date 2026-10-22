import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import Icon, { type IconName } from "./icons/Icon";
import SiteSearch from "./SiteSearch";
import { CTA_LABEL } from "../data/site";
import { possessive, useAccountMode } from "../context/AccountModeContext";
import { openCalmingScreen } from "./CalmingScreen";
import { ModeBadge } from "./ModeBanner";
import { usernameOf } from "../lib/family";
import { isChildLogin } from "../lib/consent";

const links = [
  { to: "/understanding-overshadowing", label: "The Problem" },
  { to: "/stories", label: "Community Stories" },
  { to: "/provider-education", label: "For Providers" },
  { to: "/mission", label: "Mission" },
];

// Every tool by name, in its own row under the bar, so nobody has to go
// looking for them. My Voice first: it's the one people use themselves.
const tools: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/my-voice", label: "My Voice", icon: "hub-feelings", end: true },
  { to: "/my-voice/practice", label: "Practice My Visit", icon: "hub-visit" },
  { to: "/appointment-prep", label: "Appointment Prep", icon: "clipboard" },
  { to: "/calendar", label: "My Calendar", icon: "calendar" },
  { to: "/assistant", label: "AI Advocate", icon: "chat" },
  { to: "/resources", label: "Resources", icon: "file" },
];

type ToolLink = { to: string; label: string; icon: IconName; end?: boolean };

function useNavFor(): { tools: ToolLink[]; links: typeof links; self: boolean; showCta: boolean } {
  const nav = useToolsFor();
  const { user, isAdmin } = useAuth();
  // A child's username login doesn't get the AI, or messages to the team: their
  // words stay in their own profile.
  const tools = isChildLogin(user) ? nav.tools.filter((t) => t.to !== "/assistant") : nav.tools;
  // Everyone signed in can reach the Voiced team from the tools row, not only
  // from the account menu. Admins answer from the inbox instead.
  if (user && !isAdmin && !isChildLogin(user)) {
    return { ...nav, tools: [...tools, { to: "/messages", label: "Message the Voiced team", icon: "talk" }] };
  }
  return { ...nav, tools };
}

/** The tools for whoever is here: a parent's tools for the person they
 *  manage, or a self-advocate's own, bigger and with nothing meant only for
 *  parents. Everyone else gets every tool. */
function useToolsFor(): { tools: ToolLink[]; links: typeof links; self: boolean; showCta: boolean } {
  const { view, mode, forName } = useAccountMode();
  if (view === "self") {
    return {
      self: true,
      showCta: false,
      links: links.filter((l) => l.to === "/stories" || l.to === "/mission"),
      tools: [
        { to: "/my-voice", label: "My Voice", icon: "hub-feelings", end: true },
        { to: "/calendar", label: "My Calendar", icon: "calendar" },
        { to: "/me", label: "Me", icon: "star" },
        { to: "/my-voice/practice", label: "Get ready for the doctor", icon: "hub-visit" },
        { to: "/assistant", label: "AI Advocate", icon: "chat" },
      ],
    };
  }
  if (mode === "parent") {
    const whose = forName ? `${possessive(forName)} ` : "";
    return {
      self: false,
      showCta: true,
      links,
      tools: [
        { to: "/appointment-prep", label: "Appointment Prep", icon: "clipboard" },
        { to: "/calendar", label: `${whose}Calendar`, icon: "calendar" },
        { to: "/me", label: `${whose}Me board`, icon: "person" },
        { to: "/resources", label: "Resources", icon: "file" },
        { to: "/assistant", label: "AI Advocate", icon: "chat" },
      ],
    };
  }
  return { self: false, showCta: true, links, tools };
}

const toolLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border min-h-[40px] px-4 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? "bg-navy text-mist border-navy"
      : "bg-white text-navy border-navy/15 hover:border-sky hover:bg-sky/30"
  }`;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center min-h-[40px] px-3 py-[9px] rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-navy text-mist" : "text-body hover:bg-sky/30 hover:text-navy"
  }`;

const iconLinkClass = ({ isActive }: { isActive: boolean }) =>
  `grid h-10 w-10 place-items-center rounded-lg transition-colors ${
    isActive ? "bg-navy text-mist" : "text-body hover:bg-sky/30 hover:text-navy"
  }`;

const menuItemClass =
  "block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-body hover:bg-sky/30 hover:text-navy";

/** Everything about your own account, in one place: keeps the top bar to a
 *  single tidy line however many account pages there are. */
function AccountMenu({
  isAdmin,
  account,
  onSignOut,
}: {
  isAdmin: boolean;
  account: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const child = isChildLogin(useAuth().user);
  const { pathname } = useLocation();

  // Close on navigation, on a click anywhere else, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="My account"
        className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[9px] text-sm font-medium transition-colors sm:px-3 ${
          open ? "bg-navy text-mist" : "text-body hover:bg-sky/30 hover:text-navy"
        }`}
      >
        <Icon name="person" size={18} className="sm:hidden" />
        <span className="hidden sm:inline">My account</span>
        <span className="hidden sm:inline-flex">
          <ModeBadge />
        </span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className={open ? "rotate-180" : ""}>
          <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-tile border border-navy/12 bg-white p-1.5 shadow-[0_12px_32px_rgba(33,50,68,0.14)]">
          {account && (
            <p className="truncate px-3 pb-1.5 pt-1 text-12 text-muted" title={account}>
              {account}
            </p>
          )}
          <div className="px-3 pb-1.5">
            <ModeBadge />
          </div>
          <Link to="/profile" className={menuItemClass}>
            My profile
          </Link>
          <Link to="/me" className={menuItemClass}>
            My Me page
          </Link>
          {/* Admins answer from the inbox instead. */}
          {!isAdmin && !child && (
            <Link to="/messages" className={menuItemClass}>
              Messages
            </Link>
          )}
          {isAdmin && (
            <>
              <div className="my-1 border-t border-navy/10" />
              <p className="px-3 pb-0.5 pt-1 text-11 font-bold uppercase tracking-[0.1em] text-muted">Admin</p>
              <Link to="/admin/stories" className={menuItemClass}>
                Story review
              </Link>
              <Link to="/admin/messages" className={menuItemClass}>
                Message inbox
              </Link>
            </>
          )}
          <div className="my-1 border-t border-navy/10" />
          <button type="button" onClick={() => onSignOut()} className={menuItemClass}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { tools, links, self, showCta } = useNavFor();

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-mist/[0.92] backdrop-blur-[10px]">
      <div className="btd-container flex items-center gap-3 py-3.5 sm:gap-6">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.svg" alt="" className="h-[34px] w-[34px]" />
          <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em]">
            Voiced
          </span>
        </NavLink>
        <nav aria-label="Main" className="ml-auto flex items-center justify-end gap-1">
          {/* Inline only where they fit on one line; below that they sit in
              the row of pills under the bar. */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={(a) => `whitespace-nowrap ${linkClass(a)}`}>
                {l.label}
              </NavLink>
            ))}
            <SiteSearch className="ml-2 w-44 xl:w-56" />
          </div>
          {showCta && (
          <Link
            to="/assistant"
            className="btd-btn ml-0 mr-0.5 whitespace-nowrap border-2 border-coral bg-white px-3 py-[7px] text-13 hover:bg-coral sm:ml-2 sm:mr-1 sm:px-4 sm:py-[9px] sm:text-sm"
          >
            <span className="sm:hidden">AI advocate</span>
            <span className="hidden sm:inline">{CTA_LABEL}</span>
          </Link>
          )}
          {user ? (
            <>
              {/* Icon only, so the bar stays on one line; the label is
                  still read out, with the count. */}
              <NavLink
                to="/notifications"
                className={({ isActive }) => `relative ${iconLinkClass({ isActive })}`}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : "Notifications"}
                title="Notifications"
              >
                <Icon name="bell" size={20} />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-coral-hover px-1 text-[0.625rem] font-bold leading-none text-coral-ink"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>
              <AccountMenu isAdmin={isAdmin} account={usernameOf(user.email) || user.email || user.phone || ""} onSignOut={signOut} />
            </>
          ) : (
            <NavLink to="/login" className={linkClass}>
              Sign in
            </NavLink>
          )}
        </nav>
      </div>
      <div className="border-t border-navy/[0.08]">
        <nav
          aria-label="Tools"
          className="btd-container flex items-center gap-2 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <NavLink
            to="/tools"
            end
            className={({ isActive }) =>
              `mr-1 shrink-0 text-12 font-bold uppercase tracking-[0.1em] hover:underline ${
                isActive ? "text-navy" : "text-link"
              }`
            }
          >
            Tools
          </NavLink>
          {tools.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={(a) => `${toolLinkClass(a)} ${self ? "min-h-[48px] text-15" : ""}`}
            >
              <Icon name={t.icon} size={self ? 22 : 18} />
              {t.label}
            </NavLink>
          ))}
          {self && (
            <button type="button" onClick={openCalmingScreen} className={`${toolLinkClass({ isActive: false })} min-h-[48px] text-15`}>
              <Icon name="breath" size={22} />
              Calm
            </button>
          )}
        </nav>
      </div>
      {/* mobile nav */}
      <div className="lg:hidden btd-container pt-2.5 pb-2.5">
        <SiteSearch />
      </div>
      <nav aria-label="Sections" className="lg:hidden btd-container flex flex-wrap gap-2 pb-3">
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
