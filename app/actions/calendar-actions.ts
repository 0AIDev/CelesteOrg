"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { resolveApprover } from "@/app/actions/approval-actions";

type ActionResult = { ok: true } | { ok: false; error: string };

function userClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
}

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(200),
  type: z.enum(["vacation", "remote", "sick", "meeting"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().max(80).optional(),
});

export async function createCalendarEvent(
  input: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const parsed = eventSchema.parse(input);
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title: parsed.title,
        type: parsed.type,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        timezone: parsed.timezone ?? null,
        user_id: user.id,
        status: "pending",
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };

    // Time-off / remote requests go through the approvals workflow: resolve
    // the manager from the org chart and open a pending approval linked to
    // this event. Meetings skip the flow.
    if (parsed.type !== "meeting") {
      const approverId = await resolveApprover(user.id);
      const admin = createAdminClient();
      const { data: approval } = await admin
        .from("approvals")
        .insert({
          requester_id: user.id,
          approver_id: approverId,
          manager_id: approverId,
          type: "timeoff",
          target_id: data.id,
          summary: `${parsed.type === "vacation" ? "Vacation" : parsed.type === "remote" ? "Remote" : "Sick leave"}: ${parsed.title}`,
          status: "pending",
        })
        .select("id")
        .single();

      if (approverId) {
        await notify(
          approverId,
          "approval",
          "New time-off request",
          `${user.email}: ${parsed.title} (${parsed.type})`,
          approval?.id,
        );
      }
    }

    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { ok: true, id: data.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create event";
    return { ok: false, error: msg };
  }
}

export async function updateCalendarEvent(
  input: Record<string, unknown>,
): Promise<ActionResult & { id?: string }> {
  try {
    const parsed = eventSchema.parse(input);
    const id = typeof input.id === "string" ? input.id : null;
    if (!id) return { ok: false, error: "Event id is required" };

    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    const { data: existing } = await supabase
      .from("calendar_events")
      .select("user_id, status")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Event not found" };
    // Only the owner can edit (admins skip the ownership check).
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_founder")
      .eq("id", user.id)
      .maybeSingle();
    if (existing.user_id !== user.id && !(profile?.is_founder ?? false)) {
      return { ok: false, error: "You can only edit your own events" };
    }

    const { error } = await supabase
      .from("calendar_events")
      .update({
        title: parsed.title,
        type: parsed.type,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        timezone: parsed.timezone ?? null,
        // A time change voids the previous approval (if any) — the manager
        // must re-approve the updated schedule.
        status: parsed.type === "meeting" ? "approved" : "pending",
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };

    // Reset linked time-off approvals so the manager re-approves the change.
    if (parsed.type !== "meeting") {
      const admin = createAdminClient();
      await admin
        .from("approvals")
        .update({ status: "pending" })
        .eq("target_id", id)
        .eq("type", "timeoff");
    }

    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update event";
    return { ok: false, error: msg };
  }
}

// Replace the tagged attendees on an event (create + delete the diff).
export async function setEventAttendees(
  eventId: string,
  attendeeIds: string[],
): Promise<ActionResult> {
  try {
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated" };

    // Ownership check (same rule as updateCalendarEvent).
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("user_id")
      .eq("id", eventId)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Event not found" };
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_founder")
      .eq("id", user.id)
      .maybeSingle();
    if (existing.user_id !== user.id && !(profile?.is_founder ?? false)) {
      return { ok: false, error: "You can only tag people on your own events" };
    }

    const { data: current } = await supabase
      .from("event_attendees")
      .select("attendee_id")
      .eq("event_id", eventId);
    const have = new Set((current ?? []).map((c) => c.attendee_id));
    const want = new Set(attendeeIds);
    const toAdd = Array.from(want).filter((id) => !have.has(id));
    const toRemove = Array.from(have).filter((id) => !want.has(id));

    if (toAdd.length) {
      const { error: insErr } = await supabase.from("event_attendees").insert(
        toAdd.map((id) => ({ event_id: eventId, attendee_id: id })),
      );
      if (insErr) {
        // Trusted failure if the current user can't write; surface the message.
        if (insErr.code !== "42501") return { ok: false, error: insErr.message };
      }
    }
    if (toRemove.length) {
      const { error: delErr } = await supabase
        .from("event_attendees")
        .delete()
        .eq("event_id", eventId)
        .in("attendee_id", toRemove);
      if (delErr && delErr.code !== "42501") return { ok: false, error: delErr.message };
    }

    revalidatePath("/calendar");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update attendees";
    return { ok: false, error: msg };
  }
}