// Supabase Edge Function «sync-elite» im Youth-Projekt.
// Übernimmt die Daten der DVLP-Athlet:innen aus den Elite-Apps (Freeski und Snowboard) in die Youth-App.
// Richtung: nur Elite → Youth. Verknüpfung: profiles.elite_name (Name wie in der Elite-App).
//
// Was übernommen wird:
// - Assessment (standort): jeder Trick (pro Grab) als Ziel. Erst mit Video wird er in Youth eingereicht und bewertet.
// - Versuche (tricks): pro Tag und Session-Typ eine Session «aus Elite-App», nur lesbar.
//   Bewertung Freeski (miss / okay / perfect pro Kriterium): perfect = 1 Punkt, okay = ½ Punkt, miss = 0, abgerundet.
//   Alles okay = 2/4. Stomped = Gesamturteil «perfect» der Elite-App (gesamt 10), damit die Zahlen gleich sind wie dort.
//   Als «erfüllt» (Kriterien-Quote) gilt nur perfect.
//   Snowboard (KPI erfüllt / nicht erfüllt) wird direkt übernommen. Die Originalbewertung bleibt in ext_rating erhalten.
//
// Secrets (Dashboard → Edge Functions → Secrets): ELITE_FS_KEY, ELITE_SB_KEY (Secret Keys der Elite-Projekte), SYNC_TOKEN
// Einstellung der Function: «Enforce JWT verification» AUS (Schutz über den Header x-sync-token).

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

type Row = Record<string, any>;
const SPORTS = {
  freeski: { url: "https://nvibrxtqknkmsiccauzs.supabase.co", key: "ELITE_FS_KEY", p: "fs" },
  snowboard: { url: "https://oevjddfliqhtfvutllyf.supabase.co", key: "ELITE_SB_KEY", p: "sb" },
} as const;

const DIR_IN: Record<string, Record<string, string>> = {
  freeski: { "Switch Left": "SL", "Switch Right": "SR", "Left": "L", "Right": "R", "Forward": "F", "Switch": "S" },
  snowboard: { "Switch Frontside": "SL", "Switch Backside": "SR", "Frontside": "L", "Backside": "R", "Forward": "F", "Switch": "S" },
};
const DIRN: Record<string, Record<string, string>> = {
  freeski: { L: "Left", R: "Right", SL: "Switch Left", SR: "Switch Right", F: "Forward", S: "Switch" },
  snowboard: { L: "Frontside", R: "Backside", SL: "Switch Frontside", SR: "Switch Backside", F: "Forward", S: "Switch" },
};
const OFFAX: Record<string, string[]> = {
  freeski: ["Cork", "Bio/Misty", "Flat Spin", "Rodeo"],
  snowboard: ["Cork", "Crippler", "McTwist", "Todeo", "Rodeo", "Infinity Axis", "Underflip"],
};
const NOROT: Record<string, string[]> = {
  freeski: ["Zero Spin", "Frontflip", "Backflip", "Sideflip"],
  snowboard: ["Straight Air", "Backroll", "Frontroll", "Wildcat", "Tamedog"],
};
const AXES = ["Upright Spins", "Upright", "Bio/Misty", "Flat Spin", "Infinity Axis", "Cork", "Rodeo", "Crippler", "McTwist", "Todeo", "Underflip"];
const TAKEOFFS = ["Inside Edge", "Hand-Drag", "Carved", "Blender", "Nosebutter", "Tailbutter", "N'Ollie", "Noseslide", "Tailslide", "Hardway"];
const FLIPS: Record<string, number> = { Single: 1, Double: 2, Triple: 3, Quad: 4 };
const TYPES = ["Landing Bag", "Big Air Training", "Big Air Competition", "Slopestyle Training", "Slopestyle Competition", "Halfpipe Training", "Halfpipe Competition"];
const GRAB_FIX: Record<string, string> = { "Weddle (Mute)": "Mute", "Truck Driver": "Truckdriver" };

