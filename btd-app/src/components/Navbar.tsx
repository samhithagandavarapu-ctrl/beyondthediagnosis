import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import Icon, { type IconName } from "./icons/Icon";
import { CTA_LABEL } from "../data/site";
import { possessive, useAccountMode } from "../context/AccountModeContext";
import { openCalmingScreen } from "./CalmingScreen";
import { ModeBadge } from "./ModeBanner";
import { usernameOf } from "../lib/family";
import { isChildLogin } from "../lib/consent";
import DisplayMenu from "./DisplayMenu";
import { Chevron, menuRowClass, panelClass, useDropdown } from "./NavDropdown";

type PageLink = { to: string; label: string };

const links: PageLink[] = [
  { to: "/stories", label: "Stories" },
  { to: "/provider-education", label: "For Providers" },
];

// "About" holds both pages about why Voiced exists.
const about: PageLink[] = [
  { to: "/understanding-overshadowing", label: "The problem" },
  { to: "/mission", label: "Our mission" },
];

// Every tool by name, in the Tools menu. My Voice first: it's the one people
// use themselves.
const tools: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/my-voice", label: "My Voice", icon: "hub-feelings", end: true },
  { to: "/my-voice/practice", label: "Practice My Visit", icon: "hub-visit" },
  { to: "/appointment-prep", label: "Appointment Prep", icon: "clipboard" },
  { to: "/calendar", label: "My Calendar", icon: "calendar" },
  { to: "/assistant", label: "AI Advocate", icon: "chat" },
  { to: "/resources", label: "Resources", icon: "file" },
];

type ToolLink = { to: string; label: string; icon: IconName; end?: boolean };
type Nav = { tools: ToolLink[]; links: PageLink[]; about: PageLink[]; self: boolean; showCta: boolean };

function useNavFor(): Nav {
  const nav = useToolsFor();
  const { user, isAdmin } = useAuth();
  // A child's username login doesn't get the AI, or messages to the team: their
  // words stay in their own profile.
  const tools = isChildLogin(user) ? nav.tools.filter((t) => t.to !== "/assistant") : nav.tools;
  // Everyone signed in can reach the Voiced team from the Tools menu, not only
  // from the account menu. Admins answer from the inbox instead.
  if (user && !isAdmin && !isChildLogin(user)) {
    return { ...nav, tools: [...tools, { to: "/messages", label: "Message the Voiced team", icon: "talk" }] };
  }
  return { ...nav, tools };
}

/** The tools for whoever is here: a parent's tools for the person they
 *  manage, or a self-advocate's own, bigger and with nothing meant only for
 *  parents. Everyone else gets every tool. */
