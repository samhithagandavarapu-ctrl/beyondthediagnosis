import { Link } from "react-router-dom";
import { inkLastWord } from "../components/Scribble";

const h2 = "text-xl font-display font-semibold mb-2";
const list = "space-y-2 text-sm text-ink list-disc list-inside";
const para = "text-sm text-ink leading-relaxed";
const link = "text-gold-dark font-semibold hover:underline";

export default function Terms() {
  return (
    <div className="btd-container py-10 max-w-2xl">
      <h1 className="text-3xl font-display font-semibold mb-2">{inkLastWord("Terms of Use")}</h1>
      <p className="text-slate-light text-sm mb-8">Last updated October 22, 2026</p>

      <div className="btd-card p-6 mb-8 bg-clay/10 border-clay/40 text-sm text-ink">
        <strong>Plain-language note:</strong> These are the rules for using Voiced, written to be
        easy to read. By making an account, you agree to them and to our{" "}
        <Link to="/privacy" className={link}>
          Privacy Policy
        </Link>
        . They will be reviewed by a lawyer as Voiced grows, and we'll ask you to agree again if
        they change in a way that matters.
      </div>

      <section className="mb-8">
        <h2 className={h2}>Voiced is not medical care</h2>
        <ul className={list}>
          <li>
            Voiced helps people get ready for appointments and speak up for themselves. It does not
            diagnose, treat, or give medical advice, and it doesn't replace a doctor, nurse, or
            therapist.
          </li>
          <li>
            <strong>In an emergency, call 911</strong> (or your local emergency number). Don't wait
            for anything on Voiced.
          </li>
          <li>
            The AI Advocate is an AI, not a person. It can be wrong. Check anything important with a
            health care provider.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className={h2}>Who can have an account</h2>
        <ul className={list}>
          <li>You must be 13 or older to make your own account.</li>
          <li>
            Children under 13 can only use Voiced through a profile their parent or guardian makes.
            The parent agrees to these terms for them, and decides whether they get their own login.
          </li>
          <li>
            If you add someone else's profile, such as your child's, you must be their parent,
            guardian, or someone they (or their guardian) have asked to help.
          </li>
          <li>Keep your password private. You're responsible for what happens on your account.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className={h2}>Using Voiced kindly and safely</h2>
        <ul className={list}>
          <li>Don't use Voiced to harm, harass, or mislead anyone.</li>
          <li>Don't post anyone else's private information without their permission.</li>
          <li>Don't try to get into accounts or data that aren't yours, or break the site.</li>
          <li>We can pause or close an account that breaks these rules.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className={h2}>What you share</h2>
        <ul className={list}>
          <li>What you put in Voiced is yours. We only use it to run Voiced for you.</li>
          <li>
            If you send us a story to publish, you let us show it on Voiced (credited the way you
            choose) until you ask us to take it down.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className={h2}>No promises</h2>
        <p className={para}>
          Voiced is offered as it is, by a small, early-stage team. We work hard to keep it
          accurate, private, and running, but we can't promise it will always be available or free
          of mistakes. As far as the law allows, Voiced isn't responsible for decisions made based
          on what the site or the AI Advocate says.
        </p>
      </section>

      <section className="mb-8">
        <h2 className={h2}>Leaving</h2>
        <p className={para}>
          You can stop using Voiced and delete your account at any time from your{" "}
          <Link to="/profile" className={link}>
            Profile page
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className={h2}>Contact</h2>
        <p className={para}>
          Questions? Email{" "}
          <a href="mailto:withvoiced@gmail.com" className={link}>
            withvoiced@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
