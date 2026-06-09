"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { checkInAction, type CheckinResult } from "@/lib/checkin/actions";

type Props = {
  eventId: string;
  /** Initial stats so the page paints without a flash */
  initialConfirmed: number;
  initialCheckedIn: number;
};

const SCANNER_ELEMENT_ID = "qr-scanner-region";

export default function QrScanner({ eventId, initialConfirmed, initialCheckedIn }: Props) {
  const [pending, start]   = useTransition();
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [confirmed]               = useState(initialConfirmed);
  const [scanning, setScanning]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);

  // Init the scanner on mount
  useEffect(() => {
    let canceled = false;
    const html5 = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    scannerRef.current = html5;

    html5
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          if (canceled) return;
          const token = extractToken(decoded);
          if (!token) return;

          // Debounce: ignore the same token within 2s (camera fires many times)
          const now = Date.now();
          const last = lastScanRef.current;
          if (last && last.token === token && now - last.at < 2000) return;
          lastScanRef.current = { token, at: now };

          start(async () => {
            const r = await checkInAction(eventId, token);
            setResult(r);
            if (r.ok) setCheckedIn((c) => c + 1);
          });
        },
        () => { /* scan misses are noisy — swallow */ },
      )
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Couldn't open the camera: ${msg}`);
        setScanning(false);
      });

    return () => {
      canceled = true;
      const inst = scannerRef.current;
      if (!inst) return;
      try {
        // html5-qrcode's stop() can throw or return undefined if it never
        // fully started — guard everything so unmount never crashes.
        const maybe = inst.isScanning ? inst.stop() : undefined;
        if (maybe && typeof maybe.then === "function") {
          maybe.then(() => inst.clear()).catch(() => {});
        } else {
          try { inst.clear(); } catch { /* ignore */ }
        }
      } catch { /* ignore cleanup errors */ }
    };
  }, [eventId, start]);

  const ratio = confirmed > 0 ? Math.round((checkedIn / confirmed) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Stats bar */}
      <div className="card-base p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--dim)" }}>
            Checked in
          </p>
          <p className="font-extrabold text-2xl">
            {checkedIn} <span className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>/ {confirmed}</span>
          </p>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div
            className="h-2 rounded-full overflow-hidden mb-1"
            style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}
          >
            <div
              className="h-full transition-all"
              style={{ width: `${ratio}%`, background: "var(--grad)" }}
            />
          </div>
          <p className="text-[11px]" style={{ color: "var(--dim)" }}>{ratio}% of confirmed attendees</p>
        </div>
      </div>

      {/* Camera region */}
      <div className="card-base overflow-hidden" style={{ padding: 0 }}>
        <div
          id={SCANNER_ELEMENT_ID}
          style={{
            width: "100%",
            minHeight: 320,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
        {!scanning && (
          <div className="p-5 text-center text-[13px]" style={{ color: "var(--muted)" }}>
            {error ?? "Scanner stopped."}
          </div>
        )}
      </div>

      {/* Last scan result */}
      <div
        key={result?.state ?? "empty"}
        className="card-base p-5 transition-opacity"
        style={{
          background: resultBg(result),
          border: `1px solid ${resultBorder(result)}`,
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending && !result && (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>Checking…</p>
        )}
        {!result && !pending && (
          <p className="text-[13px]" style={{ color: "var(--muted)" }}>
            Point the camera at an attendee&apos;s QR. Results appear here.
          </p>
        )}
        {result && <ResultCard result={result} />}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: CheckinResult }) {
  if (result.state === "checked_in") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">✅</span>
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "var(--accent)" }}>
            Checked in
          </span>
        </div>
        <p className="font-bold text-xl mb-1">{result.attendee_name}</p>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          {result.tier_name}{result.team_name ? ` · Team: ${result.team_name}` : ""}
        </p>
      </div>
    );
  }
  if (result.state === "already_in") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⚠️</span>
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#fbbf24" }}>
            Already checked in
          </span>
        </div>
        <p className="font-bold text-lg mb-1">{result.attendee_name}</p>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Entered at {result.checked_in_at ? new Date(result.checked_in_at).toLocaleString() : "earlier"}
        </p>
      </div>
    );
  }
  if (result.state === "not_confirmed") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">⏳</span>
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#fbbf24" }}>
            Not confirmed
          </span>
        </div>
        <p className="font-bold text-lg mb-1">{result.attendee_name}</p>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>
          Status: {result.status}. Payment may still be pending.
        </p>
      </div>
    );
  }
  if (result.state === "wrong_event") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">↪️</span>
          <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#fbbf24" }}>
            Different event
          </span>
        </div>
        <p className="text-[13px]" style={{ color: "var(--muted)" }}>{result.message}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">❌</span>
        <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#fca5a5" }}>
          {result.state === "not_found" ? "Invalid QR" : "Failed"}
        </span>
      </div>
      <p className="text-[13px]" style={{ color: "var(--muted)" }}>{result.message}</p>
    </div>
  );
}

function resultBg(r: CheckinResult | null): string {
  if (!r) return "var(--card)";
  if (r.ok) return "rgba(0,255,157,0.06)";
  if (r.state === "already_in" || r.state === "not_confirmed" || r.state === "wrong_event") return "rgba(251,191,36,0.06)";
  return "rgba(239,68,68,0.06)";
}
function resultBorder(r: CheckinResult | null): string {
  if (!r) return "var(--border)";
  if (r.ok) return "rgba(0,255,157,0.3)";
  if (r.state === "already_in" || r.state === "not_confirmed" || r.state === "wrong_event") return "rgba(251,191,36,0.3)";
  return "rgba(239,68,68,0.3)";
}

/**
 * Extract a QR token from the decoded string. Supports:
 *   · Full verify URL: `https://app/api/qr/verify/<token>`
 *   · A raw token (paste-tested)
 */
function extractToken(decoded: string): string | null {
  try {
    const url = new URL(decoded);
    const segments = url.pathname.split("/").filter(Boolean);
    const idx = segments.indexOf("verify");
    if (idx >= 0 && segments[idx + 1]) return decodeURIComponent(segments[idx + 1]);
  } catch {
    // not a URL — treat as raw token
  }
  // Raw token format: base64url-ish, 24+ chars
  if (/^[A-Za-z0-9_-]{20,}$/.test(decoded)) return decoded;
  return null;
}
