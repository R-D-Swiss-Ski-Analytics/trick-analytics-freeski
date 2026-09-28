// Supabase Edge Function «trick-status» für die Youth-App (Projekt «Trick Analyses Youth»).
// Fasst alle Coach-Kommentare zu einem Athlet:in+Trick-Paar per Claude zu einem kurzen
// «Current status» zusammen und cached das Ergebnis in trick_status.
// Im Dashboard als Function mit dem Namen «trick-status» anlegen (Code hierher kopieren).
//
// Secrets (Dashboard → Edge Functions → Secrets): ANTHROPIC_API_KEY
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.
// JWT-Verifikation eingeschaltet lassen — nur eingeloggte Coaches/DVLP dürfen aufrufen.

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
    const { athlete_id, trick_key, lang } = await req.json();
    // Sprache der App (de/fr/it/en) — pro Sprache ein eigener Cache-Eintrag «<trick_key>@<lang>»
    const LANG_NAMES: Record<string, string> = { de: "German (Swiss standard German, use «ss» instead of «ß»)", fr: "French", it: "Italian", en: "English" };
    const l = LANG_NAMES[lang] ? lang : "en";
    if (!athlete_id || !trick_key) return json({ error: "athlete_id/trick_key fehlen" }, 400);

    // Lesen mit den Rechten der aufrufenden Person (RLS) — sieht nur, wer den Trick sehen darf.
    const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: comments, error } = await asUser
      .from("trick_comments")
      .select("created_at,comment")
      .eq("athlete_id", athlete_id)
      .eq("trick_key", trick_key)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!comments?.length) return json({ status_text: null });

    const trick = trick_key.split("|").slice(1).join("|") || trick_key;
    const list = comments.map((c) => `- ${String(c.created_at).slice(0, 10)}: ${c.comment}`).join("\n");
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const msg = await anthropic.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 1000,
      output_config: { effort: "low" },
      // Server-side fallback: bei einem Sicherheits-Refusal routet die API automatisch
      // auf ein passendes Modell statt leer zurückzukommen.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system:
        "You are an assistant coach on the Swiss-Ski freestyle youth team. Synthesize the " +
        "chronological coach comments about one athlete's trick into a single current " +
        `status: 1–2 sentences in ${LANG_NAMES[l]}, most recent state first, older observations ` +
        "only if still relevant. Keep freestyle sport terms (trick names, grabs, axis, take-off, " +
        "landing, stomped/landed/failed) in English. No preamble — output only the status text.",
      messages: [{
        role: "user",
        content: `Trick: ${trick}\nComments (chronological):\n${list}`,
      }],
    });

    if (msg.stop_reason === "refusal") return json({ status_text: null });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    if (!text) return json({ status_text: null });

    // Schreiben nur mit Service-Rolle (trick_status hat keine Schreib-Policy für Nutzer).
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: upErr } = await admin.from("trick_status").upsert({
      athlete_id,
      trick_key: `${trick_key}@${l}`,
      status_text: text,
      updated_at: new Date().toISOString(),
    });
    if (upErr) throw upErr;

    return json({ status_text: text });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
