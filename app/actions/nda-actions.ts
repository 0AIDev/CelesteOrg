"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserProfile = {
  full_name: string | null;
  role_title: string | null;
  department_name: string | null;
  email: string | null;
} | null;

export async function getCurrentUserProfile(): Promise<UserProfile> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, role_title, department_id")
      .eq("id", user.id)
      .maybeSingle();

    let departmentName: string | null = null;
    if (profile?.department_id) {
      const { data: dept } = await admin
        .from("departments")
        .select("name")
        .eq("id", profile.department_id)
        .maybeSingle();
      departmentName = dept?.name ?? null;
    }

    return {
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? null,
      role_title: profile?.role_title ?? null,
      department_name: departmentName,
      email: user.email ?? null,
    };
  } catch {
    return null;
  }
}
