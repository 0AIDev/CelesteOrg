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
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { uploadRecording } from "@/app/actions/recording-actions";

type RecorderState = "idle" | "recording" | "paused" | "preview" | "uploading" | "done" | "error";

// ── Main component ──────────────────────────────────────────────────────────
export function ScreenRecorder({ onClose }: { onClose?: () => void }) {
  const [state, setState] = useState<RecorderState>("idle");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedUrlRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Start recording ───────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError("");

      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError("Screen recording is not supported in this browser. Try Chrome or Edge.");
        setState("error");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as MediaTrackConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Show live preview
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play();
      }

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
        if (previewRef.current) {
          previewRef.current.srcObject = null;
          previewRef.current.src = recordedUrlRef.current;
        }
      };

      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setError("Recording failed. Please try again.");
        setState("error");
        stopRecording();
      };

      mediaRecorder.start(1000); // collect data every second
      startTimeRef.current = Date.now();
      setState("recording");

      // Timer
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Handle user stopping the share via browser UI
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

  // ── Stop recording ────────────────────────────────────────────────────
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

  // ── Pause / Resume ────────────────────────────────────────────────────
  function togglePause() {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setState("paused");
    } else if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      setState("recording");
    }
  }

  // ── Discard and start over ────────────────────────────────────────────
  function discard() {
    if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current);
    recordedBlobRef.current = null;
    recordedUrlRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    setState("idle");
  }

  // ── Upload to Supabase ────────────────────────────────────────────────
  async function handleUpload() {
    const blob = recordedBlobRef.current;
    if (!blob) return;

    setState("uploading");
    setProgress(0);
    setError("");

    // Check file size before uploading
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (blob.size > maxSize) {
      setError("Recording too large (max 50MB). Try a shorter recording.");
      setState("error");
      return;
    }

    // Convert blob to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setProgress(50);

      try {
        const res = await uploadRecording({
          blob: base64,
          fileName: `recording-${Date.now()}.webm`,
          mimeType: "video/webm",
          title: title.trim() || `Recording ${new Date().toLocaleString()}`,
          durationSec: duration,
        });

        setProgress(100);

        if (res.ok) {
          setState("done");
        } else {
          setError(res.error);
          setState("error");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setState("error");
      }
    };

    reader.onerror = () => {
      setError("Failed to process recording");
      setState("error");
    };

    reader.readAsDataURL(blob);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Monitor className="h-4 w-4 text-gray-400" />
            <h2 className="text-[14px] font-semibold text-gray-900">
              {state === "idle" && "Screen Recorder"}
              {state === "recording" && "Recording…"}
              {state === "paused" && "Paused"}
              {state === "preview" && "Preview Recording"}
              {state === "uploading" && "Uploading…"}
              {state === "done" && "Recording Saved"}
              {state === "error" && "Error"}
            </h2>
          </div>
          {onClose && state !== "uploading" && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Preview / Live video */}
          <div className="relative mb-4 overflow-hidden rounded-xl bg-gray-900">
            <video
              ref={previewRef}
              className="aspect-video w-full object-contain"
              muted={state === "recording" || state === "paused"}
              playsInline
            />

            {/* Idle state */}
            {state === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Monitor className="h-12 w-12 text-gray-500" />
                <p className="mt-3 text-sm text-gray-400">
                  Select a screen or window to record
                </p>
              </div>
            )}

            {/* Recording indicator */}
            {(state === "recording" || state === "paused") && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    state === "recording" ? "animate-pulse bg-red-500" : "bg-yellow-400",
                  )}
                />
                <span className="text-xs font-medium text-white tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>
            )}

            {/* Done badge */}
            {state === "done" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Check className="h-12 w-12 text-green-400" />
                <p className="mt-2 text-sm font-medium text-white">Saved!</p>
              </div>
            )}
          </div>

          {/* Error */}
          {(error || state === "error") && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
              {error || "Something went wrong"}
            </p>
          )}

          {/* Title input (preview state) */}
          {state === "preview" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recording title (optional)"
              className="mb-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:bg-white"
              autoFocus
            />
          )}

          {/* Upload progress */}
          {state === "uploading" && (
            <div className="mb-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-[11px] text-gray-400">
                Uploading recording…
              </p>
            </div>
          )}

          {/* File size info */}
          {state === "preview" && recordedBlobRef.current && (
            <p className="mb-3 text-[11px] text-gray-400">
              Size: {(recordedBlobRef.current.size / (1024 * 1024)).toFixed(1)} MB
              {recordedBlobRef.current.size > 50 * 1024 * 1024 && (
                <span className="ml-2 text-red-500">(too large, max 50MB)</span>
              )}
            </p>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Left: discard */}
            <div>
              {(state === "preview" || state === "error") && (
                <button
                  onClick={discard}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-400 hover:text-gray-700"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Discard
                </button>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              {state === "idle" && (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700"
                >
                  <Record className="h-3.5 w-3.5" />
                  Start Recording
                </button>
              )}

              {state === "recording" && (
                <>
                  <button
                    onClick={togglePause}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-red-700"
                  >
                    <Stop className="h-3.5 w-3.5" />
                    Stop
                  </button>
                </>
              )}

              {state === "paused" && (
                <>
                  <button
                    onClick={togglePause}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-red-700"
                  >
                    <Stop className="h-3.5 w-3.5" />
                    Stop
                  </button>
                </>
              )}

              {state === "preview" && (
                <>
                  <button
                    onClick={() => {
                      discard();
                      startRecording();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowClockwise className="h-3.5 w-3.5" />
                    Re-record
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={recordedBlobRef.current ? recordedBlobRef.current.size > 50 * 1024 * 1024 : true}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Save Recording
                  </button>
                </>
              )}

              {state === "done" && onClose && (
                <button
                  onClick={onClose}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-700"
                >
                  Done
                </button>
              )}

              {state === "error" && (
                <button
                  onClick={() => {
                    setError("");
                    setState("idle");
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[12px] font-medium text-white hover:bg-gray-700"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