function useToolsFor(): Nav {
  const { view, mode, forName } = useAccountMode();
  if (view === "self") {
    return {
      self: true,
      showCta: false,
      links: links.filter((l) => l.to === "/stories"),
      about: about.filter((l) => l.to === "/mission"),
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
      about,
      tools: [
        { to: "/appointment-prep", label: "Appointment Prep", icon: "clipboard" },
        { to: "/calendar", label: `${whose}Calendar`, icon: "calendar" },
        { to: "/me", label: `${whose}Me board`, icon: "person" },
        { to: "/resources", label: "Resources", icon: "file" },
        { to: "/assistant", label: "AI Advocate", icon: "chat" },
      ],
    };
  }
  return { self: false, showCta: true, links, about, tools };
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-1.5 min-h-[44px] whitespace-nowrap px-3 rounded-lg text-sm font-medium transition-colors ${
    isActive ? "bg-navy text-mist btd-accent" : "text-body hover:bg-sky/30 hover:text-navy"
  }`;

const iconLinkClass = ({ isActive }: { isActive: boolean }) =>
  `grid h-11 w-11 place-items-center rounded-lg transition-colors ${
    isActive ? "bg-navy text-mist btd-accent" : "text-body hover:bg-sky/30 hover:text-navy"
  }`;

const rowClass = ({ isActive }: { isActive: boolean }) =>
  `${menuRowClass} ${isActive ? "bg-sky/30 font-bold text-navy" : ""}`;

const menuItemClass =
  "block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-body hover:bg-sky/30 hover:text-navy";

const groupLabelClass = "px-3 pb-1 pt-2 text-11 font-bold uppercase tracking-[0.1em] text-muted";

function ToolRows({ tools, self }: { tools: ToolLink[]; self: boolean }) {
  return (
    <>
      {tools.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={rowClass}>
          <Icon name={t.icon} size={self ? 22 : 20} className="shrink-0" />
          {t.label}
        </NavLink>
      ))}
      {self && (
        <button type="button" onClick={openCalmingScreen} className={menuRowClass}>
          <Icon name="breath" size={22} className="shrink-0" />
          Calm
        </button>
      )}
      <NavLink to="/tools" end className={(a) => `${rowClass(a)} text-link`}>
        See all tools →
      </NavLink>
    </>
  );
}

/** A word in the top bar that opens a short list of links under it. */
function NavMenu({ label, paths, wide, children }: { label: string; paths: string[]; wide?: boolean; children: ReactNode }) {
  const { open, ref, buttonProps } = useDropdown();
  const { pathname } = useLocation();
  const here = paths.includes(pathname);
  return (
    <div ref={ref} className="relative">
      <button {...buttonProps} className={linkClass({ isActive: open || here })}>
        {label}
        <Chevron open={open} />
      </button>
      {open && <div className={`absolute left-0 top-full ${wide ? "w-72" : "w-56"} ${panelClass}`}>{children}</div>}
    </div>
  );
}

/** Below desktop width: everything in the bar, in one list. */
function MobileMenu({ nav, signedIn }: { nav: Nav; signedIn: boolean }) {
  const { open, ref, buttonProps } = useDropdown();
  return (
    // Not positioned itself: the panel hangs from the header, full width.
    <div ref={ref} className="xl:hidden">
      <button
        {...buttonProps}
        aria-label="Menu"
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors ${
          open ? "bg-navy text-mist btd-accent" : "text-navy hover:bg-sky/30"
        }`}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
          {open ? (
            <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M3 5.5 H17 M3 10 H17 M3 14.5 H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        <span className="hidden min-[360px]:inline">Menu</span>
      </button>
      {open && (
        <div className={`absolute inset-x-4 top-full max-h-[calc(100vh-6rem)] overflow-y-auto ${panelClass}`}>
          {nav.showCta && (
            <Link to="/assistant" className="btd-btn-coral mx-1.5 mb-2 mt-1 flex min-h-[52px] px-5 text-base md:hidden">
              {CTA_LABEL}
            </Link>
          )}
          <p className={groupLabelClass}>Tools</p>
          <ToolRows tools={nav.tools} self={nav.self} />
          <div className="my-1.5 border-t border-navy/10" />
          {nav.links.map((l) => (
            <NavLink key={l.to} to={l.to} className={rowClass}>
              {l.label}
            </NavLink>
          ))}
          <p className={groupLabelClass}>About</p>
          {nav.about.map((l) => (
            <NavLink key={l.to} to={l.to} className={rowClass}>
              {l.label}
            </NavLink>
          ))}
          {!signedIn && (
            <>
              <div className="my-1.5 border-t border-navy/10" />
              <NavLink to="/login" className={rowClass}>
                Sign in
              </NavLink>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
  const { open, ref, buttonProps } = useDropdown();
  const child = isChildLogin(useAuth().user);

  return (
    <div ref={ref} className="relative">
      <button
        {...buttonProps}
        aria-label="My account"
        className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-medium transition-colors sm:px-3 ${
          open ? "bg-navy text-mist btd-accent" : "text-body hover:bg-sky/30 hover:text-navy"
        }`}
      >
        <Icon name="person" size={18} className="sm:hidden" />
        <span className="hidden sm:inline">My account</span>
        {/* The badge is in the menu, and the banner under the bar says the
            same; in the bar it pushed the page wider than a laptop screen. */}
        <Chevron open={open} />
      </button>
      {open && (
        <div className={`absolute right-0 top-full w-60 ${panelClass}`}>
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
  const nav = useNavFor();
  const { tools, links, about, self, showCta } = nav;

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-mist/[0.92] backdrop-blur-[10px]">
      <div className="btd-container flex items-center gap-2 py-3 sm:gap-4">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src="/logo.svg" alt="" className="h-[34px] w-[34px]" />
          <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em]">
            Voiced
          </span>
        </NavLink>
        {/* Desktop: the sections, in one line. Smaller screens get them in
            the Menu at the end of the bar. */}
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 xl:flex">
          <NavMenu label="Tools" paths={[...tools.map((t) => t.to), "/tools"]} wide={self}>
            <ToolRows tools={tools} self={self} />
          </NavMenu>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          {about.length === 1 ? (
            <NavLink to={about[0].to} className={linkClass}>
              About
            </NavLink>
          ) : (
            <NavMenu label="About" paths={about.map((l) => l.to)}>
              {about.map((l) => (
                <NavLink key={l.to} to={l.to} className={rowClass}>
                  {l.label}
                </NavLink>
              ))}
            </NavMenu>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <DisplayMenu />
          {showCta && (
            <Link
              to="/assistant"
              className="btd-btn-coral hidden whitespace-nowrap px-5 text-sm md:inline-flex"
            >
              {CTA_LABEL}
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
                    className="btd-accent absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-navy px-1 text-[0.625rem] font-bold leading-none text-mist"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>
              <AccountMenu isAdmin={isAdmin} account={usernameOf(user.email) || user.email || user.phone || ""} onSignOut={signOut} />
            </>
          ) : (
            <NavLink to="/login" className={(a) => `hidden xl:inline-flex ${linkClass(a)}`}>
              Sign in
            </NavLink>
          )}
          <MobileMenu nav={nav} signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
