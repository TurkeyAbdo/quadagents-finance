import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";

export default async function Home() {
  const db = createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (user) redirect("/dashboard");
  redirect("/login");
}
