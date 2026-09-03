export default function Footer() {
  return (
    <footer className="border-t border-ink/10 mt-16">
      <div className="btd-container py-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm text-slate-light">
        <p>
          Verity is an education and advocacy tool. It does not diagnose,
          treat, or replace the guidance of a licensed healthcare provider.
        </p>
        <div className="flex items-center gap-4 shrink-0">
          <a href="/privacy" className="hover:text-ink hover:underline">
            Privacy Policy
          </a>
          <p className="text-xs">
            Emergency? Call 911 now.
          </p>
        </div>
      </div>
    </footer>
  );
}
