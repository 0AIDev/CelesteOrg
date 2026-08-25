import { getProfile } from "@/lib/auth";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getProfile().catch(() => null);

  return (
    <SettingsClient
      profile={
        profile
          ? {
              full_name: profile.full_name,
              bio: profile.bio,
              location: profile.location,
              previous_companies: profile.previous_companies ?? [],
              avatar_url: profile.avatar_url,
            }
          : null
      }
    />
  );
}