// Vergleich unabhängig von der Reihenfolge der Felder (jsonb sortiert sie um)
const same = (o: Row) => JSON.stringify(Object.keys(o ?? {}).sort().map((k) => [k, o[k]]));
const clean = (v: any) => (v === null || v === undefined || v === "" || v === "None" ? null : String(v).trim());
const grabName = (g: string | null) => (g ? GRAB_FIX[g] ?? g : "");

// Trick-Objekt wie in der Youth-App (Jump)
function jumpTrick(sport: string, f: { dir?: string | null; flips?: string | number | null; axis?: string | null; rot?: string | number | null; takeoff?: string | null; grab?: string | null; bringback?: string | null }) {
  let axis = clean(f.axis) ?? "Upright";
  if (axis === "Upright Spins") axis = "Upright";
  const flips = typeof f.flips === "number" ? f.flips : FLIPS[clean(f.flips) ?? ""] ?? null;
  const rot = clean(f.rot) ? Number(f.rot) : null;
  const t: Row = { dir: DIR_IN[sport][clean(f.dir) ?? ""] ?? "F", axis, rot, grab: grabName(clean(f.grab)), flips: OFFAX[sport].includes(axis) ? (flips ?? 1) : (flips && flips >= 2 ? flips : null), takeoff: clean(f.takeoff) ?? "" };
  if (clean(f.bringback)) t.bringback = clean(f.bringback);
  return t;
}
function jumpLabel(sport: string, t: Row) {
  const extra = (t.bringback ? " · Bring Back " + t.bringback : "") + (t.takeoff ? ` · ${t.takeoff}` : "");
  if (NOROT[sport].includes(t.axis)) return [t.dir === "S" ? "Switch" : "", t.axis, t.grab].filter(Boolean).join(" ") + extra;
  const fl = +t.flips >= 2 ? ({ 2: "Double", 3: "Triple", 4: "Quad" } as Record<number, string>)[t.flips] : "";
  const ax = t.axis && t.axis !== "Upright" ? (t.axis === "Flat Spin" ? "Flat" : t.axis) : "";
  return [DIRN[sport][t.dir], fl, ax, t.rot, t.grab].filter(Boolean).join(" ") + extra;
}
// «Inside Edge Switch Left Double 1260 Bio/Misty Bringback 180 — Safety» → Felder
function parseAufbau(sport: string, s: string) {
  let [main, grab] = String(s || "").split(/\s+—\s+/);
  main = ` ${main} `;
  const take = (re: RegExp) => { const m = main.match(re); if (m) main = main.replace(m[0], " "); return m; };
  const to = TAKEOFFS.find((x) => main.startsWith(` ${x} `)); if (to) main = main.replace(` ${to} `, " ");
  const bb = take(/ Bring ?back (\d+) /i);
  const dir = Object.keys(DIR_IN[sport]).find((d) => main.includes(` ${d} `)); if (dir) main = main.replace(` ${dir} `, " ");
  const fl = take(/ (Single|Double|Triple|Quad) /);
  const rot = take(/ (\d{3,4}) /);
  const ax = [...AXES, ...NOROT[sport]].find((a) => main.includes(` ${a} `));
  return { dir, flips: fl?.[1] ?? null, axis: ax ?? null, rot: rot?.[1] ?? null, takeoff: to ?? null, grab: grab ?? null, bringback: bb?.[1] ?? null };
}

