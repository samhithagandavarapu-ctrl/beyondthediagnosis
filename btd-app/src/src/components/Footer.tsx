export default function Footer() {
  return (
    <footer className="border-t border-ink/10 mt-16">
      <div className="btd-container py-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm text-slate-light">
        <p>
          Verity is an education and advocacy tool. It does not diagnose,
          treat, or replace the guidance of a licensed healthcare provider.
        </p>
        <p className="text-xs">
          If this is a medical emergency, call 911 (or your local emergency number) now.
        </p>
      </div>
    </footer>
  );
}
