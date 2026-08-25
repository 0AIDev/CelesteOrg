import { createClient } from "@/lib/supabase/server";
import CalendarLazy from "@/components/calendar/CalendarLazy";

export const metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const supabase = createClient();

  // Fetch a generous window (Jan 1 of previous year → Dec 31 of next).
  const from = new Date(new Date().getFullYear() - 1, 0, 1).toISOString();
  const to = new Date(new Date().getFullYear() + 1, 11, 31).toISOString();

  const [{ data: events }, { data: attendees }, { data: members }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        `id, title, type, start_time, end_time, status, timezone,
         user:profiles!calendar_events_user_id_fkey(id, full_name)`,
      )
      .gte("start_time", from)
      .lte("start_time", to)
      .order("start_time", { ascending: true }),
    supabase
      .from("event_attendees")
      .select(
        `event_id,
         attendee:profiles!event_attendees_attendee_id_fkey(id, full_name, avatar_url)`,
      ),
    supabase.from("profiles").select("id, full_name, avatar_url").order("full_name"),
  ]);

  // Map event_id -> list of attendees.
  const attendeesByEvent = new Map<string, { id: string; full_name: string | null; avatar_url: string | null }[]>();
  for (const a of attendees ?? []) {
    const person = a.attendee as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null;
    if (!person) continue;
    const list = attendeesByEvent.get(a.event_id) ?? [];
    list.push(person);
    attendeesByEvent.set(a.event_id, list);
  }

  return (
    <CalendarLazy
      events={
        events?.map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type as "vacation" | "remote" | "sick" | "meeting",
          start_time: e.start_time,
          end_time: e.end_time,
          status: e.status,
          timezone: e.timezone,
          attendees: attendeesByEvent.get(e.id) ?? [],
          user: e.user as unknown as { id: string; full_name: string | null } | null,
        })) ?? []
      }
      members={
        members?.map((m) => ({
          id: m.id,
          full_name: m.full_name,
          avatar_url: m.avatar_url,
        })) ?? []
      }
    />
  );
}