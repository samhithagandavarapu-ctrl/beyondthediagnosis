import { useEffect, useRef, useState } from "react";
import Icon from "../icons/Icon";

// Optional voice note, as an alternative to typing. The recording lives in
// this tab only — it is never uploaded and never written to storage, so
// practice mode and "this is real" behave identically here.

type Props = {
  recorded: boolean;
  onRecordedChange: (recorded: boolean) => void;
};

const supported =
  typeof window !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window.MediaRecorder !== "undefined";

export default function VoiceRecorder({ recorded, onRecordedChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Free the object URL and release the mic if the user navigates away
  // mid-recording.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [url]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        onRecordedChange(true);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("I can't use the microphone. You can type instead.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function clear() {
    if (url) URL.revokeObjectURL(url);
    setUrl(null);
    onRecordedChange(false);
  }

  if (!supported) return null;

  return (
    <div className="rounded-tile border border-navy/12 bg-mist p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={recording ? stop : start}
          className={`btd-btn min-h-[52px] px-6 py-3 ${
            recording ? "bg-coral hover:bg-coral-hover" : "bg-sky hover:bg-sky-hover"
          }`}
        >
          <Icon name={recording ? "stop" : "mic"} size={20} className="mr-2" />
          {recording ? "Stop" : "Say it out loud"}
        </button>
        {url && (
          <>
            <audio controls src={url} className="max-w-full" />
            <button type="button" onClick={clear} className="text-13 font-bold text-link hover:underline">
              Record again
            </button>
          </>
        )}
      </div>
      {recorded && !url && (
        <p className="mt-2 text-13 text-body">Your voice note is ready.</p>
      )}
      <p className="mt-2 text-12 text-muted">
        Your recording stays on this device. It is not uploaded or saved.
      </p>
      {error && <p className="mt-2 text-13 font-semibold text-clay">{error}</p>}
    </div>
  );
}
