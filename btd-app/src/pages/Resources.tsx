import { useState } from "react";
import { LIFE_STAGES, RESOURCES, LifeStage } from "../data/resources";

export default function Resources() {
  const [active, setActive] = useState<LifeStage | "all">("all");

  const filtered =
    active === "all" ? RESOURCES : RESOURCES.filter((r) => r.stage === active);

  return (
    <div className="btd-container py-10">
      <h1 className="text-3xl font-display font-semibold mb-2">Resource Navigator</h1>
      <p className="text-slate mb-6 max-w-2xl">
        Trusted resources, filtered by where you are right now.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <FilterChip label="All" active={active === "all"} onClick={() => setActive("all")} />
        {LIFE_STAGES.map((s) => (
          <FilterChip
            key={s.id}
            label={s.label}
            active={active === s.id}
            onClick={() => setActive(s.id)}
          />
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((r) => (
          <div key={r.id} className="btd-card p-5">
            <span className="text-[11px] uppercase tracking-wide font-semibold text-sage-dark">
              {LIFE_STAGES.find((s) => s.id === r.stage)?.label}
            </span>
            <h3 className="font-display font-semibold text-lg mt-1 mb-1">{r.title}</h3>
            <p className="text-sm text-slate leading-relaxed">{r.description}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate col-span-full">No resources in this category yet.</p>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-ink text-paper border-ink"
          : "text-slate border-ink/15 hover:border-ink/40"
      }`}
    >
      {label}
    </button>
  );
}
