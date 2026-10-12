import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import { authEnabled } from "../lib/supabaseClient";
import Icon from "../components/icons/Icon";
import PageHero from "../components/PageHero";
import PageLoading from "../components/PageLoading";

function longDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function Notifications() {
  const { user, loading } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  if (loading) return <PageLoading label="Loading your notifications…" />;

  if (!user) {
    return (
      <div>
        <PageHero
          eyebrow="Notifications"
          title="Sign in to see your notifications"
          lede="When a story you sent in is published, you'll hear about it here."
        />
        <div className="btd-container py-14">
          <Link to="/login" className="btd-btn-coral px-[18px] py-[11px] text-sm">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        tone="navy"
        eyebrow="Notifications"
        title={
          unreadCount === 0
            ? "You're all caught up"
            : unreadCount === 1
            ? "You have 1 new notification"
            : `You have ${unreadCount} new notifications`
        }
        lede="News about things you've done on Voiced — like a story you sent in being reviewed, or a new message."
      />

      <div className="btd-container max-w-3xl pt-12 pb-20">
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={markAllRead}
              className="text-13 font-semibold text-link hover:underline"
            >
              Mark all as read
            </button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="btd-card p-7 text-center">
            <div className="flex justify-center text-muted">
              <Icon name="bell" size={40} />
            </div>
            <p className="mt-3 text-17 font-bold text-navy">Nothing here yet</p>
            <p className="mt-1.5 text-15 leading-[1.6] text-body">
              {authEnabled ? (
                <>
                  When a story you{" "}
                  <Link to="/profile" className="font-semibold text-link hover:underline">
                    send in from your profile
                  </Link>{" "}
                  has been reviewed, or the Voiced team{" "}
                  <Link to="/messages" className="font-semibold text-link hover:underline">
                    replies to a message
                  </Link>
                  , it shows up here.
                </>
              ) : (
                "Notifications need the Supabase project connected — see the README."
              )}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`btd-card flex items-start gap-4 p-5 ${
                  n.read ? "" : "border-2 border-sky bg-sky-tint"
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                    n.read ? "bg-navy/7 text-muted" : "bg-sky text-navy"
                  }`}
                >
                  <Icon
                    name={n.kind === "message" ? "chat" : n.kind === "story-rejected" ? "talk" : "celebrate"}
                    size={22}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-navy">
                    {!n.read && <span className="sr-only">New: </span>}
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-15 leading-[1.6] text-body">{n.body}</p>
                  <p className="mt-1 text-12 text-muted">
                    {n.kind === "message" ? "Sent" : "Story sent in"} {longDate(n.at)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <Link
                      to={n.href}
                      onClick={() => markRead(n.id)}
                      className="btd-btn-sky px-[16px] py-[9px] text-sm"
                    >
                      {n.action}
                    </Link>
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-13 font-semibold text-link hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <span
                    aria-hidden="true"
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-coral-hover"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
