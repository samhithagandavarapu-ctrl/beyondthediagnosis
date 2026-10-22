import { Link } from "react-router-dom";
import Icon, { type IconName } from "../../components/icons/Icon";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { AdminOverview } from "../../lib/adminApi";

// The admin's front page: what needs doing, then everything else, each with
// one number and one button.

function Card({
  to,
  icon,
  title,
  status,
  urgent,
  cta,
}: {
  to: string;
  icon: IconName;
  title: string;
  status: string;
  urgent?: boolean;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className={`btd-card grid content-start gap-3 p-6 transition-colors hover:border-navy/40 ${urgent ? "border-2 border-coral" : ""}`}
    >
      <span className={`grid h-12 w-12 place-items-center rounded-full text-navy ${urgent ? "bg-coral" : "bg-sky-tint"}`}>
        <Icon name={icon} size={24} />
      </span>
      <h2 className="text-21 font-extrabold text-navy">{title}</h2>
      <p className="text-15 leading-[1.5] text-body">{status}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-15 font-bold text-link">
        {cta}
        <Icon name="chevron-right" size={16} />
      </span>
    </Link>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function AdminHome({
  overview,
  error,
  unread,
}: {
  overview: AdminOverview | null;
  error: string | null;
  unread: number;
}) {
  const { survey, banners } = useSiteSettings().settings;
  const stories = overview?.pendingStories ?? 0;
  const october = new Date().getMonth() === 9;

  return (
    <div className="btd-container max-w-5xl py-10 pb-20">
      <h1 className="font-display text-30 font-extrabold text-navy">Welcome back</h1>
      <p className="mt-2 text-17 text-body">
        {unread || stories
          ? "Here's what's waiting for you."
          : "Nothing is waiting for you right now."}
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
          Some numbers couldn't load: {error}
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          to="/admin/messages"
          icon="chat"
          title="Messages"
          status={unread ? `${plural(unread, "conversation")} with new messages.` : "No new messages."}
          urgent={unread > 0}
          cta="Open the inbox"
        />
        <Card
          to="/admin/stories"
          icon="book"
          title="Stories"
          status={stories ? `${plural(stories, "story", "stories")} waiting for review.` : "No stories waiting."}
          urgent={stories > 0}
          cta="Review stories"
        />
        <Card
          to="/admin/accounts"
          icon="person"
          title="Accounts"
          status={
            overview
              ? `${plural(overview.people, "person", "people")} on Voiced, ${overview.children} of them children. ${overview.newThisWeek} new this week.`
              : "Look someone up, or delete an account when asked."
          }
          cta="Find an account"
        />
        <Card
          to="/admin/cleanup"
          icon="trash"
          title="Yearly cleanup"
          status={
            october
              ? "It's October: time for the yearly cleanup the Privacy Policy promises."
              : "Once a year, every October. Removes accounts nobody has used in 2 years."
          }
          urgent={october}
          cta="Open cleanup"
        />
        <Card
          to="/admin/broadcasts"
          icon="send"
          title="Broadcasts"
          status="Send a message to everyone's notifications, or a pop-up for every visitor."
          cta="Send a broadcast"
        />
        <Card
          to="/admin/site"
          icon="bell"
          title="Site & banners"
          status={`Change any words on the site. ${plural(banners.filter((b) => b.on && b.text).length, "banner")} showing; survey banner ${
            survey.on ? "on" : "off"
          }.`}
          cta="Edit the site"
        />
      </div>

      <section className="btd-card mt-10 p-6">
        <h2 className="flex items-center gap-2 text-17 font-extrabold text-navy">
          <Icon name="lock" size={20} />
          Privacy requests
        </h2>
        <ul className="mt-3 grid gap-2 text-15 leading-[1.6] text-body">
          <li>
            <strong className="text-navy">"Delete my account" or "delete my child's data":</strong>{" "}
            find them in <Link to="/admin/accounts" className="font-bold text-link underline">Accounts</Link> and
            delete. Check it's really them (or their parent) first, for example by replying to the
            email they wrote from.
          </li>
          <li>
            <strong className="text-navy">"Show me what you have":</strong> health information isn't visible
            here on purpose. Ask them to sign in and go to My account → My profile → My calendar
            data, which downloads all of it.
          </li>
        </ul>
      </section>
    </div>
  );
}
