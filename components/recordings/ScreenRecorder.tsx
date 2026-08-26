"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Record,
  Stop,
  Play,
  Pause,
  Trash,
  Upload,
  Monitor,
  X,
  Spinner,
  Check,
  ArrowClockwise,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { createRecordingMeta } from "@/app/actions/recording-actions";
import { createClient } from "@/lib/supabase/client";

type RecorderState =
  | "idle"
  | "selecting"
  | "recording"
  | "paused"
  | "preview"
  | "uploading"
  | "done"
  | "error";

export function ScreenRecorder({ onClose }: { onClose?: () => void }) {
  const [state, setState] = useState<RecorderState>("idle");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedUrlRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Select screen (opens browser picker) ─────────────────────────────
  const selectScreen = useCallback(async () => {
    try {
      setError("");
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError("Screen recording is not supported in this browser. Try Chrome or Edge.");
        setState("error");
        return;
      }

      setState("selecting");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });

      streamRef.current = stream;
      chunksRef.current = [];
      pausedDurationRef.current = 0;

      // Show live preview
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play();
      }

      // Auto-start recording after screen is selected
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 2_500_000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        recordedBlobRef.current = blob;
        recordedUrlRef.current = URL.createObjectURL(blob);
        setState("preview");
        setMinimized(false);
        if (previewRef.current) {
          previewRef.current.srcObject = null;
          previewRef.current.src = recordedUrlRef.current;
        }
      };

      mediaRecorder.onerror = () => {
        setError("Recording failed. Please try again.");
        setState("error");
        stopRecording();
      };

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      setState("recording");
      setMinimized(false);

      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(
          Math.floor((Date.now() - startTimeRef.current) / 1000) -
            Math.floor(pausedDurationRef.current / 1000),
        );
      }, 1000);

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecording();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start recording";
      if (msg.includes("NotAllowedError") || msg.includes("cancelled")) {
        setError("Screen sharing was cancelled.");
      } else if (msg.includes("NotReadableError")) {
        setError("Could not access screen. Please try again.");
      } else {
        setError(msg);
      }
      setState("idle");
    }
  }, []);

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function togglePause() {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      pausedDurationRef.current = Date.now();
      setState("paused");
    } else if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      const pauseLength = Date.now() - pausedDurationRef.current;
      startTimeRef.current += pauseLength;
      pausedDurationRef.current = 0;
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      setState("recording");
    }
  }

  function discard() {
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    recordedBlobRef.current = null;
    recordedUrlRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    setTitle("");
    setState("idle");
    setMinimized(false);
  }

  async function handleUpload() {
    const blob = recordedBlobRef.current;
    if (!blob) return;

    setState("uploading");
    setProgress(0);
    setError("");

    if (blob.size > 50 * 1024 * 1024) {
      setError("Recording too large (max 50MB). Try a shorter recording.");
      setState("error");
      return;
    }

    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setError("Not authenticated"); setState("error"); return; }

      const fileName = `recording-${Date.now()}.webm`;
      const filePath = `${user.id}/${fileName}`;

      setProgress(20);
      const { error: uploadErr } = await sb.storage
        .from("screen-recordings")
        .upload(filePath, blob, { contentType: "video/webm", upsert: false });

      if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); setState("error"); return; }

      setProgress(70);
      const res = await createRecordingMeta({
        filePath, fileName, fileSize: blob.size, mimeType: "video/webm",
        title: title.trim() || `Recording ${new Date().toLocaleString()}`,
        durationSec: duration,
      });

      setProgress(100);
      if (res.ok) setState("done");
      else { setError(res.error); setState("error"); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setState("error");
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── FLOATING WIDGET (minimized during recording) ─────────────────────
  if ((state === "recording" || state === "paused") && minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
          <span className={cn("h-2.5 w-2.5 rounded-full", state === "recording" ? "animate-pulse bg-red-500" : "bg-yellow-400")} />
          <span className="text-sm font-medium tabular-nums text-gray-900">{formatTime(duration)}</span>
          <button onClick={togglePause} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            {state === "recording" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={stopRecording} className="rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700">
            <Stop className="h-4 w-4" />
          </button>
          <button onClick={() => setMinimized(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <CaretUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── FULL MODAL ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Monitor className="h-4 w-4 text-gray-400" />
            <h2 className="text-[14px] font-semibold text-gray-900">
              {state === "idle" && "Screen Recorder"}
              {state === "selecting" && "Select screen…"}
              {(state === "recording" || state === "paused") && "Recording…"}
              {state === "preview" && "Preview"}
              {state === "uploading" && "Uploading…"}
              {state === "done" && "Saved"}
              {state === "error" && "Error"}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {(state === "recording" || state === "paused") && (
              <button onClick={() => setMinimized(true)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100" title="Minimize">
                <CaretDown className="h-4 w-4" />
              </button>
            )}
            {onClose && state !== "uploading" && (
              <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5">

          {/* ── IDLE STATE: Clean white area with select button ─────── */}
          {state === "idle" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                <Monitor className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">Ready to record</p>
              <p className="mt-1 text-[12px] text-gray-400">Choose a screen, window, or tab to capture</p>
              <button
                onClick={selectScreen}
                className="mt-5 flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-gray-800"
              >
                <Monitor className="h-4 w-4" />
                Select screen
              </button>
            </div>
          )}

          {/* ── SELECTING: Loading state while browser picker is open ─ */}
          {state === "selecting" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner className="h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-3 text-sm text-gray-500">Waiting for screen selection…</p>
              <p className="mt-1 text-[11px] text-gray-400">Choose a screen, window, or tab in the browser dialog</p>
            </div>
          )}

          {/* ── RECORDING / PAUSED: Live preview ────────────────────── */}
          {(state === "recording" || state === "paused") && (
            <>
              <div className="relative mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <video ref={previewRef} className="aspect-video w-full object-contain" muted playsInline />
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 shadow-sm border border-gray-100">
                  <span className={cn("h-2 w-2 rounded-full", state === "recording" ? "animate-pulse bg-red-500" : "bg-yellow-400")} />
                  <span className="text-xs font-medium text-gray-900 tabular-nums">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div />
                <div className="flex items-center gap-2">
                  <button onClick={togglePause}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50">
                    {state === "recording" ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
                  </button>
                  <button onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-red-700">
                    <Stop className="h-3.5 w-3.5" /> Stop
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── PREVIEW ─────────────────────────────────────────────── */}
          {state === "preview" && (
            <>
              <div className="relative mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <video ref={previewRef} className="aspect-video w-full object-contain" playsInline controls />
              </div>

              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Recording title (optional)"
                className="mb-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
                autoFocus />

              {recordedBlobRef.current && (
                <p className="mb-3 text-[11px] text-gray-400">
                  Size: {(recordedBlobRef.current.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              )}

              <div className="flex items-center justify-between">
                <button onClick={discard}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-400 hover:text-gray-700">
                  <Trash className="h-3.5 w-3.5" /> Discard
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => { discard(); selectScreen(); }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50">
                    <ArrowClockwise className="h-3.5 w-3.5" /> Re-record
                  </button>
                  <button onClick={handleUpload}
                    disabled={recordedBlobRef.current ? recordedBlobRef.current.size > 50 * 1024 * 1024 : true}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Upload className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── UPLOADING ───────────────────────────────────────────── */}
          {state === "uploading" && (
            <div className="py-8">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-gray-900 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-center text-[12px] text-gray-400">Uploading recording…</p>
            </div>
          )}

          {/* ── DONE ────────────────────────────────────────────────── */}
          {state === "done" && (
            <div className="flex flex-col items-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Check className="h-6 w-6 text-gray-900" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">Recording saved</p>
              <p className="mt-1 text-[12px] text-gray-400">Added to your recordings library</p>
              {onClose && (
                <button onClick={onClose}
                  className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-700">
                  Done
                </button>
              )}
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────── */}
          {state === "error" && (
            <div className="py-6">
              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</p>
              )}
              <div className="flex justify-end">
                <button onClick={() => { setError(""); setState("idle"); }}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[12px] font-medium text-white hover:bg-gray-700">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
