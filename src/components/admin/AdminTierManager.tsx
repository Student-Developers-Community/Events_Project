"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  adminCreateTierAction, adminUpdateTierAction, adminDeleteTierAction, type AdminResult,
} from "@/lib/admin/actions";

export type AdminTier = {
  id: string;
  name: string;
  price_paise: number;
  capacity: number | null;
  sold_count: number;
  is_active: boolean;
};

const field = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontFamily: "var(--font)",
};

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-grad" style={{ padding: ".5rem 1rem", fontSize: "13px", opacity: pending ? 0.6 : 1 }}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function TierRow({ eventId, tier }: { eventId: string; tier: AdminTier }) {
  const [state, action] = useActionState<AdminResult | undefined, FormData>(adminUpdateTierAction, undefined);
  return (
    <div className="rounded-md p-3" style={{ background: "var(--bg-2)", border: "1px solid var(--border)" }}>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="tier_id" value={tier.id} />
        <input type="hidden" name="event_id" value={eventId} />
        <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <span className="text-[11px]" style={{ color: "var(--dim)" }}>Name</span>
          <input name="name" defaultValue={tier.name} required className="px-2.5 py-1.5 rounded-md text-[13px] outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1 w-[110px]">
          <span className="text-[11px]" style={{ color: "var(--dim)" }}>Price ₹ (0=free)</span>
          <input name="price_rupees" type="number" min="0" step="1" defaultValue={tier.price_paise / 100} required className="px-2.5 py-1.5 rounded-md text-[13px] outline-none" style={field} />
        </label>
        <label className="flex flex-col gap-1 w-[110px]">
          <span className="text-[11px]" style={{ color: "var(--dim)" }}>Capacity</span>
          <input name="capacity" type="number" min="1" defaultValue={tier.capacity ?? ""} placeholder="∞" className="px-2.5 py-1.5 rounded-md text-[13px] outline-none" style={field} />
        </label>
        <label className="flex items-center gap-1.5 text-[12.5px] pb-1.5" style={{ color: "var(--muted)" }}>
          <input type="checkbox" name="is_active" defaultChecked={tier.is_active} className="w-4 h-4" />
          Active
        </label>
        <SaveBtn label="Save" />
      </form>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11.5px]" style={{ color: "var(--dim)" }}>{tier.sold_count} sold</span>
        <div className="flex items-center gap-3">
          {state && !state.ok && <span className="text-[11.5px]" style={{ color: "#fca5a5" }}>{state.error}</span>}
          {state?.ok && <span className="text-[11.5px]" style={{ color: "var(--accent-3)" }}>Saved ✓</span>}
          <form action={adminDeleteTierAction}>
            <input type="hidden" name="tier_id" value={tier.id} />
            <input type="hidden" name="event_id" value={eventId} />
            <button type="submit" className="text-[11.5px]" style={{ color: "#fca5a5" }}>Delete</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddTier({ eventId }: { eventId: string }) {
  const [state, action] = useActionState<AdminResult | undefined, FormData>(adminCreateTierAction, undefined);
  return (
    <form action={action} className="rounded-md p-3 flex flex-wrap items-end gap-3" style={{ background: "var(--bg-2)", border: "1px dashed var(--border-2)" }}>
      <input type="hidden" name="event_id" value={eventId} />
      <label className="flex flex-col gap-1 flex-1 min-w-[140px]">
        <span className="text-[11px]" style={{ color: "var(--dim)" }}>Name</span>
        <input name="name" required placeholder="General" className="px-2.5 py-1.5 rounded-md text-[13px] outline-none" style={field} />
      </label>
      <label className="flex flex-col gap-1 w-[110px]">
        <span className="text-[11px]" style={{ color: "var(--dim)" }}>Price ₹ (0=free)</span>
        <input name="price_rupees" type="number" min="0" step="1" required placeholder="0" className="px-2.5 py-1.5 rounded-md text-[13px] outline-none" style={field} />
      </label>
      <label className="flex flex-col gap-1 w-[110px]">
        <span className="text-[11px]" style={{ color: "var(--dim)" }}>Capacity</span>
        <input name="capacity" type="number" min="1" placeholder="∞" className="px-2.5 py-1.5 rounded-md text-[13px] outline-none" style={field} />
      </label>
      <SaveBtn label="Add tier" />
      {state && !state.ok && <span className="text-[11.5px] w-full" style={{ color: "#fca5a5" }}>{state.error}</span>}
    </form>
  );
}

export default function AdminTierManager({ eventId, tiers }: { eventId: string; tiers: AdminTier[] }) {
  return (
    <div className="flex flex-col gap-3">
      {tiers.map((t) => <TierRow key={t.id} eventId={eventId} tier={t} />)}
      <AddTier eventId={eventId} />
    </div>
  );
}
