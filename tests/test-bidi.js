/* Compare le moteur bidi d'OrdreBidiArabe à bidi-js (implémentation UAX #9 de référence).
 * Compares the OrdreBidiArabe bidi engine with bidi-js (reference UAX #9 implementation).
 * Prérequis / prerequisite : npm install (dans tests/) — sinon le test est sauté. */
var path = require("path");
var OBA = require(path.join(__dirname, "..", "OrdreBidiArabe.jsx"));
var bidiFactory;
try { bidiFactory = require("bidi-js"); } catch (e) {
    console.log("bidi-js absent : lancez « npm install » dans tests/ — test de comparaison sauté.");
    process.exit(0);
}
var bidi = bidiFactory();
var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; if (fail < 15) { console.log("ÉCHEC: " + msg); } } }

/* Référence : chaîne avec LRO/RLO…PDF autour des plages forcées */
function reference(s, ovr, p) {
    var t = "", map = [], i = 0, n = s.length;
    while (i < n) {
        var o = ovr[i] || 0;
        if (o) {
            t += o === 1 ? "\u202D" : "\u202E"; map.push(-1);
            while (i < n && (ovr[i] || 0) === o) { t += s[i]; map.push(i); i++; }
            t += "\u202C"; map.push(-1);
        } else { t += s[i]; map.push(i); i++; }
    }
    var e = bidi.getEmbeddingLevels(t, p ? "rtl" : "ltr");
    var idx = []; for (i = 0; i < t.length; i++) { idx.push(i); }
    bidi.getReorderSegments(t, e).forEach(function (seg) {
        var a = seg[0], z = seg[1], sl = idx.slice(a, z + 1).reverse(), k;
        for (k = a; k <= z; k++) { idx[k] = sl[k - a]; }
    });
    var levels = [], vis = [];
    for (i = 0; i < t.length; i++) { if (map[i] >= 0) { levels[map[i]] = e.levels[i]; } }
    for (i = 0; i < idx.length; i++) { if (map[idx[i]] >= 0) { vis.push(map[idx[i]]); } }
    return { levels: levels, visual: vis };
}

var ALPHA = ("اببتهلمنعيى" + "\u064E\u0651" + "٠١٢٣٩" + "abcXYZ" + "0123456789" + "    " + "+-.,/:%#$()[]«»'!?€°×" +
    "\u00A0\u2013\u066B\u060C\u061Fא\t").split("");
function rnd(n) { return Math.floor(Math.random() * n); }
function randStr(len) { var s = "", i; for (i = 0; i < len; i++) { s += ALPHA[rnd(ALPHA.length)]; } return s; }

var N = 6000, t, mismatch = 0;
for (t = 0; t < N; t++) {
    var s = randStr(1 + rnd(40)), p = rnd(2), ovr = [], i;
    var withOvr = rnd(3) === 0;
    for (i = 0; i < s.length; i++) { ovr[i] = 0; }
    if (withOvr) {
        var runsN = 1 + rnd(3), r;
        for (r = 0; r < runsN; r++) {
            var a = rnd(s.length), b = a + rnd(s.length - a + 1), v = 1 + rnd(2);
            for (i = a; i < b; i++) { ovr[i] = v; }
        }
    }
    var mine = OBA.resolveParagraph(OBA.strOf(s), ovr, p), ref = reference(s, ovr, p);
    var same = mine.visual.join(",") === ref.visual.join(",") && mine.levels.join(",") === ref.levels.join(",");
    if (!same) { mismatch++; if (mismatch <= 8) { console.log("Différence p=" + p + " ovr=" + ovr.join("") + " s=" + JSON.stringify(s) + "\n  mine lv " + mine.levels.join("") + "\n  ref  lv " + ref.levels.join("")); } }
    ok(same, "aléatoire " + t);
}
console.log("Comparaison aléatoire avec bidi-js : " + (N - mismatch) + "/" + N + " identiques");

/* Cas réels / real cases */
var cases = [
    "الهاتف: +213 550 12 34 56",
    "اشترِ iPhone 15 Pro الآن",
    "السعر 1 500 000 دج",
    "(021) 23 45 67 :الهاتف",
    "مقاس 30 x 40 cm للوحة",
    "اكتب لنا على contact@site.dz اليوم",
    "منتج 100% Natural من الجزائر"
];
cases.forEach(function (s) {
    var ovr = s.split("").map(function () { return 0; });
    var mine = OBA.resolveParagraph(OBA.strOf(s), ovr, 1), ref = reference(s, ovr, 1);
    ok(mine.visual.join(",") === ref.visual.join(","), "cas réel " + s);
});

console.log("test-bidi : " + pass + " réussis, " + fail + " échoués");
process.exit(fail ? 1 : 0);
