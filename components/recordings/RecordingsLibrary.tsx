"use client";

import { useState } from "react";
import {
  Record,
  Play,
  Pause,
  Trash,
  Monitor,
  Clock,
  Spinner,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { ScreenRecorder } from "@/components/recordings/ScreenRecorder";
import { deleteRecording, getRecordingUrl, type RecordingRow } from "@/app/actions/recording-actions";

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecordingsLibrary({
  initialRecordings = [],
  currentUserId,
}: {
  initialRecordings?: RecordingRow[];
  currentUserId?: string | null;
}) {
  const [recordings, setRecordings] = useState<RecordingRow[]>(initialRecordings);
  const [showRecorder, setShowRecorder] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  async function handlePlay(recording: RecordingRow) {
    if (playing === recording.id) {
      setPlaying(null);
      setPlayingUrl(null);
      return;
    }

    setPlayError(null);
    const res = await getRecordingUrl(recording.file_path);
    if (res.ok && res.url) {
      setPlaying(recording.id);
      setPlayingUrl(res.url);
    } else {
      setPlayError(!res.ok ? res.error : "Could not load recording");
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res = await deleteRecording(id);
    if (res.ok) {
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      if (playing === id) {
        setPlaying(null);
        setPlayingUrl(null);
      }
    }
    setDeleting(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Recordings
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Screen recordings and async video updates for the team.
          </p>
        </div>
        <button
          onClick={() => setShowRecorder(true)}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-700"
        >
          <Record className="h-3.5 w-3.5" />
          New Recording
        </button>
      </div>

      {/* Now playing */}
      {playing && playingUrl && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-gray-900">Now Playing</p>
            <button
              onClick={() => {
                setPlaying(null);
                setPlayingUrl(null);
              }}
              className="text-[12px] text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
          <video
            src={playingUrl}
            controls
            autoPlay
            className="w-full overflow-hidden rounded-xl bg-gray-900"
          />
        </div>
      )}

      {/* Play error */}
      {playError && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">
          {playError}
          <button
            onClick={() => setPlayError(null)}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Recordings list */}
      {recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <Monitor className="h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No recordings yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Click &quot;New Recording&quot; to capture your screen.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm"
            >
              {/* Play button */}
              <button
                onClick={() => handlePlay(rec)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-900 hover:text-white"
              >
                {playing === rec.id ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-gray-900">
                  {rec.title}
                </p>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(rec.duration_sec)}
                  </span>
                  <span>{formatSize(rec.file_size)}</span>
                  <span>{relativeTime(rec.created_at)}</span>
                  {rec.status === "processing" && (
                    <Badge tone="neutral">Processing</Badge>
                  )}
                </div>
                {rec.transcript && (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500 line-clamp-1">
                    {rec.transcript}
                  </p>
                )}
              </div>

              {/* Author + delete */}
              <div className="flex shrink-0 items-center gap-3">
                {rec.author && (
                  <SquircleAvatar
                    name={rec.author.full_name}
                    src={rec.author.avatar_url}
                    size="xs"
                    className="h-6 w-6 text-[9px]"
                  />
                )}
                <button
                  onClick={() => handleDelete(rec.id)}
                  disabled={deleting === rec.id}
                  className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                  title="Delete recording"
                >
                  {deleting === rec.id ? (
                    <Spinner className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recorder modal */}
      {showRecorder && (
        <ScreenRecorder
          onClose={() => {
            setShowRecorder(false);
            // Refresh the list
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
