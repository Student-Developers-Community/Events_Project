import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import EventCreateForm from "@/components/dashboard/EventCreateForm";
import { getCurrentOrganiser } from "@/lib/auth/session";
import { getMyEventById } from "@/lib/db/organiser-events";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit event · TechEvent" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const organiser = await getCurrentOrganiser();
  if (!organiser) redirect("/auth/login");

  const { id } = await params;
  const data = await getMyEventById(id);
  if (!data) notFound();
  const e = data.event;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-7 py-12">
        <Link href={`/dashboard/events/${id}`} className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
          ← Back to event
        </Link>
        <header className="mb-8">
          <h1 className="sec-title">Edit event</h1>
          <p className="sec-sub mt-2">Update details, seats, venue, or contact info.</p>
        </header>

        <div className="card-base p-7">
          <EventCreateForm
            mode="edit"
            eventId={id}
            defaults={{
              title: e.title,
              subtitle: e.subtitle,
              description: e.description,
              category: e.category,
              starts_at: e.starts_at,
              ends_at: e.ends_at,
              is_online: e.is_online,
              venue_name: e.venue_name,
              city: e.city,
              online_url: e.online_url,
              total_capacity: e.total_capacity,
              cover_image_url: e.cover_image_url,
              contact_email: e.contact_email,
              contact_phone: e.contact_phone,
            }}
          />
        </div>
      </main>
    </>
  );
}
