/* Tests du repérage des îlots et du plan de correction (hors Illustrator).
 * Island finding and correction plan tests (outside Illustrator). */
var path = require("path");
var OBA = require(path.join(__dirname, "..", "OrdreBidiArabe.jsx"));
var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log("ÉCHEC: " + msg); } }
function zeros(s) { var a = [], i; for (i = 0; i < s.length; i++) { a.push(0); } return a; }
var ALL = { cats: { tel: true, num: true, qty: true, ref: true, web: true, range: false }, resetHarmful: true };
function plan(s, o, p, opts) { return OBA.planParagraph(s, o || zeros(s), p === undefined ? 1 : p, opts || ALL); }
function fixedTexts(pl) { return pl.islands.map(function (x) { return x.text; }); }

/* 1. Cas qui doivent être corrigés (texte, catégorie, ce qu'on voit avant) */
var MUST = [
    ["الهاتف: +213 550 12 34 56", "+213 550 12 34 56", "tel", "56 34 12 550 213+"],
    ["اتصل على 0550 12 34 56 للحجز", "0550 12 34 56", "tel", "56 34 12 0550"],
    ["الهاتف: (021) 23 45 67", "(021) 23 45 67", "tel", "67 45 23 (021)"],
    ["هاتف ٠٥٥٠ ١٢ ٣٤ ٥٦ للحجز", "٠٥٥٠ ١٢ ٣٤ ٥٦", "tel", "٥٦ ٣٤ ١٢ ٠٥٥٠"],
    ["السعر 1 500 000 دج", "1 500 000", "num", "000 500 1"],
    ["تخفيض +20% على كل شيء", "+20%", "num", "%20+"],
    ["مقاس 30 x 40 cm للوحة", "30 x 40 cm", "qty", "x 40 cm 30"],
    ["بسعر 1 500 DA فقط", "1 500 DA", "qty", "DA 500 1"],
    ["حجم 500 ml", "500 ml", "qty", "ml 500"],
    ["الحرارة -5 °C ليلا", "-5 °C", "qty", "C° 5-"],
    ["منتج 100% Natural من الجزائر", "100% Natural", "ref", "Natural %100"],
    ["مشروب 7 Up بارد", "7 Up", "ref", "Up 7"],
    ["عرض 2 en 1 مميز", "2 en 1", "ref", "en 1 2"],
    ["متجر 3 Suisses هنا", "3 Suisses", "ref", "Suisses 3"],
    ["تابعونا @amwanes_2026 اليوم", "@amwanes_2026", "web", "amwanes_2026@"],
    ["وسم #Algerie2026 الرسمي", "#Algerie2026", "web", "Algerie2026#"]
];
MUST.forEach(function (c) {
    var pl = plan(c[0]);
    var f = pl.islands.filter(function (x) { return x.text === c[1]; })[0];
    ok(!!f, "doit corriger « " + c[1] + " » dans « " + c[0] + " » ; trouvé : " + JSON.stringify(fixedTexts(pl)));
    if (f) {
        ok(f.cat === c[2], "catégorie de « " + c[1] + " » = " + f.cat + " (attendu " + c[2] + ")");
        if (c[3]) { ok(f.seen === c[3], "vu « " + f.seen + " » (attendu « " + c[3] + " »)"); }
        ok(f.after === c[1], "après « " + f.after + " »");
    }
});

/* 2. Cas qui ne doivent PAS être touchés (déjà dans l'ordre ou convention arabe) */
var NEVER = [
    "اشترِ iPhone 15 Pro الآن",            /* W7 : déjà dans l'ordre */
    "هاتف Samsung Galaxy S24 Ultra",
    "السعر 2500 دج", "عام 2026", "Coca Cola",
    "من 10 - 20 شخصا",                      /* plage : lue de droite à gauche */
    "الصفحات 12 13 14",                      /* liste de nombres */
    "من 08:00 – 17:00 يوميا",
    "المكونات: E330, E202 وماء",             /* liste */
    "اكتب لنا على contact@site.dz اليوم",
    "زوروا www.site.dz/promo2026 الآن",
    "تاريخ الانتهاء: EXP 12/2027 LOT 2401",
    "Tél: 0550 12 34 56 للاتصال",            /* étiquette latine : W7 garde l'ordre */
    "Paris, France مدينة",
    "الطبعة 17/10/2026",
    "نص عربي فقط بدون أرقام",
    "(Samsung Galaxy S24) هاتف",
    "خدمة 24h/24 كل يوم"                     /* W7 : h rend 24 « L » */
];
NEVER.forEach(function (s) {
    var pl = plan(s);
    ok(pl.changes.length === 0, "ne doit rien changer dans « " + s + " » ; changé : " + JSON.stringify(fixedTexts(pl)));
});

