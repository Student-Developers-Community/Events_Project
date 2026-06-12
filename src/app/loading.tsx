/**
 * Root loading UI. Because most pages are `force-dynamic` (a server round-trip
 * on every navigation), without a Suspense fallback the browser visually hangs
 * on the previous page until the server responds. This renders instantly on any
 * route transition so a click always gives immediate feedback.
 */
export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "var(--bg)" }}
      aria-label="Loading"
      role="status"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="spinner" />
        <span className="text-[12.5px] tracking-wider uppercase" style={{ color: "var(--dim)" }}>
          Loading…
        </span>
      </div>
    </div>
  );
}
