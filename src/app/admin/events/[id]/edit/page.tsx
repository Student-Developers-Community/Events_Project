import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { getEventForAdmin } from "@/lib/admin/data";
import { adminUpdateEventAction } from "@/lib/admin/actions";
import EventCreateForm from "@/components/dashboard/EventCreateForm";
import AdminTierManager from "@/components/admin/AdminTierManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit event · Super Admin" };

export default async function AdminEditEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const data = await getEventForAdmin(id);
  if (!data) notFound();
  const e = data.event;
  const tiers = data.tiers;
  const colleges = data.colleges ?? [];

  return (
    <main className="max-w-2xl mx-auto px-7 py-10">
      <Link href={`/admin/events/${id}`} className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
        ← Back to review
      </Link>
      <header className="mb-7">
        <p className="sec-label mb-2" style={{ color: "#ffa94d" }}>Super-admin edit</p>
        <h1 className="sec-title">Edit “{e.title}”</h1>
        <p className="sec-sub mt-2">
          Fix anything wrong before approving. Changes are saved to the organiser’s event.
          (Ticket tiers are managed by the organiser.)
        </p>
      </header>

      <div className="card-base p-7">
        <EventCreateForm
          mode="edit"
          eventId={id}
          submitAction={adminUpdateEventAction}
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
            questions: e.questions,
            is_hackathon: e.is_hackathon,
            team_size: e.team_size,
            eligibility_mode: e.eligibility_mode,
            entry_fee_rupees: e.entry_fee_paise ? e.entry_fee_paise / 100 : 0,
            colleges: colleges.map((c: { name: string; team_quota: number }) => ({ name: c.name, team_quota: c.team_quota })),
          }}
        />
      </div>

      {/* Ticket tiers — super-admin can add / edit / delete */}
      <section className="card-base p-7 mt-6">
        <h2 className="font-bold text-lg mb-1">Ticket tiers</h2>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--muted)" }}>
          Add, edit, or remove pricing tiers. ₹0 = free RSVP. Saved instantly (separate from the form above).
        </p>
        <AdminTierManager eventId={id} tiers={tiers} />
      </section>
    </main>
  );
}
