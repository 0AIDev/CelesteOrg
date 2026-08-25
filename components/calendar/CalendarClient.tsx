"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import { Spinner, X } from "@phosphor-icons/react";
import { DateTimePicker, localTimezoneLabel } from "@/components/ui/DateTimePicker";
import { SquircleAvatar } from "@/components/ui/SquircleAvatar";

// FullCalendar touches the DOM on mount, so load it client-only.
const LoadedCalendar = dynamic(() => import("@fullcalendar/react"), {
  ssr: false,
});
// The React wrapper is typed loosely by the plugin; treat it as a ref-capable
// component so we can drive prev/next and view changes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Calendar = LoadedCalendar as unknown as React.ForwardRefExoticComponent<any>;
import { createCalendarEvent, updateCalendarEvent, setEventAttendees } from "@/app/actions/calendar-actions";
import { CustomSelect } from "@/components/ui/CustomSelect";

type Person = { id: string; full_name: string | null; avatar_url: string | null };

type CalEvent = {
  id: string;
  title: string;
  type: "vacation" | "remote" | "sick" | "meeting";
  start_time: string;
  end_time: string;
  status: string;
  timezone: string | null;
  attendees: Person[];
  user: { id: string; full_name: string | null } | null;
};

// Monochrome: all event types render in the same dark gray.
const typeColor: Record<string, string> = {
  vacation: "#374151",
  remote: "#374151",
  sick: "#374151",
  meeting: "#374151",
};

