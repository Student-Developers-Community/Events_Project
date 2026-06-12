import "server-only";

export type DescriptionInput = {
  title: string;
  category?: string;
  subtitle?: string;
  venue?: string;
  city?: string;
  isOnline?: boolean;
  startsAt?: string;
};

export type DescriptionResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `You are an expert event marketer for a tech-events platform.
Write an engaging, well-structured event description in plain paragraphs (no markdown headings, no bullet lists, no emojis, no citations or reference markers like [1]).
Aim for 110-190 words across 2-3 short paragraphs.
Be specific and exciting but professional — avoid clichés and hype words like "unleash", "supercharge", "game-changing".
Do NOT invent concrete facts that weren't given (no fake speaker names, prices, schedules, or numbers).
End with a short line encouraging the reader to register.`;

/**
 * Pick the AI provider. Set AI_PROVIDER=perplexity|openai, or just provide one
 * of the API keys (Perplexity wins if both are present and no AI_PROVIDER set).
 * Both use the OpenAI-compatible /chat/completions schema.
 */
function resolveProvider():
  | { url: string; key: string; model: string }
  | { error: string } {
  const explicit = (process.env.AI_PROVIDER || "").toLowerCase();
  const pplx = process.env.PERPLEXITY_API_KEY;
  const openai = process.env.OPENAI_API_KEY;

  const usePplx = explicit === "perplexity" || (!explicit && pplx);
  const useOpenai = explicit === "openai" || (!explicit && !pplx && openai);

  if (usePplx) {
    if (!pplx) return { error: "AI_PROVIDER=perplexity but PERPLEXITY_API_KEY is missing." };
    return { url: "https://api.perplexity.ai/chat/completions", key: pplx, model: process.env.AI_MODEL || "sonar" };
  }
  if (useOpenai) {
    if (!openai) return { error: "AI_PROVIDER=openai but OPENAI_API_KEY is missing." };
    return { url: "https://api.openai.com/v1/chat/completions", key: openai, model: process.env.AI_MODEL || "gpt-4o-mini" };
  }
  return { error: "AI is not configured (set PERPLEXITY_API_KEY or OPENAI_API_KEY)." };
}

/** Generate an event description via the configured AI provider. */
export async function generateEventDescription(input: DescriptionInput): Promise<DescriptionResult> {
  if (!input.title || input.title.trim().length < 3) {
    return { ok: false, error: "Add an event title first, then generate." };
  }
  const p = resolveProvider();
  if ("error" in p) return { ok: false, error: p.error };

  const facts = [
    `Title: ${input.title}`,
    input.subtitle ? `Tagline: ${input.subtitle}` : "",
    input.category ? `Category: ${input.category}` : "",
    input.isOnline ? "Format: Online event" : (input.venue || input.city ? `Location: ${[input.venue, input.city].filter(Boolean).join(", ")}` : ""),
    input.startsAt ? `Date: ${input.startsAt}` : "",
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(p.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify({
        model: p.model,
        temperature: 0.8,
        max_tokens: 450,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Write the description for this event:\n\n${facts}` },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let msg = `AI error (${res.status})`;
      try { const j = JSON.parse(body); if (j?.error?.message) msg = j.error.message; } catch {}
      return { ok: false, error: msg };
    }

    const data = await res.json();
    let text: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
    // Strip any stray citation markers (Perplexity sonar can add them).
    text = text.replace(/\s*\[\d+\]/g, "").trim();
    if (!text) return { ok: false, error: "No description was generated. Try again." };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reach the AI provider." };
  }
}
