"""Hebt Zustandsvariablen, die in beiden Modulen dasselbe bedeuten, in den Kern.

Verglichen wird der Code ohne Kommentar: 'let x = null; // SB-Notiz' und
'let x = null;' sind dieselbe Deklaration. Uebernommen wird die ausfuehrlichere
der beiden Zeilen.

  python3 zustand_umzug.py <ordner> <Name> [<Name> ...]
"""
import re
import sys

ORDNER = sys.argv[1]
NAMEN = sys.argv[2:]
if not NAMEN:
    sys.exit('Keine Namen angegeben.')


def lies(p):
    return open('%s/%s' % (ORDNER, p), encoding='utf-8').read()


def schreib(p, s):
    open('%s/%s' % (ORDNER, p), 'w', encoding='utf-8').write(s)


def ohne_kommentar(zeile):
    return re.sub(r'\s*//.*$', '', zeile).strip()


sb, fs, kern = lies('js/snowboard.js'), lies('js/freeski.js'), lies('js/kern.js')
zeilen = []

for name in NAMEN:
    regex = re.compile(r'^(?:let|const|var) %s\b[^\n]*$' % re.escape(name), re.M)
    a = regex.search(sb)
    b = regex.search(fs)
    if not a or not b:
        sys.exit('%s: in snowboard %s, in freeski %s gefunden'
                 % (name, bool(a), bool(b)))
    if ohne_kommentar(a.group(0)) != ohne_kommentar(b.group(0)):
        sys.exit('%s unterscheidet sich im Code, nicht nur im Kommentar:\n  SB %s\n  FS %s'
                 % (name, a.group(0), b.group(0)))
    zeilen.append(max(a.group(0), b.group(0), key=len))
    sb = regex.sub('', sb, count=1)
    fs = regex.sub('', fs, count=1)

sb = re.sub(r'\n{3,}', '\n\n', sb)
fs = re.sub(r'\n{3,}', '\n\n', fs)
kern = kern.rstrip('\n') + (
    '\n\n// ── Zustand, in beiden Sportarten gleich ─────────────────────────────\n'
    + '\n'.join(zeilen) + '\n')

schreib('js/kern.js', kern)
schreib('js/snowboard.js', sb)
schreib('js/freeski.js', fs)
print('%d Zustandsvariablen in den Kern verschoben:' % len(NAMEN))
for z in zeilen:
    print('   ', z[:88])
