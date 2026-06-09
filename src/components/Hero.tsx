import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative px-7 py-24 text-center overflow-hidden"
      style={{ minHeight: "78vh", display: "flex", flexDirection: "column", justifyContent: "center" }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 50% 0%, rgba(0,255,157,.18), transparent 70%), radial-gradient(ellipse 40% 40% at 70% 20%, rgba(0,212,255,.15), transparent 70%)",
        }}
      />
      {/* Grid mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium mb-6"
          style={{
            background: "rgba(0,255,157,.1)",
            border: "1px solid rgba(0,255,157,.3)",
            color: "var(--accent-3)",
          }}
        >
          <span className="pulse" />
          HACK FOR HYDERABAD · Registrations opening soon
        </div>

        <h1
          className="font-extrabold mb-5"
          style={{
            fontSize: "clamp(40px, 6vw, 64px)",
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
          }}
        >
          Run your next<br />
          <span className="gtext">tech event</span> like clockwork.
        </h1>

        <p
          className="mx-auto mb-9"
          style={{
            color: "var(--muted)",
            fontSize: "17px",
            lineHeight: 1.6,
            maxWidth: "540px",
          }}
        >
          Beautiful event pages, instant Razorpay checkout, WhatsApp confirmations, and QR check-in at the door. Built for Indian hackathons, dev meetups, and startup demo days.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/create" className="btn-grad" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
            Create your event →
          </Link>
          <Link href="#discover" className="btn-outline" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
            Browse events
          </Link>
        </div>
      </div>
    </section>
  );
}
