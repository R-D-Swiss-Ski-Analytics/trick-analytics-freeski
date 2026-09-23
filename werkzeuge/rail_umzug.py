"""Rail-Zustand aus den Modulen in Config und Kern heben.

SB_RAIL_SUGGESTIONS ist sportartspezifische *Daten* - die gehoeren laut
README in SPORT_CONFIGS. SB_RAIL_TRICKS und SB_CUSTOM_RAIL_TYPES sind in
beiden Modulen gleich und gehoeren in den Kern. Danach koennen die
rail-bezogenen Funktionen zusammengefuehrt werden.
"""
import re
import sys

ORDNER = sys.argv[1] if len(sys.argv) > 1 else '.'


def lies(p):
    return open('%s/%s' % (ORDNER, p), encoding='utf-8').read()


def schreib(p, s):
    open('%s/%s' % (ORDNER, p), 'w', encoding='utf-8').write(s)


sb, fs, kern, cfg = (lies('js/snowboard.js'), lies('js/freeski.js'),
                     lies('js/kern.js'), lies('js/config.js'))

# 1. Die beiden Listen einsammeln
muster = re.compile(r'^const SB_RAIL_SUGGESTIONS = (\[.*\]);$', re.M)
liste = {}
for name, text in (('snowboard', sb), ('freeski', fs)):
    m = muster.search(text)
    if not m:
        sys.exit('SB_RAIL_SUGGESTIONS in %s nicht gefunden' % name)
    liste[name] = m.group(1)

# 2. In SPORT_CONFIGS eintragen, jeweils vor 'selectFill:'
for name in ('snowboard', 'freeski'):
    start = cfg.index('  %s: {' % name)
    stelle = cfg.index('    selectFill: {', start)
    eintrag = ('    // Vorschlaege fuer Rail-Tricks in der Live-Session\n'
               '    railSuggestions: %s,\n' % liste[name])
    cfg = cfg[:stelle] + eintrag + cfg[stelle:]

# 3. Deklarationen aus beiden Modulen entfernen
weg = [
    re.compile(r'^const SB_RAIL_SUGGESTIONS = \[.*\];\n', re.M),
    re.compile(r'^let SB_CUSTOM_RAIL_TYPES = \[\];[^\n]*\n', re.M),
    re.compile(r'^let SB_RAIL_TRICKS = \[\];[^\n]*\n', re.M),
]
for regex in weg:
    sb, n1 = regex.subn('', sb)
    fs, n2 = regex.subn('', fs)
    if (n1, n2) != (1, 1):
        sys.exit('Unerwartet: %s kam %dx/%dx vor' % (regex.pattern, n1, n2))

# 4. Im Kern anlegen, direkt hinter den Supabase-Zugang
anker = 'const SUPABASE_KEY = CFG.supabaseKey;'
neu = anker + '''

// ── Rail-Tricks: Vorschlagsliste kommt aus der Config, der Rest ist gemeinsam ──
const SB_RAIL_SUGGESTIONS = CFG.railSuggestions || [];
let SB_CUSTOM_RAIL_TYPES = [];   // in dieser Session neu erfasste Rail-Arten
let SB_RAIL_TRICKS = [];         // team-weit bereits verwendete Rail-Tricks (aus der DB)'''
if anker not in kern:
    sys.exit('Anker im Kern nicht gefunden')
kern = kern.replace(anker, neu, 1)

schreib('js/config.js', cfg)
schreib('js/kern.js', kern)
schreib('js/snowboard.js', sb)
schreib('js/freeski.js', fs)
print('Rail-Zustand verschoben:')
print('  SPORT_CONFIGS.railSuggestions  snowboard: %d Eintraege, freeski: %d Eintraege'
      % (liste['snowboard'].count(',') + 1, liste['freeski'].count(',') + 1))
print('  SB_RAIL_TRICKS und SB_CUSTOM_RAIL_TYPES liegen jetzt im Kern')
