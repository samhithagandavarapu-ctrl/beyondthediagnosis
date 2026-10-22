import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ContentEdit, editFor, loadContentEdits } from "../lib/siteContent";

// Words an admin changed, shown to everyone. The site's pages don't need to
// know about it: after React draws a page, any text on it that has an edit is
// swapped for the new words, and swapped again whenever React redraws it.
// Admins can turn on editing to click any words and change them.

type State = {
  edits: ContentEdit[];
  reload: () => void;
  /** An admin is clicking words to change them. */
  editing: boolean;
  setEditing: (on: boolean) => void;
  /** The words a text node showed before any edit (what edits are keyed on). */
  originalOf: (node: Text) => string;
};

const SiteContentContext = createContext<State | undefined>(undefined);

const EDITING_KEY = "voiced:admin-editing";

// Text never touched: form fields, code, and the editor's own panels.
const SKIP = "script, style, textarea, input, select, [data-no-edit], [contenteditable]";

type Applied = { original: string; shown: string };

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [edits, setEdits] = useState<ContentEdit[]>([]);
  const applied = useRef(new WeakMap<Text, Applied>());
  // Text showing an edit right now, so taking the last edit away puts the
  // original words back.
  const touched = useRef(new Set<Text>());
  const [editingOn, setEditingOn] = useState(() => {
    try {
      return sessionStorage.getItem(EDITING_KEY) === "1";
    } catch {
      return false;
    }
  });
  const editing = isAdmin && editingOn;

  const reload = useCallback(() => {
    loadContentEdits().then(setEdits);
  }, []);
  useEffect(reload, [reload]);

  function setEditing(on: boolean) {
    setEditingOn(on);
    try {
      if (on) sessionStorage.setItem(EDITING_KEY, "1");
      else sessionStorage.removeItem(EDITING_KEY);
    } catch {
      // Lasts until the page reloads.
    }
  }

  const originalOf = useCallback((node: Text) => {
    const rec = applied.current.get(node);
    const now = node.nodeValue ?? "";
    // Shown as we left it: the original is the one we kept. Changed since
    // (React redrew it): what's there now is the original.
    return (rec && now === rec.shown ? rec.original : now).trim();
  }, []);

  // Swap edited words in, now and after every change to the page.
  useEffect(() => {
    function pass() {
      touched.current.forEach((n) => {
        if (!n.isConnected) touched.current.delete(n);
      });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        const rec = applied.current.get(n);
        const now = n.nodeValue ?? "";
        const original = rec && now === rec.shown ? rec.original : now;
        const key = original.trim();
        const edit = key && !n.parentElement?.closest(SKIP) ? editFor(edits, key, pathname) : undefined;
        if (edit) {
          const lead = original.match(/^\s*/)?.[0] ?? "";
          const tail = original.match(/\s*$/)?.[0] ?? "";
          const shown = lead + edit.replacement + tail;
          if (now !== shown) n.nodeValue = shown;
          applied.current.set(n, { original, shown });
          touched.current.add(n);
        } else if (rec && now === rec.shown) {
          // The edit was taken away (or doesn't apply on this page).
          n.nodeValue = rec.original;
          applied.current.delete(n);
          touched.current.delete(n);
        }
      }
    }
    // Nothing edited and nothing ever swapped: no work for visitors at all.
    if (!edits.length && !touched.current.size) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(pass);
    };
    pass();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [edits, pathname]);

  return (
    <SiteContentContext.Provider value={{ edits, reload, editing, setEditing, originalOf }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteContent must be used within SiteContentProvider");
  return ctx;
}
