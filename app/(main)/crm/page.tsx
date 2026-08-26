import { createClient } from "@/lib/supabase/server";
import { StartupCrm } from "@/components/crm/StartupCrm";

export const metadata = { title: "CRM Pipeline" };

export default async function CrmPage() {
  const supabase = createClient();

  const { data: contacts } = await supabase
    .from("crm_contacts")
    .select("*")
    .order("created_at", { ascending: false });

  return <StartupCrm initialContacts={(contacts as never[]) ?? []} />;
}
