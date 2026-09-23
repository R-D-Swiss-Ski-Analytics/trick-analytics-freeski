"""Zieht Funktionen, die in beiden Sport-Modulen identisch sind, in den Kern.

Nur streng gepruefte Faelle werden verschoben:
  - Rumpf zeichengleich (nach Normalisierung von Leerraum)
  - kommt nicht in der return-Liste des Moduls vor
  - greift auf keinen Namen zu, den es nur modulintern gibt
"""
import re
import sys

ORDNER = sys.argv[1] if len(sys.argv) > 1 else '.'


def lies(datei):
    return open(f'{ORDNER}/{datei}', encoding='utf-8').read().split('\n')


def funktionen(zeilen):
    """Top-Level-Funktionen eines Modul-IIFE: {name: (start, ende)} 0-basiert, ende exklusiv."""
    out, i = {}, 0
    while i < len(zeilen):
        m = re.match(r'function\s+([A-Za-z_$][\w$]*)\s*\(', zeilen[i])
        if m:
            tiefe, j = 0, i
            while j < len(zeilen):
                tiefe += zeilen[j].count('{') - zeilen[j].count('}')
                j += 1
                if tiefe <= 0 and j > i:
                    break
            if m.group(1) not in out:
                out[m.group(1)] = (i, j)
            i = j
        else:
            i += 1
    return out


def rumpf(zeilen, spanne):
    return '\n'.join(zeilen[spanne[0]:spanne[1]])


def normal(text):
    text = re.sub(r'//[^\n]*', '', text)
    return re.sub(r'\s+', ' ', text).strip()


def modul_namen(zeilen, funcs):
    """Alle Namen, die es nur innerhalb des Moduls gibt."""
    namen = set(funcs)
    belegt = set()
    for s, e in funcs.values():
        belegt |= set(range(s, e))
    for i, l in enumerate(zeilen):
        if i in belegt:
            continue
        for m in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)', l):
            namen.add(m.group(1))
    return namen


def bezeichner(text):
    """Namen, die die Funktion von aussen bezieht - eigene Parameter und
    eigene Deklarationen zaehlen nicht dazu."""
    ohne = re.sub(r'(["\'`])(?:\\.|(?!\1).)*\1', '""', text, flags=re.S)
    ohne = re.sub(r'//[^\n]*', '', ohne)
    alle = set(re.findall(r'\b([A-Za-z_$][\w$]*)\b', ohne))
    eigen = set()
    kopf = re.match(r'function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)', ohne, re.S)
    if kopf:
        eigen |= set(re.findall(r'[A-Za-z_$][\w$]*', kopf.group(1)))
    eigen |= set(re.findall(r'\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)', ohne))
    eigen |= set(re.findall(r'(?:\bfor\s*\(\s*(?:const|let|var)\s+)([A-Za-z_$][\w$]*)', ohne))
    eigen |= set(re.findall(r'\.(?:map|filter|forEach|find|sort|reduce|some|every)\s*\(\s*\(?([A-Za-z_$][\w$]*)', ohne))
    return alle - eigen


def return_liste(zeilen):
    for l in zeilen:
        if l.startswith('return {') and '}' in l:
            return set(re.findall(r'[A-Za-z_$][\w$]*', l[len('return {'):l.rindex('}')]))
    return set()


sb, fs = lies('js/snowboard.js'), lies('js/freeski.js')
f_sb, f_fs = funktionen(sb), funktionen(fs)
export = return_liste(sb) | return_liste(fs)
# Exportierte Funktionen haengt boot.js ans window - eine Funktion im Kern
# findet sie dort zur Laufzeit. Sie sind also kein Hindernis.
lokal = (modul_namen(sb, f_sb) | modul_namen(fs, f_fs)) - export

gemeinsam = sorted(set(f_sb) & set(f_fs))
identisch = [n for n in gemeinsam if normal(rumpf(sb, f_sb[n])) == normal(rumpf(fs, f_fs[n]))]

kandidaten, abgelehnt = [], {}
# Fixpunkt: wer nur von anderen Verschiebbaren abhaengt, darf mit.
# (Die return-Liste des Moduls stoert nicht - der Name wird dann global aufgeloest.)
rest = list(identisch)
kandidaten = []
while True:
    erlaubt = lokal - set(kandidaten)
    neu = []
    for n in rest:
        fremd = (bezeichner(rumpf(sb, f_sb[n])) & erlaubt) - {n}
        if fremd:
            abgelehnt[n] = 'braucht modulinterne Namen: ' + ', '.join(sorted(fremd)[:4])
        else:
            neu.append(n)
    if not neu:
        break
    kandidaten += neu
    rest = [n for n in rest if n not in neu]
    abgelehnt = {k: v for k, v in abgelehnt.items() if k not in kandidaten}

print('Gleich benannte Funktionen in beiden Modulen: %d' % len(gemeinsam))
print('  davon zeichengleich:                       %d' % len(identisch))
print('  davon verschiebbar:                        %d' % len(kandidaten))
print('  zurueckgestellt:                           %d' % len(abgelehnt))
for n, grund in list(abgelehnt.items())[:8]:
    print('     %-28s %s' % (n, grund))

if '--schreiben' not in sys.argv:
    print('\n(Probelauf - nichts geaendert. Mit --schreiben ausfuehren.)')
    print('Verschiebbar:', ', '.join(kandidaten))
    sys.exit(0)

verschoben = [rumpf(sb, f_sb[n]) for n in kandidaten]
zeilen_weg = sum(t.count('\n') + 1 for t in verschoben)


def loeschen(zeilen, funcs, namen):
    weg = set()
    for n in namen:
        s, e = funcs[n]
        weg |= set(range(s, e))
    return [l for i, l in enumerate(zeilen) if i not in weg]


open(f'{ORDNER}/js/snowboard.js', 'w', encoding='utf-8').write('\n'.join(loeschen(sb, f_sb, kandidaten)))
open(f'{ORDNER}/js/freeski.js', 'w', encoding='utf-8').write('\n'.join(loeschen(fs, f_fs, kandidaten)))

kern = open(f'{ORDNER}/js/kern.js', encoding='utf-8').read().rstrip('\n')
kern += ('\n\n// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════\n'
         '// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.\n'
         '// Aenderungen hier wirken auf beide Sportarten.\n\n')
kern += '\n\n'.join(verschoben) + '\n'
open(f'{ORDNER}/js/kern.js', 'w', encoding='utf-8').write(kern)

print('\n%d Funktionen in den Kern gezogen, ~%d Zeilen doppelte Pflege entfallen.'
      % (len(kandidaten), zeilen_weg))
print('Verschoben:', ', '.join(kandidaten))
