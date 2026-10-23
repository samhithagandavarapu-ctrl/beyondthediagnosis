import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import Icon, { type IconName } from "../../components/icons/Icon";
import { AdminOverview, adminApi } from "../../lib/adminApi";
import AdminMessages from "../AdminMessages";
import AdminStories from "../AdminStories";
import AdminHome from "./AdminHome";
import AdminAccounts from "./AdminAccounts";
import AdminCleanup from "./AdminCleanup";
import AdminSite from "./AdminSite";
import AdminBroadcasts from "./AdminBroadcasts";
import AdminFeedback from "./AdminFeedback";

// What an admin sees instead of the site: one plain menu, no setup questions,
// no parent or self-advocate banners. "View site" switches to the public site
// (with a bar to come back), for checking how things look.

const tabs: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/admin", label: "Home", icon: "star", end: true },
  { to: "/admin/messages", label: "Messages", icon: "chat" },
  { to: "/admin/stories", label: "Stories", icon: "book" },
  { to: "/admin/feedback", label: "Feedback", icon: "clipboard" },
  { to: "/admin/accounts", label: "Accounts", icon: "person" },
  { to: "/admin/cleanup", label: "Yearly cleanup", icon: "trash" },
  { to: "/admin/broadcasts", label: "Broadcasts", icon: "send" },
  { to: "/admin/site", label: "Site & banners", icon: "bell" },
];

export default function AdminShell({ onViewSite, onEditSite }: { onViewSite: () => void; onEditSite: () => void }) {
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { pathname } = useLocation();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Fresh counts each time a page opens, so the badges keep up.
  useEffect(() => {
    adminApi<AdminOverview>("overview").then(({ data, error }) => {
      setOverview(data);
      setOverviewError(error);
    });
  }, [pathname]);

  const badge = (to: string) =>
    to === "/admin/messages" ? unreadCount : to === "/admin/stories" ? overview?.pendingStories ?? 0 : 0;

  return (
    <div className="min-h-screen bg-mist">
      <header className="btd-dark sticky top-0 z-40">
        <div className="btd-container flex flex-wrap items-center gap-3 py-3">
          <NavLink to="/admin" className="mr-auto flex items-center gap-2.5">
            <img src="/logo.svg" alt="" className="h-[30px] w-[30px]" />
            <span className="font-display text-[1.25rem] font-extrabold text-mist">Voiced</span>
            <span className="rounded-full bg-butter px-2.5 py-0.5 text-11 font-bold uppercase tracking-[0.08em] text-navy">
              Admin
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onEditSite}
            className="btd-btn min-h-[40px] gap-2 bg-butter px-4 text-sm text-navy hover:bg-butter/90"
          >
            <Icon name="refine" size={18} />
            <span className="hidden sm:inline">Edit site</span>
            <span className="sm:hidden">Edit</span>
          </button>
          <button
            type="button"
            onClick={onViewSite}
            className="btd-btn min-h-[40px] gap-2 border-2 border-mist/50 px-4 text-sm text-mist hover:bg-mist hover:text-navy"
          >
            <Icon name="eye" size={18} />
            <span className="hidden sm:inline">View site</span>
            <span className="sm:hidden">Site</span>
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="btd-btn min-h-[40px] gap-2 px-3 text-sm text-mist/80 hover:text-mist"
          >
            <Icon name="sign-out" size={18} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
        <nav
          aria-label="Admin"
          className="btd-container flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((t) => {
            const n = badge(t.to);
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${
                    isActive ? "bg-mist text-navy" : "text-mist/85 hover:bg-mist/10"
                  }`
                }
              >
                <Icon name={t.icon} size={18} />
                {t.label}
                {n > 0 && (
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-coral px-1.5 text-11 font-bold text-navy">
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/admin" element={<AdminHome overview={overview} error={overviewError} unread={unreadCount} />} />
          <Route path="/admin/messages" element={<AdminMessages />} />
          <Route path="/admin/stories" element={<AdminStories />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/accounts" element={<AdminAccounts />} />
          <Route path="/admin/cleanup" element={<AdminCleanup />} />
          <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
          <Route path="/admin/site" element={<AdminSite onEditSite={onEditSite} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}
