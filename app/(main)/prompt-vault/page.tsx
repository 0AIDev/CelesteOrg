import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { PromptVault } from "@/components/prompt-vault/PromptVault";

export const metadata = { title: "Prompt Vault" };

export default async function PromptVaultPage() {
  const supabase = createClient();
  const user = await getUser().catch(() => null);

  const { data: prompts } = await supabase
    .from("prompt_vault")
    .select(
      "*, author:profiles!prompt_vault_author_id_fkey(full_name, avatar_url)",
    )
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <PromptVault
      initialPrompts={(prompts as never[]) ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
