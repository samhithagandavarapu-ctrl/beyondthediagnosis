import { inkLastWord } from "../components/Scribble";

export default function Privacy() {
  return (
    <div className="btd-container py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-semibold mb-2">{inkLastWord("Privacy Policy")}</h1>
      <p className="text-slate-light text-sm mb-8">Last updated October 22, 2026</p>

      <div className="btd-card p-6 mb-8 bg-clay/10 border-clay/40 text-sm text-ink">
        <strong>Plain-language note:</strong> Voiced is an early-stage platform built by a
        student founder. This page explains what we collect and why, in plain terms. It
        is not formal legal advice, and it will be reviewed by a lawyer before Voiced
        handles data at a larger scale. Making an account means agreeing to this policy and our{" "}
        <a href="/terms" className="text-gold-dark font-semibold hover:underline">
          Terms of Use
        </a>
        .
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">What we collect</h2>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>
            <strong>Account info:</strong> your email address or phone number (used to
            sign in), and anything you choose to add to your profile — full name,
            username, what you'd like to be called, and whether you're here for yourself
            or as a parent. We also ask for a birth <em>year</em> (never a full birthday),
            only so we can follow the rules for children under 13 described below.
          </li>
          <li>
            <strong>Symptom Calendar and My Voice check-ins:</strong> what you log on
            the calendar — how you feel, what hurts and where, periods, skin, mood,
            tummy and bathroom notes, medications, and your own notes — and the
            check-ins you make in My Voice. This is health information, so we treat it
            that way: before any of it is saved to your account, we ask for your
            separate okay, and record when you gave it. If you're signed in it's saved to your account; if not, it stays
            in your own browser on this device, and signing in moves it into your
            account. Period and cycle predictions are worked out on your device and
            never stored. Nobody else on Voiced can see your calendar — not other
            users, and not Voiced's admins — except grown-ups you're linked with as
            family (see below).
          </li>
          <li>
            <strong>Me board ("All about me"):</strong> the notes you fill in about how
            you usually are, how you show pain, and how people should talk with you.
            Saved to your account if you're signed in, or in this browser if not. Only
            you and your linked grown-ups can see it.
          </li>
          <li>
            <strong>Appointment Prep entries:</strong> symptoms, medications, and notes
            you type into the Appointment Prep Tool. These are used only to generate
            your downloadable PDF — they are not sent to or stored by our AI provider
            beyond what's needed for the optional "Refine with AI" feature, and are not
            shared with any third party. If you're signed in, your Appointment Prep
            drafts (and any My Voice sentence or calendar entries you put on one) are
            saved to your account so you can pick them up on any device; only you and
            your linked grown-ups can see them. If you're not
            signed in, drafts stay in your own browser on this device and are never
            uploaded. Your appointment history (summaries you've generated) stays in
            your browser either way. You can delete any draft or summary from the
            Appointment Prep page, and deleting your account deletes your drafts.
          </li>
          <li>
            <strong>AI Assistant conversations:</strong> the AI Advocate isn't
            available on a child's username login, so nothing a child under 13 types is
            sent to an AI company. Messages you send to the AI
            Advocacy Assistant are sent to Anthropic (the company behind Claude, the AI
            model we use) to generate a response. Your chats are saved so you can come
            back to them: if you're signed in, they're saved to your account so you can
            see them on any device, and only you can see them — not your linked
            grown-ups, and not Voiced's admins. If you're not signed in,
            they stay in your own browser on this device. You can delete any chat from
            the assistant page, and deleting your account deletes your chats.
          </li>
          <li>
            <strong>Community Stories:</strong> anything you submit through "Share your
            story," and how you'd like it credited (for example your name, your first
            name, or no name at all). Submissions are
            reviewed before publishing — nothing goes live automatically. If you're
            signed in when you send one, it's linked to your account so we can let you
            know in Notifications when it's been reviewed — published, or not published
            and why.
          </li>
          <li>
            <strong>Messages:</strong> if you message the Voiced team from the Messages
            page, we store your messages, any photos or files you attach, your name, and
            your account email so we can read and reply. Attachments are kept private:
            they can only be opened through short-lived links, by you and by Voiced
            admins. Only you and Voiced admins can see your conversation. Deleting
            your account deletes your messages.
          </li>
          <li>
            <strong>Accessibility preferences:</strong> your large text / high contrast /
            Easy Read settings, saved so they follow you across devices if you're signed
            in.
          </li>
          <li>
            <strong>Talking instead of typing:</strong> the "Talk instead" microphone
            button uses your web browser's own speech-to-text. Some browsers (such as
            Chrome) send the sound to their own speech service to turn it into words.
            Voiced never receives or keeps the recording — only the words that end up in
            the box, and only if you then send or save them.
          </li>
          <li>
            <strong>"Record my voice" and Practice My Visit:</strong> a voice recording
            you make to play for your doctor is kept only in this browser on this
            device. It is never uploaded, never added to a draft, and never saved to
            your account. Your Practice My Visit progress and speak-up cards also stay
            in this browser.
          </li>
          <li>
            <strong>Notifications:</strong> notices we show you on Voiced, such as a
            reply from the team, a story review, or a family member linking or
            unlinking.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">Family accounts and children</h2>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>
            A parent (or other grown-up) can add their child to Voiced. The child's
            calendar, Me board and Appointment Prep drafts belong to the child's
            profile.
          </li>
          <li>
            <strong>Who can see a person's information:</strong> that person, and the
            grown-ups linked to them — at most two. Nobody else, and not Voiced's
            admins. Linked people only see each other's display name, not each other's
            profile.
          </li>
          <li>
            <strong>"Just for me":</strong> anyone can mark a calendar entry "Just for
            me," and their linked grown-ups won't see it. (Entries about something scary
            happening can't be hidden this way, so a trusted grown-up can help.)
          </li>
          <li>
            Linked grown-ups can add their own notes to the calendar, marked as theirs.
            The person whose calendar it is can delete those notes, but can't rewrite
            them.
          </li>
          <li>
            <strong>Children under 13:</strong> a child under 13 can only save
            information to Voiced with a parent's consent. Before a parent makes a login
            for a child 12 or under, we show them what we'll collect from the child and
            ask them to agree; we keep a record of who agreed, when, and to which version.
            The child signs in with a username and password their parent makes. We don't
            collect an email address for them, and we never email them.
          </li>
          <li>
            <strong>What we collect from a child, and why:</strong> what they add to
            their own calendar, check-ins, and Me board, only to show it back to them and
            their grown-ups and to help get ready for appointments. Children's logins
            can't use the AI features or send stories or messages. We never use a
            child's information for ads, and we don't share it with anyone except the
            providers that store and host Voiced.
          </li>
          <li>
            <strong>Parents' rights:</strong> a parent or guardian can see their
            child's information, change the child's password, or remove the child's
            profile, which deletes their information and stops any more collection. To
            see or delete anything a parent can't reach in Voiced (such as entries the
            child marked "Just for me"), or to take back consent, email us and we'll do
            it after checking you're the parent.
          </li>
          <li>
            Teens 13 and older can get their own email sign-in from an invite code
            their parent gives them. It connects to the same profile.
          </li>
          <li>
            Either side can unlink at any time, and the other person is told. If a linked
            person deletes their account, the people they were linked with are told too.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">How long we keep things</h2>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>
            <strong>Your account and everything saved to it</strong> (profile, calendar,
            check-ins, Me board, drafts, chats, messages, notifications, and your
            agreements): kept while you have an account, so you can use it. Anything you
            delete is deleted right away, and deleting your account deletes it all.
          </li>
          <li>
            <strong>Accounts nobody uses:</strong> once a year we delete accounts and
            children's profiles that nobody has signed in to for 2 years. Where we have
            an email address, we'll write first so you can keep it.
          </li>
          <li>
            <strong>Stories:</strong> published stories stay up until you ask us to take
            them down. Stories we decide not to publish are deleted at that same yearly
            review.
          </li>
          <li>
            <strong>Backups:</strong> our database provider keeps short-term backups for
            recovery. Deleted information leaves them as they expire, within a few weeks.
          </li>
          <li>
            <strong>On your device:</strong> anything kept only in your browser stays
            until you delete it there or clear your browser's data.
          </li>
          <li>
            <strong>AI messages:</strong> Anthropic doesn't use what's sent through
            Voiced to train its AI, and keeps it only for a limited time under its own
            policies.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">Keeping it safe</h2>
        <p className="text-sm text-ink leading-relaxed">
          We follow a written security program: rules in the database decide who can see
          each piece of information, only the people who need access have it, and we
          review it every year. If someone ever gets to information they shouldn't, we'll
          tell the people affected (and the parents of any children affected) as soon as
          we can and within 60 days, and tell regulators where the law requires it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">What we don't do</h2>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>We don't sell your data to anyone.</li>
          <li>We don't show ads or let advertisers access your information.</li>
          <li>
            Voiced's admins can't read your calendar, check-ins, Me board, Appointment
            Prep drafts, or AI Assistant chats. They only see what you send them: stories
            you submit and messages you send the team.
          </li>
          <li>
            We don't share your Appointment Prep entries or AI Assistant conversations
            with any third party beyond what's needed to generate a response (Anthropic,
            for the AI features specifically).
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">Who we work with</h2>
        <p className="text-sm text-ink leading-relaxed mb-3">
          Voiced is built on a small number of trusted infrastructure providers, each
          handling a specific piece:
        </p>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>
            <strong>Supabase</strong> — stores your account, profile, and the things you
            save to your account (like your calendar, Me board, and drafts) securely.
            The database itself enforces who is allowed to see each piece.
          </li>
          <li>
            <strong>Anthropic</strong> — powers the AI Advocacy Assistant and the
            "Refine with AI" feature.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the website and runs the server code
            behind the AI features.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">Your choices</h2>
        <p className="text-sm text-ink leading-relaxed">
          You can edit or delete your profile information at any time from your{" "}
          <a href="/profile" className="text-gold-dark font-semibold hover:underline">
            Profile page
          </a>
          . You can delete any calendar entry, check-in, draft, or chat yourself, and
          you can unlink from a family member at any time. You can also delete your
          account yourself from the Account section of your Profile page, which removes
          your sign-in and everything saved to your account. If you're a parent, it also
          removes any child's profile you added that has no sign-in of its own and no
          other grown-up linked. A child who signs in with a username can't
          delete their own account. Their grown-up can do that for them. For anything else —
          like taking down a story you sent in — reach out using the contact info below
          and we'll take care of it. You can also take back your okay to keep health
          information in your account at any time: email us, and we'll delete it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-display font-semibold mb-2">Contact</h2>
        <p className="text-sm text-ink leading-relaxed">
          Questions about this policy or your data? Reach out at{" "}
          <a href="mailto:withvoiced@gmail.com" className="text-gold-dark font-semibold hover:underline">
            withvoiced@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
