export default function Privacy() {
  return (
    <div className="btd-container py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-semibold mb-2">Privacy Policy</h1>
      <p className="text-slate-light text-sm mb-8">Last updated {new Date().toLocaleDateString()}</p>

      <div className="btd-card p-6 mb-8 bg-clay/10 border-clay/40 text-sm text-ink">
        <strong>Plain-language note:</strong> Verity is an early-stage platform built by a
        student founder. This page explains what we collect and why, in plain terms. It
        is not formal legal advice, and it will be reviewed by a lawyer before Verity
        handles data at a larger scale.
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">What we collect</h2>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>
            <strong>Account info:</strong> your email address or phone number (used to
            sign in), and anything you choose to add to your profile — full name,
            username.
          </li>
          <li>
            <strong>Appointment Prep entries:</strong> symptoms, medications, and notes
            you type into the Appointment Prep Tool. These are used only to generate
            your downloadable PDF — they are not sent to or stored by our AI provider
            beyond what's needed for the optional "Refine with AI" feature, and are not
            shared with any third party.
          </li>
          <li>
            <strong>AI Assistant conversations:</strong> messages you send to the AI
            Advocacy Assistant are sent to Anthropic (the company behind Claude, the AI
            model we use) to generate a response. We don't store your conversation
            history on our own servers beyond your active session.
          </li>
          <li>
            <strong>Community Stories:</strong> anything you submit through "Share your
            story," including your name if you choose to include it. Submissions are
            reviewed before publishing — nothing goes live automatically.
          </li>
          <li>
            <strong>Accessibility preferences:</strong> your large text / high contrast /
            Easy Read settings, saved so they follow you across devices if you're signed
            in.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-display font-semibold mb-2">What we don't do</h2>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>We don't sell your data to anyone.</li>
          <li>We don't show ads or let advertisers access your information.</li>
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
          Verity is built on a small number of trusted infrastructure providers, each
          handling a specific piece:
        </p>
        <ul className="space-y-2 text-sm text-ink list-disc list-inside">
          <li>
            <strong>Supabase</strong> — stores your account and profile information
            securely.
          </li>
          <li>
            <strong>Anthropic</strong> — powers the AI Advocacy Assistant and the
            "Refine with AI" feature.
          </li>
          <li>
            <strong>Vercel and Render</strong> — host the website and its backend
            server.
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
          . If you'd like your account or submitted data fully deleted, reach out using
          the contact info below and we'll take care of it.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-display font-semibold mb-2">Contact</h2>
        <p className="text-sm text-ink leading-relaxed">
          Questions about this policy or your data? Reach out at{" "}
          <a href="mailto:info.verityhealth@gmail.com" className="text-gold-dark font-semibold hover:underline">
            info.verityhealth@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
