"use client";

import { useState, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Cover-image uploader. Uploads to the public `event-covers` bucket under
 * the user's own folder (event-covers/<uid>/<file>), then writes the public
 * URL into a hidden input named `cover_image_url` so it submits with the form.
 */
export default function ImageUpload({ name = "cover_image_url", defaultUrl = "" }: { name?: string; defaultUrl?: string }) {
  const [url, setUrl] = useState<string>(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB."); return; }

    const sb = getSupabaseBrowserClient();
    if (!sb) { setError("Storage not configured."); return; }

    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setError("Please sign in again."); return; }

    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await sb.storage
      .from("event-covers")
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (upErr) { setError(upErr.message); setBusy(false); return; }

    const { data } = sb.storage.from("event-covers").getPublicUrl(path);
    setUrl(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="relative rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Cover preview" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
          <button
            type="button"
            onClick={() => { setUrl(""); if (inputRef.current) inputRef.current.value = ""; }}
            className="absolute top-2 right-2 px-2 py-1 rounded text-[11px] font-semibold"
            style={{ background: "rgba(0,0,0,.7)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)" }}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center justify-center gap-1.5 rounded-md py-7 transition-colors"
          style={{
            background: "var(--bg-2)",
            border: "1px dashed var(--border-2)",
            color: "var(--muted)",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <span className="text-2xl opacity-70">{busy ? "⏳" : "🖼️"}</span>
          <span className="text-[13px]">{busy ? "Uploading…" : "Click to upload cover image"}</span>
          <span className="text-[11px]" style={{ color: "var(--dim)" }}>PNG / JPG / WebP · up to 5 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {error && (
        <p className="text-[12px]" style={{ color: "#fca5a5" }}>{error}</p>
      )}
    </div>
  );
}
