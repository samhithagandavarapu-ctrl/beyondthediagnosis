import { NavLink } from "react-router-dom";

const links = [
  { to: "/assistant", label: "AI Assistant" },
  { to: "/appointment-prep", label: "Appointment Prep" },
  { to: "/resources", label: "Resources" },
  { to: "/provider-education", label: "Provider Education" },
  { to: "/stories", label: "Community Stories" },
];

export default function Navbar() {
  return (
    <header className="border-b border-ink/10 bg-paper/90 backdrop-blur sticky top-0 z-30">
      <div className="btd-container flex items-center justify-between py-4">
        <NavLink to="/" className="flex items-baseline gap-2 group">
          <span className="font-display text-xl font-semibold text-ink">
            Beyond <span className="text-gold-dark">the Diagnosis</span>
          </span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-ink text-paper"
                    : "text-slate hover:bg-ink/5 hover:text-ink"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {/* mobile nav */}
      <nav className="md:hidden btd-container flex flex-wrap gap-2 pb-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-2.5 py-1 rounded-sm text-xs font-medium border ${
                isActive ? "bg-ink text-paper border-ink" : "text-slate border-ink/15"
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