/* 3. Catégories désactivées */
var noTel = { cats: { tel: false, num: true, qty: true, ref: true, web: true, range: false }, resetHarmful: true };
ok(plan("الهاتف: +213 550 12 34 56", null, 1, noTel).changes.length === 0, "téléphones décochés → rien");
var withRange = { cats: { tel: true, num: true, qty: true, ref: true, web: true, range: true }, resetHarmful: true };
var pr = plan("من 10 - 20 شخصا", null, 1, withRange);
ok(pr.islands.length === 1 && pr.islands[0].text === "10 - 20" && pr.islands[0].cat === "range", "plages cochées → « 10 - 20 » remis de gauche à droite");

/* 4. Paragraphe LTR : aucun îlot n'est forcé */
ok(plan("Tél : +213 550 12 34 56", null, 0).changes.length === 0, "paragraphe LTR intact");
ok(plan("العنوان 1 500 000 دج", null, 0).islands.length === 0, "paragraphe LTR avec arabe : pas d'îlots");

/* 5. Directions forcées nuisibles */
(function () {
    var s = "سنة 2026 مميزة", o = zeros(s), i, a = s.indexOf("2026");
    for (i = a; i < a + 4; i++) { o[i] = 2; }
    var pl = plan(s, o);
    ok(pl.harmful.length === 1 && pl.harmful[0].kind === "rtl" && pl.harmful[0].seen === "6202", "RTL forcé sur 2026 vu « 6202 » : " + JSON.stringify(pl.harmful));
    var all0 = true; for (i = 0; i < s.length; i++) { if (pl.newOvr[i] !== 0) { all0 = false; } }
    ok(all0, "RTL forcé remis par défaut");
    var noReset = { cats: ALL.cats, resetHarmful: false };
    ok(plan(s, o, 1, noReset).harmful.length === 0, "option désactivée → rien");
})();
(function () {
    var s = "الهاتف: +213 550 12 34 56", o = zeros(s).map(function () { return 1; });
    var pl = plan(s, o);
    ok(pl.harmful.length === 1 && pl.harmful[0].kind === "ltr", "arabe forcé LTR détecté");
    var i, arabicLtr = false, a = s.indexOf("+");
    for (i = 0; i < s.length; i++) { if (i < a && pl.newOvr[i] === 1 && /[\u0600-\u06FF]/.test(s[i])) { arabicLtr = true; } }
    ok(!arabicLtr, "plus aucune lettre arabe forcée LTR");
    for (i = a; i < s.length; i++) { if (pl.newOvr[i] !== 1) { arabicLtr = true; } }
    ok(!arabicLtr, "le numéro reste / redevient LTR");
    var res = OBA.resolveParagraph(OBA.strOf(s), pl.newOvr, 1);
    ok(OBA.displayedInOrder(res, a, s.length, s.length), "numéro affiché dans l'ordre après remise à zéro");
})();
(function () {
    /* îlot déjà forcé LTR correctement : rien à faire */
    var s = "حجم 500 ml", o = zeros(s), i, a = s.indexOf("500");
    for (i = a; i < s.length; i++) { o[i] = 1; }
    ok(plan(s, o).changes.length === 0, "îlot déjà LTR → aucun changement");
})();

/* 6. Saut de ligne forcé (U+0003) : réordonnancement par ligne */
(function () {
    var s = "abc\u0003def", res = OBA.resolveParagraph(OBA.strOf(s), zeros(s), 1);
    ok(res.visual.slice(0, 4).join(",") === "3,0,1,2" || res.visual.slice(0, 4).join(",") === "0,1,2,3", "ligne 1 réordonnée seule : " + res.visual.join(","));
    ok(res.visual.slice(4).join(",") === "4,5,6", "ligne 2 : " + res.visual.join(","));
    var s2 = "الهاتف\u0003+213 550 12 34 56", pl = plan(s2);
    ok(pl.islands.length === 1 && pl.islands[0].text === "+213 550 12 34 56", "numéro sur la ligne suivante");
})();

