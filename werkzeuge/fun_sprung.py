"""Fuegt der Moguls-App den Sprung 'Fun' hinzu - nur beim Water Jump.

Der Sprung steht bewusst nicht in JUMPS_NO_GRAB: sonst taeuchte er auch bei
'Jump on Snow', '50/50' und 'TTB' auf. Stattdessen haengt er als extraJumps
am Sessiontyp und wird ueberall dort angeboten, wo dieser Typ gilt.
"""
import re
import sys

PFAD = (sys.argv[1] if len(sys.argv) > 1 else '.') + '/moguls.html'
s = open(PFAD, encoding='utf-8').read()


def ersetze(alt, neu, was):
    global s
    if alt not in s:
        sys.exit('Nicht gefunden: %s' % was)
    if s.count(alt) != 1:
        sys.exit('%s kommt %dx vor' % (was, s.count(alt)))
    s = s.replace(alt, neu)
    print('  ✓', was)


# 1. Liste der Sprung-Extras
ersetze(
    "// Entry types: which jump selects they need + which criteria get rated.",
    "// Sprünge, die nur zu einem bestimmten Sessiontyp gehören (siehe extraJumps)\n"
    "const JUMPS_WATER_ONLY = ['Fun'];\n\n"
    "// Entry types: which jump selects they need + which criteria get rated.",
    "JUMPS_WATER_ONLY angelegt")

# 2. Am Sessiontyp haengen
ersetze(
    "  'Water Jump':   { jumps:1, jumpList:'all', jumpSession:true },",
    "  'Water Jump':   { jumps:1, jumpList:'all', jumpSession:true, extraJumps:JUMPS_WATER_ONLY },",
    "extraJumps beim Water Jump eingetragen")

# 3. jumpOptions: Extras als eigene Gruppe anhaengen
ersetze(
    """function jumpOptions(listKey, selected) {
  const opt = j => '<option value="' + escAttr(j) + '"' + (j === selected ? ' selected' : '') + '>' + j + '</option>';
  if (listKey === 'nograb') return JUMPS_NO_GRAB.map(opt).join('');
  if (listKey === 'grab')   return JUMPS_GRAB.map(opt).join('');
  return '<optgroup label="No Grab">' + JUMPS_NO_GRAB.map(opt).join('') + '</optgroup>'
       + '<optgroup label="Grab">'    + JUMPS_GRAB.map(opt).join('')    + '</optgroup>';
}""",
    """function jumpOptions(listKey, selected, extra) {
  const opt = j => '<option value="' + escAttr(j) + '"' + (j === selected ? ' selected' : '') + '>' + j + '</option>';
  // Typ-eigene Sprünge (z.B. 'Fun' beim Water Jump) stehen in einer eigenen Gruppe am Ende
  const extraHtml = (extra && extra.length)
    ? '<optgroup label="Extra">' + extra.map(opt).join('') + '</optgroup>' : '';
  if (listKey === 'nograb') return JUMPS_NO_GRAB.map(opt).join('') + extraHtml;
  if (listKey === 'grab')   return JUMPS_GRAB.map(opt).join('') + extraHtml;
  return '<optgroup label="No Grab">' + JUMPS_NO_GRAB.map(opt).join('') + '</optgroup>'
       + '<optgroup label="Grab">'    + JUMPS_GRAB.map(opt).join('')    + '</optgroup>'
       + extraHtml;
}""",
    "jumpOptions nimmt Extras entgegen")

# 4. jumpOptionsFor: dito, aber ohne den Assessment-Filter
ersetze(
    "function jumpOptionsFor(name, listKey, selected) {",
    "function jumpOptionsFor(name, listKey, selected, extra) {",
    "jumpOptionsFor nimmt Extras entgegen")

alt_ende = """  if (listKey === 'nograb') return (ng.length ? ng : NG).map(opt).join('');
  if (listKey === 'grab')   return (g.length ? g : G).map(opt).join('');"""
neu_ende = """  // Typ-eigene Sprünge immer anbieten - sie stehen in keinem Assessment
  const extraHtml = (extra && extra.length)
    ? '<optgroup label="Extra">' + extra.map(opt).join('') + '</optgroup>' : '';
  if (listKey === 'nograb') return (ng.length ? ng : NG).map(opt).join('') + extraHtml;
  if (listKey === 'grab')   return (g.length ? g : G).map(opt).join('') + extraHtml;"""
ersetze(alt_ende, neu_ende, "jumpOptionsFor haengt Extras an (ohne Assessment-Filter)")

rest = re.search(r'  if \(listKey === \'grab\'\)   return \(g\.length \? g : G\)\.map\(opt\)\.join\(\'\'\) \+ extraHtml;\n(.*?)\n\}', s, re.S)
if rest:
    print('  ℹ Rest von jumpOptionsFor:', rest.group(1).strip()[:90])

# 5. Aufrufstellen: Live-Session und Bearbeiten-Fenster
ersetze("${jumpOptionsFor(name, t.jumpList, sel.jump1)}",
        "${jumpOptionsFor(name, t.jumpList, sel.jump1, t.extraJumps)}",
        "Live-Session, Jump 1")
ersetze("${jumpOptionsFor(name, t.jumpList, sel.jump2)}",
        "${jumpOptionsFor(name, t.jumpList, sel.jump2, t.extraJumps)}",
        "Live-Session, Jump 2")
ersetze("${jumpOptions(jumpList, entry.jump1)}",
        "${jumpOptions(jumpList, entry.jump1, t.extraJumps)}",
        "Bearbeiten-Fenster, Jump 1")
ersetze("${jumpOptions(jumpList, entry.jump2)}",
        "${jumpOptions(jumpList, entry.jump2, t.extraJumps)}",
        "Bearbeiten-Fenster, Jump 2")

open(PFAD, 'w', encoding='utf-8').write(s)
print("\nFertig. 'Fun' erscheint nur beim Sessiontyp 'Water Jump'.")
