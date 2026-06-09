import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import QrScanner from "@/components/dashboard/QrScanner";
import { getCurrentOrganiser } from "@/lib/auth/session";
import { getMyEventById } from "@/lib/db/organiser-events";
import { getCheckinStats } from "@/lib/checkin/actions";

export const dynamic = "force-dynamic";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organiser = await getCurrentOrganiser();
  if (!organiser) redirect("/auth/login");

  const { id } = await params;
  const data = await getMyEventById(id);
  if (!data) notFound();

  const stats = await getCheckinStats(id);

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-7 py-10">
        <Link href={`/dashboard/events/${id}`} className="text-[13px] mb-3 inline-block" style={{ color: "var(--muted)" }}>
          ← Back to event
        </Link>

        <header className="mb-7">
          <p className="sec-label mb-2">Door scanner</p>
          <h1 className="font-extrabold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>
            {data.event.title}
          </h1>
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Point your phone&apos;s camera at each attendee&apos;s QR. Successful scans mark them as checked in instantly.
          </p>
        </header>

        <QrScanner
          eventId={id}
          initialConfirmed={stats.confirmed}
          initialCheckedIn={stats.checked_in}
        />

        <p className="text-[11px] mt-6 text-center" style={{ color: "var(--dim)" }}>
          Tip: keep this page open on the door volunteer&apos;s phone. Best results in bright light, ~30 cm from the QR.
        </p>
      </main>
    </>
  );
}
