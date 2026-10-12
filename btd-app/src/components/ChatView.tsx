import { useEffect, useRef, useState } from "react";
import Icon from "./icons/Icon";
import {
  ACCEPT_FILES,
  Message,
  attachmentUrl,
  checkFile,
  formatBytes,
  isImage,
} from "../lib/messages";

/** A photo shows as a picture (tap to open it full size); any other file as
 *  a card with its name and size that opens or downloads it. Links are made
 *  on the spot and expire, because the files are private. */
function Attachment({ m, mine }: { m: Message; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const path = m.attachment_path ?? "";

  useEffect(() => {
    let cancelled = false;
    attachmentUrl(path).then((u) => {
      if (cancelled) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const name = m.attachment_name || "File";
  if (failed) {
    return <p className="rounded-tile bg-white/70 px-3 py-2 text-13 text-muted">Couldn't open "{name}".</p>;
  }

  if (isImage(m.attachment_type)) {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={`Photo: ${name}`}
          className="max-h-72 w-auto max-w-full rounded-tile border border-navy/12 bg-white object-contain"
        />
      </a>
    ) : (
      <div className="grid h-40 w-56 max-w-full place-items-center rounded-tile border border-navy/12 bg-white text-13 text-muted">
        Loading photo…
      </div>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      download={name}
      aria-disabled={!url}
      className={`flex items-center gap-3 rounded-tile border px-3 py-2.5 ${
        mine ? "border-mist/30 bg-navy/90 text-mist" : "border-navy/12 bg-white text-navy"
      } ${url ? "hover:underline" : "pointer-events-none opacity-70"}`}
    >
      <Icon name="file" size={22} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className={`block text-12 ${mine ? "text-mist/75" : "text-muted"}`}>
          {m.attachment_size ? formatBytes(m.attachment_size) : ""}
          {url ? " · Open" : " · Loading…"}
        </span>
      </span>
    </a>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** One conversation: messages in order, and a box to write the next one.
 *  "Mine" sits on the right in navy; the other side on the left in white. */
export default function ChatView({
  messages,
  viewerIsAdmin,
  theirName,
  onSend,
  emptyText,
  placeholder = "Write a message",
}: {
  messages: Message[];
  /** Which side is "me": the team's messages, or the person's. */
  viewerIsAdmin: boolean;
  theirName: string;
  onSend: (body: string, file: File | null) => Promise<string | null>;
  emptyText: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    if (!f) return;
    const problem = checkFile(f);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(f);
  }

  function clearFile() {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // A small preview of a chosen photo, before it's sent.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !isImage(file.type)) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    setError(null);
    const err = await onSend(body, file);
    setSending(false);
    if (err) setError(err);
    else {
      setDraft("");
      clearFile();
    }
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div
        className="flex-1 space-y-3 overflow-y-auto rounded-tile bg-mist p-4 max-h-[60vh]"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{emptyText}</p>
        ) : (
          messages.map((m) => {
            const mine = m.from_admin === viewerIsAdmin;
            const who = mine ? "You" : m.from_admin ? "Voiced team" : theirName;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] sm:max-w-[70%]">
                  <p className={`mb-1 text-11 font-bold uppercase tracking-[0.08em] text-muted ${mine ? "text-right" : ""}`}>
                    {who} · {when(m.created_at)}
                  </p>
                  <div className={`grid gap-1.5 ${mine ? "justify-items-end" : "justify-items-start"}`}>
                    {m.attachment_path && <Attachment m={m} mine={mine} />}
                    {m.body.trim() && (
                      <p
                        className={`whitespace-pre-wrap break-words rounded-tile px-4 py-2.5 text-15 leading-[1.55] ${
                          mine ? "bg-navy text-mist" : "border border-navy/12 bg-white text-navy"
                        }`}
                      >
                        {m.body}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 grid gap-2">
        {error && (
          <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
            {error}
          </p>
        )}
        {file && (
          <div className="flex items-center gap-3 rounded-tile border border-navy/15 bg-sky-tint px-3 py-2">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
            ) : (
              <Icon name="file" size={24} className="text-navy" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy">{file.name}</span>
              <span className="block text-12 text-muted">{formatBytes(file.size)} · sends with your message</span>
            </span>
            <button type="button" onClick={clearFile} className="text-13 font-semibold text-link hover:underline">
              Remove
            </button>
          </div>
        )}
        <label htmlFor="chat-draft" className="sr-only">
          Your message
        </label>
        <textarea
          id="chat-draft"
          className="btd-input min-h-[84px]"
          value={draft}
          maxLength={4000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter sends; plain Enter is a new line, so nobody
            // sends half a message by accident.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
          }}
          placeholder={placeholder}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            ref={fileRef}
            id="chat-file"
            type="file"
            accept={ACCEPT_FILES}
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <label
            htmlFor="chat-file"
            className="inline-flex cursor-pointer items-center gap-2 rounded border border-navy/20 px-3.5 py-2.5 text-sm font-semibold text-navy hover:border-navy/50"
          >
            <Icon name="paperclip" size={16} />
            Add a photo or file
          </label>
          <span className="hidden text-12 text-muted sm:inline">Ctrl + Enter to send</span>
          <button
            type="submit"
            disabled={sending || (!draft.trim() && !file)}
            className="ml-auto inline-flex items-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-semibold text-mist disabled:opacity-50"
          >
            <Icon name="send" size={16} />
            {sending ? (file ? "Uploading…" : "Sending…") : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