const TIMEZONES = ["UTC", "Europe/Rome", "Europe/London", "Europe/Berlin", "Europe/Paris", "Europe/Madrid", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore"];

type FormState = {
  id?: string;
  title: string;
  type: string;
  start: string;
  end: string;
  timezone: string;
  attendeeIds: string[];
};

const emptyForm = (tz: string): FormState => ({
  title: "",
  type: "meeting",
  start: "",
  end: "",
  timezone: tz,
  attendeeIds: [],
});

export function CalendarClient({
  events,
  members,
}: {
  events: CalEvent[];
  members: Person[];
}) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calRef = useRef<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(localTimezoneLabel()));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [view, setView] = useState(() => {
    if (typeof window === "undefined") return "dayGridMonth";
    const saved = window.localStorage.getItem("celeste-calendar-view");
    return saved === "timeGridDay" || saved === "timeGridWeek" || saved === "listWeek" ? saved : "dayGridMonth";
  });
  const isEditing = !!form.id;

  function changeView(v: string) {
    setView(v);
    try { window.localStorage.setItem("celeste-calendar-view", v); } catch { /* ignore */ }
    calRef.current?.getApi().changeView(v);
  }

  const calendarEvents = events.map((e) => {
    const pending = e.status === "pending";
    return {
      id: e.id,
      title: e.title,
      start: e.start_time,
      end: e.end_time,
      color: pending ? "#9ca3af" : typeColor[e.type] ?? "#374151",
      extendedProps: { type: e.type, user: e.user?.full_name, status: e.status, attendees: e.attendees },
    };
  });

  // Render attendees as tiny overlapping avatars inside each event chip.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderEventContent(arg: any) {
    const att = (arg.event.extendedProps?.attendees as Person[] | undefined) ?? [];
    return (
      <div className="flex w-full items-center gap-1 overflow-hidden">
        <span className="min-w-0 flex-1 truncate text-[11.5px]">{arg.timeText} {arg.event.title}</span>
        {att.length > 0 && (
          <span className="flex shrink-0 -space-x-1.5">
            {att.slice(0, 3).map((p) => (
              <span key={p.id} className="rounded-full ring-1 ring-white">
                <SquircleAvatar name={p.full_name} src={p.avatar_url} size="xs" className="h-4 w-4 !text-[8px] rounded-full" />
              </span>
            ))}
            {att.length > 3 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-600 ring-1 ring-white">
                +{att.length - 3}
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  // Existing event ranges, used by the picker to warn about overlaps.
  // When editing, the event being edited is excluded so its own slot is fine.
  const timeConflicts = events
    .filter((e) => e.status !== "rejected" && e.id !== form.id)
    .map((e) => ({ start: e.start_time, end: e.end_time, title: e.title }));

  function onDateClick(arg: DateClickArg) {
    const start = new Date(arg.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setForm({
      ...emptyForm(localTimezoneLabel()),
      start: toLocalInput(start),
      end: toLocalInput(end),
    });
    setErr("");
    setShowForm(true);
  }

  // Click an existing event → edit modal (owner can update it).
  function onEventClick(info: { event: { id: string } }) {
    const ev = events.find((e) => e.id === info.event.id);
    if (!ev) return;
    setForm({
      id: ev.id,
      title: ev.title,
      type: ev.type,
      start: toLocalInput(new Date(ev.start_time)),
      end: toLocalInput(new Date(ev.end_time)),
      timezone: ev.timezone ?? localTimezoneLabel(),
      attendeeIds: ev.attendees.map((a) => a.id),
    });
    setErr("");
    setShowForm(true);
  }

  async function submit() {
    setSaving(true);
    setErr("");
    const payload = {
      title: form.title,
      type: form.type,
      startTime: new Date(form.start).toISOString(),
      endTime: new Date(form.end).toISOString(),
      timezone: form.timezone,
    };
    const res = isEditing
      ? await updateCalendarEvent({ ...payload, id: form.id })
      : await createCalendarEvent(payload);
    if (!res.ok) {
      setSaving(false);
      setErr(res.error);
      return;
    }
    // Sync tagged attendees (create returned the new event id).
    const eventId = isEditing ? form.id! : res.id;
    if (eventId) {
      await setEventAttendees(eventId, form.attendeeIds);
    }
    setSaving(false);
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Team time off, remote days, and meetings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-3 text-xs text-gray-500 md:flex">
            <Legend color="#374151" label="Vacation" />
            <Legend color="#374151" label="Remote" />
            <Legend color="#374151" label="Sick" />
            <Legend color="#374151" label="Meeting" />
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {[
              { key: "dayGridMonth", label: "Month" },
              { key: "timeGridWeek", label: "Week" },
              { key: "timeGridDay", label: "Day" },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => changeView(v.key)}
                className={`rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  view === v.key
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const cal = calRef.current?.getApi();
              cal?.today();
            }}
            className="btn-secondary"
          >
            Today
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            New Event
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-3">
        <Calendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "title",
            center: "",
            right: "prev,next today",
          }}
          initialView={view}
          dayMaxEvents={3}
          navLinks
          dateClick={onDateClick}
          eventClick={onEventClick}
          eventContent={renderEventContent}
          events={calendarEvents}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          nowIndicator
        />
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-2xl backdrop-blur-xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {isEditing ? "Edit event" : "New event"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
              Title
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Offsite prep"
              className="input"
              autoFocus
            />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(["meeting", "vacation", "remote", "sick"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`pill capitalize ${form.type === t ? "pill-active" : "bg-white"}`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: typeColor[t] }}
                  />
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Start</label>
                <DateTimePicker
                  value={form.start}
                  onChange={(v) => setForm({ ...form, start: v })}
                  placeholder="Select start…"
                  conflicts={timeConflicts}
                  timezoneLabel={form.timezone}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-gray-700">End</label>
                <DateTimePicker
                  value={form.end}
                  onChange={(v) => setForm({ ...form, end: v })}
                  placeholder="Select end…"
                  conflicts={timeConflicts}
                  timezoneLabel={form.timezone}
                />
              </div>
            </div>

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Timezone
            </label>
            <CustomSelect
              value={form.timezone}
              onValueChange={(v) => setForm({ ...form, timezone: v })}
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
              placeholder="Select timezone…"
            />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-gray-700">
              Tag people
            </label>
            <div className="rounded-xl border border-gray-200 bg-white p-2.5">
              {form.attendeeIds.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {form.attendeeIds.map((id) => {
                    const p = members.find((m) => m.id === id);
                    if (!p) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 rounded-full bg-gray-900 py-0.5 pl-1 pr-2 text-[11.5px] font-medium text-white"
                      >
                        <SquircleAvatar name={p.full_name} src={p.avatar_url} size="xs" />
                        {p.full_name}
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, attendeeIds: form.attendeeIds.filter((x) => x !== id) })
                          }
                          className="ml-0.5 rounded-full p-0.5 text-white/70 hover:bg-white/20 hover:text-white"
                          aria-label={`Remove ${p.full_name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {members
                  .filter((m) => !form.attendeeIds.includes(m.id))
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm({ ...form, attendeeIds: [...form.attendeeIds, m.id] })}
                      className="flex items-center gap-1.5 rounded-full border border-gray-200 py-0.5 pl-1 pr-2.5 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                    >
                      <SquircleAvatar name={m.full_name} src={m.avatar_url} size="xs" />
                      {m.full_name || "Unnamed"}
                    </button>
                  ))}
              </div>
            </div>

            {err && <p className="mt-3 text-xs text-gray-600">{err}</p>}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={() => setShowForm(false)} className="px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || !form.title || !form.start}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? <Spinner className="h-4 w-4 animate-spin" /> : isEditing ? "Save changes" : "Create event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// Format a Date to the value expected by the form (YYYY-MM-DDTHH:mm, local).
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

