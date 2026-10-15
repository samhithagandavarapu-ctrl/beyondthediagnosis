import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchSite } from "../data/searchIndex";
import Icon from "./icons/Icon";

/** Search box for the top bar: finds pages and resources as you type.
 *  Arrow keys move through the results, Enter opens the one you picked,
 *  Escape closes. Nothing opens until you choose it. */
export default function SiteSearch({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // -1: nothing picked yet, so Enter never jumps to a result on its own.
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const listId = useId();

  const results = useMemo(() => searchSite(query), [query]);

  // Close and clear on navigation, and on a click anywhere else.
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [pathname, search]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  useEffect(() => setActive(-1), [query]);

  function go(to: string) {
    setOpen(false);
    setQuery("");
    navigate(to);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      setOpen(true);
      if (active >= 0) go(results[active].to);
    }
  }

  const showList = open && query.trim().length > 0;

  return (
    <div ref={ref} className={`relative ${className}`} role="search">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search the site
      </label>
      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="btd-input w-full rounded-full py-2 pl-9 pr-3 text-sm"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] min-w-[280px] overflow-y-auto rounded-tile border border-navy/12 bg-white p-1.5 shadow-[0_12px_32px_rgba(33,50,68,0.14)] lg:left-auto lg:w-[360px]"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No results for "{query.trim()}".</li>
          ) : (
            results.map((r, i) => (
              <li
                key={`${r.to}-${r.title}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // Before the input loses focus, so the click lands.
                  e.preventDefault();
                  go(r.to);
                }}
                className={`cursor-pointer rounded-md px-3 py-2 ${i === active ? "bg-sky/30" : ""}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-bold text-navy">{r.title}</span>
                  <span className="shrink-0 text-11 text-muted">{r.kind}</span>
                </span>
                <span className="mt-0.5 block text-13 leading-[1.45] text-body line-clamp-2">
                  {r.description}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
