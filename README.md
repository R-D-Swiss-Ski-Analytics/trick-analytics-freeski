# Trick Analyses — Snowboard & Freeski

Eine gemeinsame Codebasis für beide Trick-Analyse-Apps. Dieselbe `index.html` wird
auf beide Netlify-Sites deployt; welche Sportart aktiv ist, entscheidet die Domain:

- `trick-analyses-snowboard.netlify.app` → Snowboard
- `trick-analyses-freeski.netlify.app` → Freeski (Default)
- Lokal testen: `index.html?sport=snowboard` bzw. `?sport=freeski`

## Aufbau von index.html

1. **HTML-Skelett** — gemeinsames Markup für alle vier Tabs. Sportartspezifische
   Stellen sind leere Container/Platzhalter, die beim Boot gefüllt werden.
2. **`SPORT_CONFIGS`** — reine Daten pro Sportart: Supabase-URL/-Key, Titel,
   Athleten-Roster, Squads, Trick-Nomenklatur (Richtungen, Achsen, Grabs, …)
   als `selectFill`-Einträge.
3. **Gemeinsamer Kern** — alle Funktionen, die in beiden Apps identisch waren.
4. **`SnowboardModule` / `FreeskiModule`** — die sportartspezifischen Funktionen
   (verbatim aus den ursprünglichen Apps übernommen) plus HTML-Fragmente
   (Grab-Picker, Development-Charts, DB-Rankings, Coach-Felder).
5. **Sport-Boot** (`DOMContentLoaded`) — wählt das aktive Modul, hängt dessen
   Funktionen an `window`, füllt Selects/Fragmente aus der Config.

## Regeln

- **Kein `if (SPORT === …)` ausserhalb von Config, Modulen und Boot.**
  Sportartspezifisches gehört in `SPORT_CONFIGS` (Daten) oder in das jeweilige
  Modul (Verhalten).
- Neue Features zuerst im Kern bauen; nur dort verzweigen, wo sich die
  Sportarten wirklich unterscheiden.
- Beide Sportarten vor dem Push lokal mit `?sport=…` durchklicken —
  ein Push auf `main` deployt **beide** Sites.

## Historie

Bis Juli 2026 waren dies zwei getrennte Dateien (`freeski.html` hier,
`snowboard.html` im Repo trick-analyses-snowboard). Die alten Stände sind
über die Git-Historie bzw. das alte Repo weiterhin abrufbar.
