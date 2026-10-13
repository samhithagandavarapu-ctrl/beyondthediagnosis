import { useEffect, useRef, useState } from "react";
import Icon from "./icons/Icon";
import {
  ACCEPT_FILES,
  Message,
  attachmentUrl,
  checkFile,
  fileType,
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

function timeOf(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Today", "Yesterday", or a date — the divider between days. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(d.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

const MAX_FILES = 10;

/** The small "⋯" menu on a message: copy its text, or unsend it if it's yours. */
function MessageMenu({
  m,
  mine,
  onUnsend,
}: {
  m: Message;
  mine: boolean;
  onUnsend: (m: Message) => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const canCopy = Boolean(m.body.trim());
  if (!canCopy && !mine) return null;

  return (
    <div ref={ref} className="relative self-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Message options"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full text-muted opacity-60 hover:bg-navy/7 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="3.5" cy="8" r="1.4" fill="currentColor" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
          <circle cx="12.5" cy="8" r="1.4" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 w-40 rounded-tile border border-navy/12 bg-white p-1 shadow-[0_10px_28px_rgba(33,50,68,0.14)] ${
            mine ? "right-0" : "left-0"
          }`}
        >
          {canCopy && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(m.body).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => {
                      setCopied(false);
                      setOpen(false);
                    }, 900);
                  },
                  () => setOpen(false)
                );
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-body hover:bg-sky/30"
            >
              {copied ? "Copied" : "Copy text"}
            </button>
          )}
          {mine && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onUnsend(m);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-coral-ink hover:bg-coral/20"
            >
              Unsend
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One conversation: messages in order, and a box to write the next one.
 *  "Mine" sits on the right in navy; the other side on the left in white. */
export default function ChatView({
  messages,
  viewerIsAdmin,
  theirName,
  otherLastReadAt,
  onSend,
  onUnsend,
  emptyText,
  placeholder = "Write a message",
}: {
  messages: Message[];
  /** Which side is "me": the team's messages, or the person's. */
  viewerIsAdmin: boolean;
  theirName: string;
  /** When the other side last read this conversation, for "Seen". Null when
   *  unknown — then only "Sent" is shown. */
  otherLastReadAt: string | null;
  onSend: (body: string, files: File[]) => Promise<string | null>;
  onUnsend: (m: Message) => Promise<string | null>;
  emptyText: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const problems: string[] = [];
    const ok: File[] = [];
    for (const f of incoming) {
      const problem = checkFile(f);
      if (problem) problems.push(problem);
      else ok.push(f);
    }
    setFiles((prev) => {
      const next = [...prev, ...ok];
      if (next.length > MAX_FILES) problems.push(`You can send up to ${MAX_FILES} files at once.`);
      return next.slice(0, MAX_FILES);
    });
    setError(problems.length ? problems.join(" ") : null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, j) => j !== i));
  }

  // Small previews of chosen photos, before they're sent.
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  useEffect(() => {
    const urls = files.map((f) => (isImage(fileType(f)) ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if ((!body && files.length === 0) || sending) return;
    setSending(true);
    setError(null);
    const err = await onSend(body, files);
    setSending(false);
    if (err) setError(err);
    else {
      setDraft("");
      setFiles([]);
    }
  }

  async function unsend(m: Message) {
    if (!window.confirm("Unsend this message? It will be removed for everyone.")) return;
    const err = await onUnsend(m);
    if (err) setError(err);
  }

  // "Seen" goes under the newest of my messages the other side has read;
  // "Sent" under my very last one if they haven't read it yet.
  const mineList = messages.filter((m) => m.from_admin === viewerIsAdmin && !m.unsent_at);
  const lastMine = mineList[mineList.length - 1];
  const readAt = otherLastReadAt ? Date.parse(otherLastReadAt) : 0;
  const lastSeenMine = [...mineList].reverse().find((m) => Date.parse(m.created_at) <= readAt);

  let lastDay = "";

  return (
    <div className="flex min-h-[420px] flex-col">
      <div
        className="flex-1 space-y-2 overflow-y-auto rounded-tile bg-mist p-4 max-h-[60vh]"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">{emptyText}</p>
        ) : (
          messages.map((m) => {
            const mine = m.from_admin === viewerIsAdmin;
            const who = mine ? "You" : m.from_admin ? "Voiced team" : theirName;
            const day = dayLabel(m.created_at);
            const showDay = day !== lastDay;
            lastDay = day;
            const receipt =
              m.id === lastSeenMine?.id
                ? `Seen${otherLastReadAt ? ` ${timeOf(otherLastReadAt)}` : ""}`
                : m.id === lastMine?.id && m.id !== lastSeenMine?.id
                ? "Sent"
                : "";
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 flex items-center gap-3" role="separator">
                    <span className="h-px flex-1 bg-navy/10" />
                    <span className="text-11 font-bold uppercase tracking-[0.1em] text-muted">{day}</span>
                    <span className="h-px flex-1 bg-navy/10" />
                  </div>
                )}
                <div className={`group flex gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className="max-w-[85%] sm:max-w-[70%]">
                    <p className={`mb-1 text-11 font-bold uppercase tracking-[0.08em] text-muted ${mine ? "text-right" : ""}`}>
                      {who} · {timeOf(m.created_at)}
                    </p>
                    {m.unsent_at ? (
                      <p className="rounded-tile border border-dashed border-navy/20 px-4 py-2 text-sm italic text-muted">
                        {mine ? "You unsent a message" : "This message was unsent"}
                      </p>
                    ) : (
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
                    )}
                    {receipt && (
                      <p className="mt-1 text-right text-11 font-semibold text-muted">{receipt}</p>
                    )}
                  </div>
                  {!m.unsent_at && <MessageMenu m={m} mine={mine} onUnsend={unsend} />}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className={`mt-3 grid gap-2 rounded-tile ${dragging ? "outline-dashed outline-2 outline-offset-4 outline-sky" : ""}`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        {error && (
          <p role="alert" className="rounded border border-coral bg-coral/20 px-3 py-2 text-sm text-coral-ink">
            {error}
          </p>
        )}
        {files.length > 0 && (
          <ul className="grid gap-2" aria-label="Files to send">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-tile border border-navy/15 bg-sky-tint px-3 py-2"
              >
                {previews[i] ? (
                  <img src={previews[i] as string} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <Icon name="file" size={24} className="text-navy" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy">{f.name}</span>
                  <span className="block text-12 text-muted">{formatBytes(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-13 font-semibold text-link hover:underline"
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
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
          onPaste={(e) => {
            // A pasted screenshot becomes an attachment.
            const pasted = Array.from(e.clipboardData.files);
            if (pasted.length) {
              e.preventDefault();
              addFiles(pasted);
            }
          }}
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
            multiple
            accept={ACCEPT_FILES}
            className="sr-only"
            onChange={(e) => addFiles(e.target.files)}
          />
          <label
            htmlFor="chat-file"
            className="inline-flex cursor-pointer items-center gap-2 rounded border border-navy/20 px-3.5 py-2.5 text-sm font-semibold text-navy hover:border-navy/50"
          >
            <Icon name="paperclip" size={16} />
            Add photos or files
          </label>
          <span className="hidden text-12 text-muted sm:inline">
            Drag files here, or paste a screenshot · Ctrl + Enter to send
          </span>
          <button
            type="submit"
            disabled={sending || (!draft.trim() && files.length === 0)}
            className="ml-auto inline-flex items-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-semibold text-mist disabled:opacity-50"
          >
            <Icon name="send" size={16} />
            {sending ? (files.length ? "Uploading…" : "Sending…") : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