// Bewertung eines Versuchs → Youth (crit / outcome) + Original
function rating(sport: string, r: Row, disc: string) {
  const ext = { kommentar: r.kommentar ?? null, gesamt: r.gesamt ?? null, gelandet: r.gelandet ?? null, outcome: r.outcome ?? null, kpis: r.kpis ?? null, sterne: r.sterne ?? null, fail: r.fail_grund ?? null };
  const fell = r.outcome ? r.outcome === "failed" : r.gelandet === "No";
  const max = disc === "Halfpipe" ? 5 : 4;
  let note: string | null = null;
  if (fell) {
    const tags = r.fail_grund ? `Tags: ${r.fail_grund}` : /^Tags:/.test(r.kommentar ?? "") ? r.kommentar : null;
    return { crit: null, score: 0, max, fell: true, outcome: "failed", note: tags, ext };
  }
  let crit: Row | null = null, pts: number | null = null;
  if (disc !== "Rail") {
    if (sport === "snowboard" && r.kpis) {
      const k = r.kpis;
      crit = { takeoff: !!k.axis, trick: !!k.control, grab: !!k.grab, landing: !!k.quality_landing };
      if (disc === "Halfpipe") crit.amplitude = !!k.amplitude;
    } else if (sport === "freeski") {
      const K: Row = {}; for (const [, c, v] of String(r.kommentar ?? "").matchAll(/(Takeoff|Trick|Grab|Landing|Amplitude):(\w+)/g)) K[c] = v;
      if (Object.keys(K).length) {
        // fehlende Kategorie: wie Gesamturteil (10 = perfect, 7 = okay, 3 = miss)
        const lvl = (c: string) => K[c] ?? (+r.gesamt >= 10 ? "perfect" : +r.gesamt >= 7 ? "okay" : "miss");
        const cats = disc === "Halfpipe" ? ["Takeoff", "Trick", "Grab", "Landing", "Amplitude"] : ["Takeoff", "Trick", "Grab", "Landing"];
        const keys: Record<string, string> = { Takeoff: "takeoff", Trick: "trick", Grab: "grab", Landing: "landing", Amplitude: "amplitude" };
        crit = Object.fromEntries(cats.map((c) => [keys[c], lvl(c) === "perfect"]));
        pts = +r.gesamt >= 10 ? cats.length : Math.min(cats.length - 1, Math.floor(cats.reduce((n, c) => n + (lvl(c) === "perfect" ? 1 : lvl(c) === "okay" ? 0.5 : 0), 0)));
      }
    }
  }
  if (!/^(Takeoff|Trick|Grab|Landing|Tags):/.test(r.kommentar ?? "") && clean(r.kommentar)) note = r.kommentar;
  if (crit) { const score = pts ?? Object.values(crit).filter(Boolean).length; return { crit, score, max, fell: false, outcome: null, note, ext }; }
  const stomped = r.outcome ? r.outcome === "stomped" : +r.gesamt >= 10;
  return { crit: null, score: null, max, fell: false, outcome: stomped ? "stomped" : "landed", note, ext };
}

