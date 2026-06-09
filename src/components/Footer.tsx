export default function Footer() {
  return (
    <footer
      className="mt-16 py-10 text-center"
      style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
    >
      <div className="mx-auto max-w-[1100px] px-7">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black"
            style={{ background: "var(--grad)", color: "#001a10" }}
          >
            TE
          </div>
          <span className="font-bold text-[13.5px]" style={{ color: "var(--text)" }}>
            TechEvent
          </span>
        </div>
        <p className="text-[13px]">
          © 2026 TechEvent · A Luma-inspired events platform for the Indian tech ecosystem.
        </p>
      </div>
    </footer>
  );
}
