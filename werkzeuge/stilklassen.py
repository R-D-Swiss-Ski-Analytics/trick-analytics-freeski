"""Ersetzt haeufige Inline-Styles durch benannte CSS-Klassen.

Nur exakt gleiche, statische Style-Werte werden ersetzt. Aussen vor bleiben:
  - alles mit ${...}
  - alles mit display (das schaltet der Code per el.style.display = '' um;
    eine Klasse laesst sich so nicht aufheben - genau daran ist der erste
    Versuch am 23.09.2026 gescheitert)
  - Elemente mit id (die holt sich der Code und veraendert ihren Stil)

Das Ergebnis ist optisch identisch, weil die Klasse dieselben Deklarationen
enthaelt. Zu pruefen ist es ueber das ganze Dokument, nicht nur die sichtbare
Seite - versteckte Bereiche und die Navigation gehoeren dazu.

Probelauf:   python3 stilklassen.py <ordner>
Ausfuehren:  python3 stilklassen.py <ordner> --schreiben
"""
import os
import re
import sys

ORDNER = sys.argv[1] if len(sys.argv) > 1 else '.'
SCHREIBEN = '--schreiben' in sys.argv

DATEIEN = ['index.html'] + ['js/%s.js' % n for n in
                            ('kern', 'snowboard', 'freeski', 'config', 'boot', 'nav')]

# Handverlesen: Name → Deklarationen. Die Reihenfolge entscheidet nichts,
# jede Klasse ersetzt nur ihren exakt gleichen Inline-Wert.
KLASSEN = [
    # Farben mit Bedeutung
    ('gut',            'color:#34d399;'),
    ('schlecht',       'color:#e2001a;'),
    ('warnung',        'color:#f59e0b;'),
    ('akzent',         'color:#39c3d4;'),
    ('gedaempft',      'color:var(--muted);'),
    ('haupttext',      'color:var(--text);'),
    # Textgroessen, gedaempft
    ('hinweis',        'font-size:11px;color:var(--muted);'),
    ('hinweis-klein',  'font-size:10px;color:var(--muted);'),
    ('hinweis-winzig', 'font-size:9px;color:var(--muted);'),
    ('hinweis-gross',  'font-size:12px;color:var(--muted);'),
    ('gedaempft-10',   'color:var(--muted);font-size:10px;'),
    ('gedaempft-11',   'color:var(--muted);font-size:11px;'),
    ('gedaempft-12',   'color:var(--muted);font-size:12px;'),
    ('hinweis-block',  'font-size:11px;color:var(--muted);margin-bottom:14px;'),
    # Ueberschriften kleiner Abschnitte
    ('feldtitel',      'font-size:10px;color:var(--muted);text-transform:uppercase;'
                       'letter-spacing:.5px;font-weight:600;'),
    ('wert-mittel',    'font-size:13px;font-weight:600;color:var(--text);'),
    ('wert-gross',     'font-size:16px;font-weight:800;color:var(--text);'),
    # Layout  (display bleibt bewusst aussen vor: das schaltet der Code selbst um)
    ('reihe',          'display:flex;align-items:center;gap:6px;'),
    ('reihe-8',        'display:flex;gap:8px;'),
    ('reihe-verteilt', 'display:flex;justify-content:space-between;'),
    ('reihe-kopf',     'display:flex;justify-content:space-between;align-items:center;'
                       'margin-bottom:16px;'),
    ('abstand-12',     'margin-bottom:12px;'),
    ('abstand-16',     'margin-bottom:16px;'),
    ('abstand-20',     'margin-bottom:20px;'),
    ('polster-20',     'padding:20px;'),
    # Leerzustaende
    ('leer',           'color:var(--muted);text-align:center;padding:24px;'),
    ('leer-schmal',    'color:var(--muted);padding:12px;'),
]

NACH_WERT = {decl: name for name, decl in KLASSEN}


def tags_umschreiben(text, zaehler):
    """Geht alle Tags durch und tauscht passende style=""-Werte gegen Klassen."""
    def ersetze(m):
        tag = m.group(0)
        sm = re.search(r'\sstyle="([^"]*)"', tag)
        if not sm:
            return tag
        wert = sm.group(1).strip()
        if '${' in wert or wert not in NACH_WERT:
            return tag
        if 'display' in wert:
            return tag          # display schaltet der Code per el.style.display um
        if re.search(r'\sid="', tag):
            return tag          # Elemente mit id holt sich der Code und veraendert sie
        name = NACH_WERT[wert]
        zaehler[name] = zaehler.get(name, 0) + 1
        tag = tag[:sm.start()] + tag[sm.end():]          # style entfernen
        cm = re.search(r'\sclass="([^"]*)"', tag)
        if cm:                                            # an bestehende Klassen haengen
            return tag[:cm.start()] + ' class="%s %s"' % (cm.group(1), name) + tag[cm.end():]
        stelle = m.re.match(tag).end(1)                   # direkt hinter den Tag-Namen
        return tag[:stelle] + ' class="%s"' % name + tag[stelle:]

    return re.sub(r'<([a-zA-Z][\w-]*)(?:[^<>"]|"[^"]*")*?>', ersetze, text, flags=re.S)


def css_block():
    zeilen = ['', '/* ── Aus haeufigen Inline-Styles gewonnene Klassen ──────────────── */',
              '/* Gleiche Deklarationen wie vorher, nur einmal statt hundertfach.  */']
    for name, decl in KLASSEN:
        teile = [t.strip() for t in decl.split(';') if t.strip()]
        zeilen.append('.%s { %s }' % (name, '; '.join(teile) + ';'))
    return '\n'.join(zeilen) + '\n'


zaehler = {}
neu = {}
for datei in DATEIEN:
    pfad = os.path.join(ORDNER, datei)
    alt = open(pfad, encoding='utf-8').read()
    neu[datei] = tags_umschreiben(alt, zaehler)

gesamt = sum(zaehler.values())
print('%d Inline-Styles durch %d Klassen ersetzt' % (gesamt, len(zaehler)))
for name, anz in sorted(zaehler.items(), key=lambda kv: -kv[1]):
    print('  %4d x  .%s' % (anz, name))
ungenutzt = [n for n, _ in KLASSEN if n not in zaehler]
if ungenutzt:
    print('  (ohne Treffer, kommen nicht in die CSS-Datei: %s)' % ', '.join(ungenutzt))

if not SCHREIBEN:
    print('\n(Probelauf - nichts geaendert.)')
    sys.exit(0)

for datei, inhalt in neu.items():
    open(os.path.join(ORDNER, datei), 'w', encoding='utf-8').write(inhalt)

css = open(os.path.join(ORDNER, 'stil.css'), encoding='utf-8').read().rstrip('\n')
benutzt = [(n, d) for n, d in KLASSEN if n in zaehler]
zeilen = ['', '/* ── Aus haeufigen Inline-Styles gewonnene Klassen ──────────────── */',
          '/* Gleiche Deklarationen wie vorher, nur einmal statt hundertfach.  */']
for name, decl in benutzt:
    teile = [t.strip() for t in decl.split(';') if t.strip()]
    zeilen.append('.%s { %s }' % (name, '; '.join(teile) + ';'))
open(os.path.join(ORDNER, 'stil.css'), 'w', encoding='utf-8').write(
    css + '\n' + '\n'.join(zeilen) + '\n')
print('\nstil.css um %d Klassen ergaenzt.' % len(benutzt))
