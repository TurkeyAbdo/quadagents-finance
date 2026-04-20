import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { autoLogRecurringExpenses } from "@/lib/recurring";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fire-and-forget auto-log. Idempotent per month; safe if this throws.
  try {
    await autoLogRecurringExpenses();
  } catch {
    // silent — we don't want to block page render
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar userEmail={user.email} />
      <main className="md:pl-[240px]">
        <div className="max-w-7xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
