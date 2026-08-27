import { NotionHub } from "@/components/notion/NotionHub";

export const metadata = { title: "Notion" };
export const dynamic = "force-dynamic";

export default function NotionPage() {
  return <NotionHub />;
}
