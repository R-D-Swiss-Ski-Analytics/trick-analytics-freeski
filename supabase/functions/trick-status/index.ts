// Supabase Edge Function «trick-status» — fasst alle Coach-Kommentare zu einem
// Athlet:in+Trick-Paar per Claude zu einem kurzen «Current status» zusammen und
// cached das Ergebnis in der Tabelle trick_status (Konzept «Coaching Analysis», Phase 2).
//
// Secrets (Dashboard → Edge Functions → Secrets): ANTHROPIC_API_KEY
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase automatisch bereit.
// JWT-Verifikation eingeschaltet lassen — nur eingeloggte Coaches dürfen aufrufen.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { athlet, trick } = await req.json();
    if (!athlet || !trick) return json({ error: "athlet/trick fehlen" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: comments, error } = await supabase
      .from("trick_comments")
      .select("datum,kommentar")
      .eq("athlet", athlet)
      .eq("trick", trick)
      .order("datum", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;
    if (!comments?.length) return json({ status_text: null });

    const list = comments.map((c) => `- ${c.datum}: ${c.kommentar}`).join("\n");
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const msg = await anthropic.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 300,
      output_config: { effort: "low" },
      // Server-side fallback: falls ein Sicherheits-Refusal auftritt, routet die API
      // automatisch auf ein passendes Modell statt leer zurückzukommen.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        "You are an assistant coach on the Swiss-Ski freestyle team. Synthesize the " +
        "chronological coach comments about one athlete's trick into a single current " +
        "status: 1–2 sentences, English, most recent state first, older observations " +
        "only if still relevant. No preamble — output only the status text.",
      messages: [{
        role: "user",
        content: `Athlete: ${athlet}\nTrick: ${trick}\nComments (chronological):\n${list}`,
      }],
    });

    if (msg.stop_reason === "refusal") return json({ status_text: null });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    if (!text) return json({ status_text: null });

    const { error: upErr } = await supabase.from("trick_status").upsert({
      athlet,
      trick,
      status_text: text,
      updated_at: new Date().toISOString(),
    });
    if (upErr) throw upErr;

    return json({ status_text: text });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
