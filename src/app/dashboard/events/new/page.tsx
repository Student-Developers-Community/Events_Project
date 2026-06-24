import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import EventCreateForm from "@/components/dashboard/EventCreateForm";
import { getCurrentOrganiser } from "@/lib/auth/session";

export const metadata = { title: "Create event · TechEvent" };

export default async function NewEventPage() {
  const organiser = await getCurrentOrganiser();
  if (!organiser) redirect("/auth/login");

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 sm:px-7 py-10 sm:py-12">
        <header className="mb-8">
          <Link href="/dashboard" className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
            ← Back to dashboard
          </Link>
          <h1 className="sec-title">Create event</h1>
          <p className="sec-sub mt-2">Fill in the details — the preview on the right updates as you type.</p>
        </header>

        <EventCreateForm />
      </main>
    </>
  );
}
