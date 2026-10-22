import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "../context/SiteContentContext";
import { editFor, resetContentEdit, saveContentEdit } from "../lib/siteContent";
import Icon from "./icons/Icon";

// Editing the site's words, for admins: with editing on, clicking any words
// opens a panel to change them, for this page or everywhere they appear.
// Links and buttons don't go anywhere while editing, so they can be changed
// too. The editor's own panels are marked data-no-edit.

type Picked = { original: string; current: string };

/** The text under a click, if it's words someone could change. */
function textAt(x: number, y: number): Text | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
  };
  const node = doc.caretPositionFromPoint
    ? doc.caretPositionFromPoint(x, y)?.offsetNode
    : document.caretRangeFromPoint?.(x, y)?.startContainer;
  if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue?.trim()) return null;
  return node as Text;
}

export default function SiteEditor() {
  const { editing, setEditing, edits, reload, originalOf } = useSiteContent();
  const { pathname } = useLocation();
  const [picked, setPicked] = useState<Picked | null>(null);

  useEffect(() => {
    if (!editing) {
      setPicked(null);
      return;
    }
    document.body.classList.add("voiced-editing");
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (target?.closest("[data-no-edit]")) return;
      // Nothing navigates or submits while editing.
      e.preventDefault();
      e.stopPropagation();
      const node = textAt(e.clientX, e.clientY);
      if (!node || node.parentElement?.closest("[data-no-edit], textarea, input, select")) return;
      setPicked({ original: originalOf(node), current: (node.nodeValue ?? "").trim() });
    }
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.body.classList.remove("voiced-editing");
    };
  }, [editing, originalOf]);

  if (!editing) return null;

  return (
    <>
      {!picked && (
      <div
        data-no-edit
        role="region"
        aria-label="Editing the site"
        className="fixed inset-x-3 bottom-4 z-[60] mx-auto max-w-xl rounded-card bg-navy text-mist shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <p className="flex items-center gap-2 text-15 font-bold">
            <Icon name="refine" size={20} className="text-butter" />
            Editing the site: click any words to change them.
          </p>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btd-btn min-h-[40px] gap-2 bg-butter px-5 text-sm text-navy hover:bg-butter/90"
          >
            <Icon name="check" size={18} />
            Done editing
          </button>
        </div>
      </div>
      )}
      {picked && (
        <EditPanel
          key={picked.original}
          picked={picked}
          pathname={pathname}
          hasPageEdit={edits.some((e) => e.original === picked.original && e.path === pathname)}
          hasAnyEdit={Boolean(editFor(edits, picked.original, pathname))}
          onClose={() => setPicked(null)}
          onSaved={() => {
            reload();
            setPicked(null);
          }}
        />
      )}
    </>
  );
}

function EditPanel({
  picked,
  pathname,
  hasPageEdit,
  hasAnyEdit,
  onClose,
  onSaved,
}: {
  picked: Picked;
  pathname: string;
  hasPageEdit: boolean;
  hasAnyEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(picked.current);
  const [where, setWhere] = useState<"page" | "everywhere">(hasPageEdit ? "page" : "everywhere");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const err = await saveContentEdit(picked.original, where === "page" ? pathname : "*", text.trim());
    setBusy(false);
    if (err) return setError(err);
    onSaved();
  }

  async function reset() {
    setBusy(true);
    const err = await resetContentEdit(picked.original, "*");
    setBusy(false);
    if (err) return setError(err);
    onSaved();
  }

  return (
    <div
      data-no-edit
      role="dialog"
      aria-label="Change these words"
      className="fixed inset-x-0 bottom-0 z-[60] border-t-4 border-butter bg-white shadow-[0_-8px_24px_rgba(33,50,68,0.2)]"
    >
      <div className="btd-container grid max-w-3xl gap-3 py-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-17 font-extrabold text-navy">Change these words</p>
          <button type="button" onClick={onClose} className="text-sm font-bold text-link hover:underline">
            Cancel
          </button>
        </div>
        {picked.original !== picked.current && (
          <p className="text-13 text-muted">
            Originally: <span className="italic">"{picked.original}"</span>
          </p>
        )}
        <textarea
          className="btd-input min-h-[88px] text-base"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          aria-label="New words"
        />
        {!text.trim() && <p className="text-13 font-semibold text-coral-ink">Saving it empty hides these words.</p>}
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Where</legend>
          {(
            [
              ["everywhere", "Everywhere these words appear"],
              ["page", "Only on this page"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={where === id}
              onClick={() => setWhere(id)}
              className={`min-h-[44px] rounded-full border-2 px-4 text-sm font-bold ${
                where === id ? "border-navy bg-navy text-mist" : "border-navy/20 bg-white text-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </fieldset>
        {error && (
          <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={busy} className="btd-btn-coral min-h-[48px] gap-2 px-6 text-base disabled:opacity-50">
            <Icon name="save" size={18} />
            {busy ? "Saving…" : "Save for everyone"}
          </button>
          {hasAnyEdit && (
            <button type="button" onClick={reset} disabled={busy} className="btd-btn-outline min-h-[48px] px-5 text-sm">
              Back to the original words
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
