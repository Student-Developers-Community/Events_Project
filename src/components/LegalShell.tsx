import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ENTITY } from "@/lib/legal";

export default function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-7 py-12">
        <h1 className="sec-title mb-1">{title}</h1>
        <p className="text-[12.5px] mb-8" style={{ color: "var(--dim)" }}>
          Last updated: {ENTITY.lastUpdated} · Operated by {ENTITY.legalName}
        </p>
        <div className="legal-prose flex flex-col gap-1">{children}</div>
      </main>
      <Footer />
    </>
  );
}
