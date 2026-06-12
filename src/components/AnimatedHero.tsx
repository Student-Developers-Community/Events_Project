"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, type Variants } from "framer-motion";
import { Sparkles, ArrowRight, Ticket, QrCode, CalendarClock } from "lucide-react";

/* ── Particle network background (canvas, violet/cyan, DPR-aware, a11y) ── */
function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; phase: number };
    let particles: P[] = [];
    let w = 0, h = 0;

    function init() {
      const count = Math.min(120, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.25,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function resize() {
      const r = container!.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      init();
    }

    let raf = 0;
    function frame(time: number) {
      ctx!.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!reduced) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        const pulse = Math.sin(time * 0.001 + p.phase) * 0.3 + 0.7;
        ctx!.fillStyle = `rgba(140, 110, 255, ${p.alpha * pulse})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p2.x - p.x, dy = p2.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx!.strokeStyle = `rgba(124, 92, 255, ${(1 - dist / 120) * 0.28})`;
            ctx!.lineWidth = 0.6;
            ctx!.beginPath();
            ctx!.moveTo(p.x, p.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.stroke();
          }
        }
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{
          maskImage: "radial-gradient(ellipse 78% 70% at 50% 38%, black, transparent 82%)",
          WebkitMaskImage: "radial-gradient(ellipse 78% 70% at 50% 38%, black, transparent 82%)",
        }}
      />
    </div>
  );
}

const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const HIGHLIGHTS = [
  { icon: Ticket,        title: "Tickets & RSVPs",  body: "Free or paid tiers" },
  { icon: QrCode,        title: "QR check-in",      body: "Scan at the door" },
  { icon: CalendarClock, title: "Auto reminders",   body: "Email + calendar" },
];

export default function AnimatedHero({ createHref }: { createHref: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: "88vh" }}>
      <ParticleNetwork />

      {/* glow blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full" style={{ background: "rgba(124,92,255,.18)", filter: "blur(120px)" }} />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full" style={{ background: "rgba(0,212,255,.14)", filter: "blur(120px)" }} />
      </div>

      {/* grid mesh */}
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

      <div className="relative z-10 flex min-h-[88vh] flex-col items-center justify-center px-6 py-24 text-center">
        <motion.div
          ref={ref}
          variants={container}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="mx-auto max-w-3xl"
        >
          <motion.div
            variants={item}
            className="mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 glass"
            style={{ color: "var(--accent-3)" }}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-[13px] font-medium">The all-in-one tech event platform</span>
          </motion.div>

          <motion.h1
            variants={item}
            className="font-extrabold tracking-tight mb-6"
            style={{ fontSize: "clamp(40px, 7vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.03em" }}
          >
            Host tech events
            <br />
            <span className="gtext-anim">end&nbsp;to&nbsp;end.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mb-9"
            style={{ color: "var(--muted)", fontSize: "17px", lineHeight: 1.6, maxWidth: 560 }}
          >
            Beautiful event pages, ticketing, email + calendar invites, auto-reminders, and QR check-in at the door.
            Built for Indian hackathons, dev meetups, and startup demo days.
          </motion.p>

          <motion.div variants={item} className="flex gap-3 justify-center flex-wrap mb-14">
            <Link href={createHref} className="btn-grad" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
              Create your event
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <Link href="#discover" className="btn-outline" style={{ padding: ".85rem 1.6rem", fontSize: "15px" }}>
              Browse events
            </Link>
          </motion.div>

          <motion.div variants={item} className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card-base p-5 text-left">
                <div
                  className="mb-3 inline-flex rounded-lg p-2.5"
                  style={{ background: "rgba(124,92,255,.12)", border: "1px solid rgba(124,92,255,.22)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} strokeWidth={1.9} />
                </div>
                <div className="font-semibold text-[14.5px] mb-0.5">{title}</div>
                <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>{body}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* bottom hairline */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, var(--ring), transparent)" }}
      />
    </section>
  );
}