/* 7. Aléatoire : phrases arabes avec îlots — invariants */
var AR = ["الهاتف", "السعر", "منتج", "جديد", "في", "الجزائر", "اتصل", "على", "حجم", "مقاس", "من", "إلى", "و"];
var ISL = ["+213 550 12 34 56", "0550 12 34 56", "(021) 23 45 67", "1 500 000", "1 500 DA", "30 x 40 cm", "500 ml",
    "-5 °C", "100% Natural", "7 Up", "24h/24", "2 en 1", "@shop_2026", "#Promo2026", "contact@site.dz", "iPhone 15 Pro", "2026",
    "10 - 20", "E330, E202", "+20%", "٠٥٥٠ ١٢ ٣٤ ٥٦", "Coca Cola", "EXP 12/2027", "Windows 11", "12 13"];
var PUN = ["", "", "", ":", "،", ".", "؟", " (", ")"];
function rnd(n) { return Math.floor(Math.random() * n); }
var N = 3000, inv = { order: 0, arabic: 0, idem: 0, outside: 0 }, t;
for (t = 0; t < N; t++) {
    var parts = [], k, len = 3 + rnd(8);
    for (k = 0; k < len; k++) { parts.push(rnd(3) === 0 ? ISL[rnd(ISL.length)] : AR[rnd(AR.length)] + PUN[rnd(PUN.length)]); }
    var s = parts.join(" "), o = zeros(s), i;
    if (rnd(4) === 0) { var a0 = rnd(s.length), b0 = a0 + rnd(s.length - a0 + 1), v0 = 1 + rnd(2); for (i = a0; i < b0; i++) { o[i] = v0; } }
    var opts = { cats: { tel: true, num: true, qty: true, ref: true, web: true, range: rnd(2) === 0 }, resetHarmful: rnd(5) !== 0 };
    var pl = plan(s, o, 1, opts);
    var res = OBA.resolveParagraph(OBA.strOf(s), pl.newOvr, 1);
    pl.islands.forEach(function (x) { if (!OBA.displayedInOrder(res, x.start, x.end, s.length)) { inv.order++; } });
    var allowed = [];
    pl.islands.forEach(function (x) { for (i = x.start; i < x.end; i++) { allowed[i] = 1; } });
    pl.harmful.forEach(function (x) { for (i = x.start; i < x.end; i++) { allowed[i] = 1; } });
    pl.changes.forEach(function (c) {
        if (!allowed[c.i]) { inv.outside++; }
        if (c.to === 1 && /[\u0621-\u064A]/.test(s[c.i])) { inv.arabic++; }
    });
    var again = plan(s, pl.newOvr, 1, opts);
    if (again.changes.length) { inv.idem++; if (inv.idem < 4) { console.log("non idempotent: " + JSON.stringify(s) + " " + JSON.stringify(again.changes)); } }
}
ok(inv.order === 0, "îlots corrigés affichés dans l'ordre (" + inv.order + " écarts)");
ok(inv.arabic === 0, "aucune lettre arabe forcée LTR (" + inv.arabic + ")");
ok(inv.outside === 0, "aucun changement hors îlots / directions nuisibles (" + inv.outside + ")");
ok(inv.idem === 0, "second passage sans changement (" + inv.idem + ")");
console.log("Aléatoire : " + N + " phrases");

/* 8. isPhone */
ok(OBA.isPhone("+213 550 12 34 56") && OBA.isPhone("00213 550123456") && OBA.isPhone("021.23.45.67"), "isPhone : +213, 00213, points");
ok(OBA.isPhone("0550 12 34 56"), "0550 12 34 56 est un téléphone");
ok(!OBA.isPhone("2019 - 2026"), "2019 - 2026 n'est pas un téléphone");
ok(!OBA.isPhone("1 500 000"), "1 500 000 n'est pas un téléphone");

console.log("test-islands : " + pass + " réussis, " + fail + " échoués");
process.exit(fail ? 1 : 0);
