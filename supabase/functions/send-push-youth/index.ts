// Supabase Edge Function «send-push» für die Youth-App (Projekt «Trick Analyses Youth»).
// Wird vom Database Webhook bei jedem neuen Eintrag in public.notifications aufgerufen und
// schickt die Nachricht als Push an alle Geräte der betroffenen Person.
// Im Dashboard als Function mit dem Namen «send-push» anlegen (Code hierher kopieren).
//
// Secrets (Dashboard → Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY stellt Supabase bereit.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

type Lang = "de" | "fr" | "it" | "en";
// Kudos-Text «Art|Trick|Nachricht» → [Titel, Text]
const kudos = (x: string, K: Record<string, string>, who: string): [string, string] => {
  const [k, label, msg] = x.split("|");
  return [`${K[k] ?? K.well_done} ${who}`, [label, msg ? `«${msg}»` : ""].filter(Boolean).join(": ")];
};
// Texte pro Art und Sprache; Trick-Namen bleiben Englisch
const T: Record<string, Record<Lang, (x: string) => [string, string]>> = {
  submitted: {
    de: (x) => ["Neuer Trick eingereicht", x], fr: (x) => ["Nouveau trick envoyé", x],
    it: (x) => ["Nuovo trick inviato", x], en: (x) => ["New trick submitted", x],
  },
  reviewed: {
    de: (x) => ["Dein Trick wurde bewertet", x.replace(/^Rated /, "")], fr: (x) => ["Ton trick a été évalué", x.replace(/^Rated /, "")],
    it: (x) => ["Il tuo trick è stato valutato", x.replace(/^Rated /, "")], en: (x) => ["Your trick was rated", x.replace(/^Rated /, "")],
  },
  rework: {
    de: (x) => ["Neues Video gewünscht", x.replace(/^New video requested: /, "")], fr: (x) => ["Nouvelle vidéo demandée", x.replace(/^New video requested: /, "")],
    it: (x) => ["Nuovo video richiesto", x.replace(/^New video requested: /, "")], en: (x) => ["New video requested", x.replace(/^New video requested: /, "")],
  },
  cleanup: {
    de: () => ["Video-Aufräumen", "Ab heute kannst du im Tab «Selektion» die nicht mehr verlangten Videos löschen."],
    fr: () => ["Nettoyage des vidéos", "Dès aujourd’hui, tu peux supprimer les vidéos qui ne sont plus exigées dans l’onglet «Sélection»."],
    it: () => ["Pulizia video", "Da oggi puoi eliminare i video non più richiesti nella scheda «Selezione»."],
    en: () => ["Video clean-up", "From today you can delete videos that are no longer required in the «Selection» tab."],
  },
  kudos: {
    de: (x) => kudos(x, { well_done: "Stark!", progress: "Riesen-Fortschritt!", style: "Toller Style!" }, "Kudos von deinem Coach"),
    fr: (x) => kudos(x, { well_done: "Bravo !", progress: "Énorme progrès !", style: "Super style !" }, "Ton coach te félicite"),
    it: (x) => kudos(x, { well_done: "Grande!", progress: "Enorme progresso!", style: "Stile fantastico!" }, "Complimenti dal tuo coach"),
    en: (x) => kudos(x, { well_done: "Well done!", progress: "Huge progress!", style: "Great style!" }, "Kudos from your coach"),
  },
  review: {
    de: () => ["Dein Saison-Rückblick ist da", "Schau, was du diese Saison erreicht hast."], fr: () => ["Ton bilan de saison est là", "Découvre ce que tu as accompli cette saison."],
    it: () => ["Il tuo riepilogo della stagione è pronto", "Guarda cosa hai raggiunto questa stagione."], en: () => ["Your season review is here", "See what you achieved this season."],
  },
  reminder: {
    de: (x) => ["Selektions-Stichtag 30. April", `Noch ${x} ${x === "1" ? "Tag" : "Tage"}: lade deine Tricks mit Video hoch.`],
    fr: (x) => ["Date limite de sélection : 30 avril", `Encore ${x} jour${x === "1" ? "" : "s"} : télécharge tes tricks avec vidéo.`],
    it: (x) => ["Scadenza selezione: 30 aprile", `Ancora ${x} giorn${x === "1" ? "o" : "i"}: carica i tuoi trick con video.`],
    en: (x) => ["Selection deadline 30 April", `${x} day${x === "1" ? "" : "s"} left: upload your tricks with video.`],
  },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const n = body.record ?? body;   // Database Webhook: {type, table, record}
    if (!n?.user_id) return new Response("no user", { status: 200 });

    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "https://trick-analyses-youth.netlify.app", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: subs, error } = await admin.from("push_subscriptions").select("*").eq("profile_id", n.user_id);
    if (error) throw error;

    let sent = 0;
    for (const s of subs ?? []) {
      const lang = (["de", "fr", "it", "en"].includes(s.lang) ? s.lang : "de") as Lang;
      const arg = n.kind === "reminder" ? String(n.text).replace(/^deadline:/, "") : String(n.text);
      const [title, text] = (T[n.kind]?.[lang] ?? ((x: string) => ["Trick Analyses Youth", x]))(arg);
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body: text, tag: n.entry_id ?? n.kind, url: "./" }));
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);   // Abo abgelaufen
        else console.error("push failed", code, (e as Error).message);
      }
    }
    return new Response(JSON.stringify({ sent }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500 });
  }
});
