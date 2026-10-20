import { useEffect, useRef, useState } from "react";
import { ReadingLevel } from "../../lib/myVoice";
import { MAX_SECONDS, VoiceMemo as Memo, deleteMemo, loadMemo, saveMemo } from "../../lib/voiceMemo";
import { useMyVoice } from "../../context/MyVoiceContext";
import { usePracticeMode } from "../../context/PracticeModeContext";
import SpeakButton from "./SpeakButton";
import Icon from "../icons/Icon";

// "Record my voice": say what I want the doctor to hear, up to a minute,
// and play it at the visit. One recording at a time. It stays in this
// browser only — never uploaded — and the Delete button removes it for good.
// In practice mode it plays back but isn't kept.

const supported =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window.MediaRecorder !== "undefined";

function clock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function VoiceMemo({ readingLevel }: { readingLevel: ReadingLevel }) {
  const { say, readAloud } = useMyVoice();
  const { practice } = usePracticeMode();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kept, setKept] = useState<"device" | "practice" | "failed" | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  const startingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const showText = readingLevel !== "icon";

  // The saved recording, if there is one. Practice mode starts empty.
  useEffect(() => {
    if (practice) return;
    let cancelled = false;
    loadMemo().then((m) => {
      if (!cancelled && m) setMemo(m);
    });
    return () => {
      cancelled = true;
    };
  }, [practice]);

  useEffect(() => {
    if (!memo) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(memo.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [memo]);

  // Let go of the mic and the timer if the page changes mid-recording.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const r = recorderRef.current;
      if (r && r.state !== "inactive") r.stop();
      r?.stream.getTracks().forEach((t) => t.stop());
    },
    []
  );

  async function start() {
    setError(null);
    setKept(null);
    setConfirmDelete(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const seconds = Math.min(MAX_SECONDS, (Date.now() - startedRef.current) / 1000);
        const next: Memo = {
          blob: new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
          seconds,
          createdAt: new Date().toISOString(),
        };
        setMemo(next);
        if (practice) {
          setKept("practice");
        } else {
          setKept((await saveMemo(next)) ? "device" : "failed");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      startedRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        const s = (Date.now() - startedRef.current) / 1000;
        setElapsed(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      setError("I can't use the microphone. A helper can check the microphone settings.");
    }
  }

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function remove() {
    await deleteMemo();
    setMemo(null);
    setKept(null);
    setConfirmDelete(false);
    say("Deleted. It's gone from this device.");
  }

  if (!supported) {
    return (
      <div className="btd-card p-6 text-15 text-body">
        This browser can't record sound. Try a different browser, like Chrome or Safari.
      </div>
    );
  }

  const left = MAX_SECONDS - elapsed;

  return (
    <div className="grid gap-5">
      <div className="btd-card grid justify-items-center gap-4 p-6 text-center">
        <button
          type="button"
          onClick={() => {
            if (recording) {
              stop();
            } else if (!startingRef.current) {
              startingRef.current = true;
              say("Recording. Talk now.");
              // Give the spoken prompt a moment so it isn't in the recording.
              window.setTimeout(() => {
                start().finally(() => (startingRef.current = false));
              }, readAloud ? 1200 : 0);
            }
          }}
          aria-label={recording ? "Stop recording" : memo ? "Record again" : "Start recording"}
          className={`grid h-36 w-36 place-items-center rounded-full border-4 border-navy text-navy transition-colors ${
            recording ? "bg-coral hover:bg-coral-hover" : "bg-sky hover:bg-sky-hover"
          }`}
        >
          <Icon name={recording ? "stop" : "mic"} size={64} />
        </button>
        {showText && (
          <p className="flex items-center gap-2 text-21 font-display font-extrabold text-navy">
            {recording ? "Stop" : memo ? "Record again" : "Tap to record"}
            <SpeakButton text={recording ? "Tap to stop" : "Tap to record. You have one minute."} />
          </p>
        )}

        {recording && (
          <div className="w-full max-w-[360px]" aria-live="polite">
            <div className="h-4 overflow-hidden rounded-full bg-sky-tint" role="progressbar" aria-valuemin={0} aria-valuemax={MAX_SECONDS} aria-valuenow={Math.round(elapsed)} aria-label="Time used">
              <div className="h-full bg-coral transition-[width]" style={{ width: `${(elapsed / MAX_SECONDS) * 100}%` }} />
            </div>
            <p className="mt-2 text-15 font-bold text-navy">{clock(left)} left</p>
          </div>
        )}

        {readingLevel === "full" && !recording && (
          <p className="max-w-[32em] text-15 text-body">
            Say what you want your doctor to know, in your own voice. You have up to one minute.
            Then play it at your visit.
          </p>
        )}
      </div>

      {memo && url && !recording && (
        <div className="btd-card grid gap-4 p-6">
          <p className="flex items-center gap-2 text-17 font-display font-extrabold text-navy">
            <Icon name="mic" size={22} />
            {showText ? `My recording · ${clock(memo.seconds)}` : <span className="sr-only">My recording</span>}
          </p>
          <audio ref={audioRef} controls src={url} className="w-full" />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                audioRef.current?.play().catch(() => undefined);
              }}
              className="btd-btn-coral min-h-[60px] gap-2 px-8 text-base"
              aria-label="Play for my doctor"
            >
              <Icon name="play" size={22} />
              Play for my doctor
            </button>
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2 rounded-tile border-2 border-coral bg-coral/20 p-2" role="alert">
                <span className="px-2 text-15 font-bold text-navy">Delete it for good?</span>
                <button
                  type="button"
                  onClick={remove}
                  className="btd-btn min-h-[52px] gap-2 bg-navy px-5 text-sm text-mist hover:bg-navy/90"
                >
                  <Icon name="trash" size={18} />
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btd-btn-outline min-h-[52px] px-5 text-sm"
                >
                  No, keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(true);
                  say("Delete it for good? Tap yes, delete, or no, keep it.");
                }}
                className="btd-btn min-h-[60px] gap-2 border-2 border-coral-ink bg-white px-6 text-base text-coral-ink hover:bg-coral/20"
                aria-label="Delete my recording"
              >
                <Icon name="trash" size={22} />
                Delete
              </button>
            )}
          </div>
          {kept === "practice" && (
            <p className="rounded-tile border border-butter bg-butter/30 px-4 py-2 text-13 font-semibold text-navy">
              Practice mode is on, so this recording won't be kept when you leave.
            </p>
          )}
          {kept === "failed" && (
            <p className="text-13 font-semibold text-clay">
              This browser wouldn't keep the recording. You can still play it now.
            </p>
          )}
        </div>
      )}

      <p className="flex items-center gap-2 rounded-tile bg-mist px-4 py-3 text-13 font-semibold text-navy">
        <Icon name="lock" size={18} />
        Your recording stays only on this device. It is never uploaded.
      </p>
      {error && <p className="text-13 font-semibold text-clay">{error}</p>}
    </div>
  );
}