async function all(db: SupabaseClient, table: string, build: (q: any) => any) {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(db.from(table).select("*")).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function syncSport(youth: SupabaseClient, sport: keyof typeof SPORTS) {
  const cfg = SPORTS[sport];
  const key = Deno.env.get(cfg.key);
  if (!key) return { sport, skipped: "no key" };
  const elite = createClient(cfg.url, key, { auth: { persistSession: false } });
  const { data: profs, error: pe } = await youth.from("profiles").select("id,elite_name").eq("sport", sport).not("elite_name", "is", null);
  if (pe) throw pe;
  const byName = new Map((profs ?? []).map((p) => [p.elite_name.trim(), p.id]));
  const names = [...byName.keys()];
  const ids = [...byName.values()];
  const res: Row = { sport, athletes: names.length };
  if (!names.length) return res;

  // ---------- Assessment → Ziele ----------
  const st = await all(elite, "standort", (q) => q.in("athlet", names));
  const want = new Map<string, Row>();
  for (const r of st) {
    const athlete_id = byName.get(r.athlet); if (!athlete_id) continue;
    const disc = r.disziplin === "Rail" ? "Rail" : r.disziplin === "Halfpipe" ? "Halfpipe" : "Jump";
    const grabs = String(r.grab ?? "").split(",").map((g) => g.trim()).filter(Boolean);
    for (const g of grabs.length ? grabs : [""]) {
      let trick: Row, label: string;
      if (disc === "Jump") {
        trick = jumpTrick(sport, { dir: r.drehrichtung, flips: r.flips, axis: r.achse, rot: r.rotation, takeoff: r.absprung, grab: g, bringback: r.bringback });
        label = jumpLabel(sport, trick);
      } else if (disc === "Rail") {
        trick = { railType: clean(r.railart) ?? "", slideform: clean(r.slideform) ?? "", variant: clean(r.slidevar) ?? "", inspin: clean(r.inspin) ?? "", outspin: clean(r.outspin) ?? "", swap: clean(r.swap) ?? "" };
        label = r.trick_label || "Rail";
      } else {
        const t = jumpTrick(sport, { dir: r.drehrichtung, flips: r.flips, axis: r.achse, rot: r.rotation, grab: g });
        trick = { kind: "air", dir: t.dir === "SL" || t.dir === "SR" ? t.dir.slice(1) : t.dir, sw: /^S[LR]$/.test(t.dir), ao: false, axis: t.axis, flips: t.flips, rot: t.rot, grab: t.grab };
        label = [r.trick_label, g].filter(Boolean).join(" ");
      }
      const gs = g ? (r.grab_status ?? {})[g] : r.status;
      trick.elite_status = gs === "mastered" || (!g && r.status === "mastered") ? "mastered" : "goal";
      want.set(`${cfg.p}:st:${r.id}:${g}`, { athlete_id, discipline: disc, trick, label, status: "goal", source: "elite", ext_id: `${cfg.p}:st:${r.id}:${g}`, created_at: r.created_at });
    }
  }
  const have = await all(youth, "entries", (q) => q.eq("source", "elite").in("athlete_id", ids));
  const haveBy = new Map(have.map((e) => [e.ext_id, e]));
  const ins: Row[] = [], upd: Row[] = [], del: string[] = [];
  for (const [k, w] of want) {
    const h = haveBy.get(k);
    if (!h) ins.push(w);
    else if (h.status === "goal" && !h.video_path && (h.label !== w.label || h.discipline !== w.discipline || same(h.trick) !== same(w.trick))) upd.push({ id: h.id, trick: w.trick, label: w.label, discipline: w.discipline });
  }
  for (const h of have) if (!want.has(h.ext_id) && h.status === "goal" && !h.video_path) del.push(h.id);
  if (ins.length) { const { error } = await youth.from("entries").insert(ins); if (error) throw error; }
  for (const u of upd) { const { error } = await youth.from("entries").update(u).eq("id", u.id); if (error) throw error; }
  if (del.length) { const { error } = await youth.from("entries").delete().in("id", del); if (error) throw error; }
  Object.assign(res, { goals_new: ins.length, goals_updated: upd.length, goals_removed: del.length });

  // ---------- Versuche → Sessions pro Tag und Typ ----------
  const tr = await all(elite, "tricks", (q) => q.in("athlet", names));
  const reports = await all(elite, "session_reports", (q) => q);
  const days = new Map<string, Row[]>();
  for (const r of tr) {
    if (!byName.get(r.athlet)) continue;
    const typ = TYPES.includes(r.typ) ? r.typ : r.typ === "Training" ? "Big Air Training" : "Landing Bag";
    const k = `${r.datum}|${typ}`;
    (days.get(k) ?? days.set(k, []).get(k)!).push({ ...r, _typ: typ, _elite_typ: r.typ });
  }
  const sessRows: Row[] = [];
  for (const [k, rows] of days) {
    const [date, type] = k.split("|");
    const rep = reports.find((p) => p.datum === date && (p.session_type === type || p.session_type === rows[0]._elite_typ));
    const times = rows.map((r) => r.created_at).sort();
    sessRows.push({
      ext_id: `${cfg.p}:day:${k}`, source: "elite", sport, date, type, group_id: null, created_by: null,
      athlete_ids: [...new Set(rows.map((r) => byName.get(r.athlet)))],
      location: rep?.location ?? null, duration_min: rep?.duration_min ?? null, conditions: rep?.conditions ?? null, comments: rep?.comments || null,
      athlete_notes: {}, started_at: times[0], ended_at: times[times.length - 1],
    });
  }
  const sessId = new Map<string, string>();
  for (let i = 0; i < sessRows.length; i += 200) {
    const { data, error } = await youth.from("sessions").upsert(sessRows.slice(i, i + 200), { onConflict: "ext_id" }).select("id,ext_id");
    if (error) throw error;
    for (const s of data ?? []) sessId.set(s.ext_id, s.id);
  }
  const attRows: Row[] = [];
  for (const [k, rows] of days) for (const r of rows) {
    const disc = r.disziplin === "Rail" ? "Rail" : r.disziplin === "Halfpipe" ? "Halfpipe" : "Jump";
    let trick: Row, label: string;
    if (disc === "Jump") {
      const f = r.drehrichtung ? { dir: r.drehrichtung, flips: r.flips, axis: r.achse, rot: r.rotation, takeoff: r.absprung, grab: String(r.grab ?? "").split(",")[0], bringback: r.bringback } : parseAufbau(sport, r.trickaufbau);
      trick = jumpTrick(sport, f); label = jumpLabel(sport, trick);
    } else { trick = { railType: clean(r.railart) ?? "", slideform: r.trickaufbau ?? "" }; label = r.trickaufbau || disc; }
    const rt = rating(sport, r, disc);
    attRows.push({
      ext_id: `${cfg.p}:tr:${r.id}`, source: "elite", session_id: sessId.get(`${cfg.p}:day:${k}`), athlete_id: byName.get(r.athlet),
      discipline: disc, trick, label, crit: rt.crit, score: rt.score, max: rt.max, fell: rt.fell, outcome: rt.outcome, note: rt.note,
      ext_rating: rt.ext, created_by: null, created_at: r.created_at,
    });
  }
  for (let i = 0; i < attRows.length; i += 300) {
    const { error } = await youth.from("attempts").upsert(attRows.slice(i, i + 300), { onConflict: "ext_id" });
    if (error) throw error;
  }
  // Gelöschte Elite-Daten auch in Youth entfernen
  const wantAtt = new Set(attRows.map((a) => a.ext_id)), wantSess = new Set(sessRows.map((s) => s.ext_id));
  const oldAtt = (await all(youth, "attempts", (q) => q.eq("source", "elite").like("ext_id", `${cfg.p}:%`))).filter((a) => !wantAtt.has(a.ext_id)).map((a) => a.id);
  for (let i = 0; i < oldAtt.length; i += 200) await youth.from("attempts").delete().in("id", oldAtt.slice(i, i + 200));
  const oldSess = (await all(youth, "sessions", (q) => q.eq("source", "elite").eq("sport", sport))).filter((s) => !wantSess.has(s.ext_id)).map((s) => s.id);
  for (let i = 0; i < oldSess.length; i += 200) { await youth.from("attempts").delete().in("session_id", oldSess.slice(i, i + 200)); await youth.from("sessions").delete().in("id", oldSess.slice(i, i + 200)); }
  Object.assign(res, { sessions: sessRows.length, attempts: attRows.length, attempts_removed: oldAtt.length, sessions_removed: oldSess.length });
  return res;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-sync-token") !== Deno.env.get("SYNC_TOKEN")) return new Response("forbidden", { status: 403 });
  try {
    const youth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const out = [];
    for (const s of Object.keys(SPORTS) as (keyof typeof SPORTS)[]) out.push(await syncSport(youth, s));
    return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500 });
  }
});
