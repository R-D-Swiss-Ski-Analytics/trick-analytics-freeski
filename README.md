# Trick Analyses — Snowboard & Freeski

Eine gemeinsame Codebasis für beide Trick-Analyse-Apps. Dieselbe `index.html` wird
auf beide Netlify-Sites deployt; welche Sportart aktiv ist, entscheidet die Domain:

- `trick-analyses-snowboard.netlify.app` → Snowboard
- `trick-analyses-freeski.netlify.app` → Freeski (Default)
- Lokal testen: `index.html?sport=snowboard` bzw. `?sport=freeski`

## Aufbau

Seit dem 22.09.2026 ist die App auf mehrere Dateien verteilt - kein Build-Schritt,
klassische `<script src>`-Tags in fester Reihenfolge:

| Datei | Inhalt |
|---|---|
| `index.html` | nur noch Markup (rund 500 Zeilen) |
| `stil.css` | das gesamte Aussehen |
| `js/config.js` | `SPORT`-Erkennung und `SPORT_CONFIGS`: Supabase-Zugang, Titel, Athleten, Squads, Trick-Nomenklatur - **reine Daten** |
| `js/kern.js` | gemeinsamer Kern: alles, was in beiden Sportarten identisch ist |
| `js/snowboard.js` | `SnowboardModule` - nur, was sich von Freeski unterscheidet |
| `js/freeski.js` | `FreeskiModule` - dito |
| `js/boot.js` | waehlt beim `DOMContentLoaded` das Modul, haengt es ans `window`, fuellt Selects und Fragmente |
| `js/nav.js` | mobile Navigationsleiste |

Die Reihenfolge ist wichtig: `config.js` vor `kern.js` vor den Modulen vor `boot.js`.
Wer eine Datei hinzufuegt, traegt sie in `index.html` **und** in den Sanity-Check
in `.github/workflows/deploy.yml` ein.

`moguls.html` bleibt eine eigenstaendige Einzeldatei.

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
`snowboard.html` im Repo trick-analyses-snowboard). Die alten Staende sind
ueber die Git-Historie bzw. das alte Repo weiterhin abrufbar.

Bis September 2026 lag alles in einer einzigen `index.html` mit 13'255 Zeilen
und einem `<script>`-Block von 12'332 Zeilen. Die Aufteilung hat keine Zeile
Code veraendert, nur verteilt.

## Doppelte Funktionen

Seit dem 23.09.2026 gibt es **keine wortgleiche Funktion mehr**, die in beiden
Modulen doppelt steht. Von urspruenglich 107 gleichnamigen Funktionen (44 davon
wortgleich) sind 63 uebrig - und die unterscheiden sich alle wirklich.

Der Weg dorthin, in dieser Reihenfolge:

1. **Zustand zuerst.** Eine Funktion laesst sich nur verschieben, wenn ihre
   Variablen es auch sind. Wortgleiche Zustandsvariablen wandern mit
   `werkzeuge/zustand_umzug.py` in den Kern; was sich je Sportart unterscheidet,
   gehoert als Daten in `SPORT_CONFIGS` (so geschehen mit `railSuggestions`).
2. **Dann die Funktionen.** `werkzeuge/zusammenfuehren.py` verschiebt nur, was
   zeichengleich ist und keinen modulinternen Namen mehr braucht. Probelauf ohne
   Argumente, Ausfuehrung mit `--schreiben`.

Funktionen, die sich je Sportart unterscheiden, aber vom Kern aufgerufen werden,
stehen in der `return`-Liste des Moduls; `boot.js` haengt sie ans `window`.

## Inline-Styles

Ein Versuch, haeufige `style="..."` durch Klassen zu ersetzen, wurde am
23.09.2026 zurueckgenommen: aus `style="display:none;"` wurde eine Klasse, und
die liess sich durch `el.style.display = ''` nicht mehr aufheben - vier Reiter
blieben unsichtbar. Wer es erneut versucht: `display` auslassen, Elemente mit
`id` oder `cssText`-Zuweisung auslassen, und beim Pruefen das **ganze Dokument**
vergleichen, nicht nur die sichtbare Seite.
