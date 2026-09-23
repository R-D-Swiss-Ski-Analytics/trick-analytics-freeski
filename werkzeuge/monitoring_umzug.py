"""Monitoring-Zustand in den Kern heben.

Acht Zustandsvariablen des Monitorings sind in beiden Modulen wortgleich
deklariert - sie gehoeren einmal in den Kern. Damit die gemeinsamen
Monitoring-Funktionen danach folgen koennen, muessen die drei Renderer,
die sich je Sportart unterscheiden, ans window gereicht werden: sie stehen
dafuer in der return-Liste des Moduls.
"""
import re
import sys

ORDNER = sys.argv[1] if len(sys.argv) > 1 else '.'
ZUSTAND = ['sbMonView', 'sbMonFrom', 'sbMonTo', 'sbMonRows', 'sbMonTyp',
           'sbMonRange', '_monAthletes', '_monTricks']
RENDERER = ['renderMonAthlete', 'renderMonTeam', 'renderMonTrick']


def lies(p):
    return open('%s/%s' % (ORDNER, p), encoding='utf-8').read()


def schreib(p, s):
    open('%s/%s' % (ORDNER, p), 'w', encoding='utf-8').write(s)


sb, fs, kern = lies('js/snowboard.js'), lies('js/freeski.js'), lies('js/kern.js')

# 1. Deklarationen einsammeln (die des Snowboard-Moduls gelten, sie tragen die Kommentare)
zeilen = []
for name in ZUSTAND:
    m = re.search(r'^(let|const|var) %s\b[^\n]*$' % re.escape(name), sb, re.M)
    if not m:
        sys.exit('%s nicht gefunden' % name)
    zeilen.append(m.group(0))

# 2. Aus beiden Modulen entfernen
for name in ZUSTAND:
    regex = re.compile(r'^(?:let|const|var) %s\b[^\n]*\n' % re.escape(name), re.M)
    sb, n1 = regex.subn('', sb, count=1)
    fs, n2 = regex.subn('', fs, count=1)
    if (n1, n2) != (1, 1):
        sys.exit('%s: %dx/%dx entfernt' % (name, n1, n2))

# 3. In den Kern, ans Ende eines eigenen Abschnitts
kern = kern.rstrip('\n') + (
    '\n\n// ── Monitoring: Zustand, in beiden Sportarten gleich ──────────────────\n'
    + '\n'.join(zeilen) + '\n')

# 4. Die drei Renderer exportieren, damit der Kern sie ueber window findet
for name, text in (('snowboard', sb), ('freeski', fs)):
    m = re.search(r'^return \{(.*)\};?$', text, re.M)
    if not m:
        sys.exit('return-Liste in %s nicht gefunden' % name)
    schon = set(re.findall(r'[A-Za-z_$][\w$]*', m.group(1)))
    fehlt = [r for r in RENDERER if r not in schon]
    if fehlt:
        neu = m.group(0).rstrip(';').rstrip('}').rstrip()
        neu = neu + ', ' + ', '.join(fehlt) + ' }'
        text = text[:m.start()] + neu + text[m.end():]
    if name == 'snowboard':
        sb = text
    else:
        fs = text
    print('%-10s exportiert zusaetzlich: %s' % (name, ', '.join(fehlt) or 'nichts'))

schreib('js/kern.js', kern)
schreib('js/snowboard.js', sb)
schreib('js/freeski.js', fs)
print('%d Zustandsvariablen in den Kern verschoben.' % len(ZUSTAND))
