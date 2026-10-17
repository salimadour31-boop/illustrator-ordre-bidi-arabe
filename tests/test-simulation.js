/* Simulation du DOM d'Illustrator (objets factices) pour tester analyse / application / rétablissement.
 * Mock Illustrator DOM to test analyse / apply / restore. Ne remplace pas un essai dans Illustrator. */
var path = require("path");
var pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log("ÉCHEC: " + msg); } }

function Enum(name) { this.n = name; }
Enum.prototype.toString = function () { return this.n; };
global.DirOverrideType = { DEFAULT_DIRECTION: new Enum("DirOverrideType.DEFAULT_DIRECTION"),
    LEFT_TO_RIGHT_DIRECTION: new Enum("DirOverrideType.LEFT_TO_RIGHT_DIRECTION"), RIGHT_TO_LEFT_DIRECTION: new Enum("DirOverrideType.RIGHT_TO_LEFT_DIRECTION") };
global.ParagraphDirectionType = { LEFT_TO_RIGHT_DIRECTION: new Enum("ParagraphDirectionType.LEFT_TO_RIGHT_DIRECTION"), RIGHT_TO_LEFT_DIRECTION: new Enum("ParagraphDirectionType.RIGHT_TO_LEFT_DIRECTION") };
global.ComposerEngineType = { optycaComposer: new Enum("ComposerEngineType.optycaComposer"), latinCJKComposer: new Enum("ComposerEngineType.latinCJKComposer") };
global.ZOrderMethod = { BRINGTOFRONT: 1 };
global.RGBColor = function () { this.kind = "RGB"; };
global.CMYKColor = function () { this.kind = "CMYK"; };

var OBA = require(path.join(__dirname, "..", "OrdreBidiArabe.jsx"));
var D = DirOverrideType;
var QUIRK = { ignoreEqualStyle: false, writes: 0 };

function makeStyle() { return { characterAttributes: { dirOverride: D.DEFAULT_DIRECTION } }; }
var NORMAL = makeStyle();

function makeChar(story, i) {
    var ca = {};
    Object.defineProperty(ca, "dirOverride", {
        get: function () { return story.dirs[i]; },
        set: function (v) {
            QUIRK.writes++;
            if (QUIRK.ignoreEqualStyle && v === NORMAL.characterAttributes.dirOverride) { return; } /* bizarrerie simulée */
            story.dirs[i] = v;
        }
    });
    return { characterAttributes: ca, characterStyles: [NORMAL],
        get paragraphAttributes() { return story.paraAttr(i); } };
}
function makeStory(text, paraDirs, composers) {
    var st = { text: text, dirs: [], paraDirs: paraDirs, composers: composers || [] }, i;
    for (i = 0; i < text.length; i++) { st.dirs.push(D.DEFAULT_DIRECTION); }
    st.textRange = { get contents() { return st.text; } };
    st.paraAttr = function (i) {
        var k = st.text.substring(0, i).split("\r").length - 1;
        return { paragraphDirection: st.paraDirs[k] === "rtl" ? ParagraphDirectionType.RIGHT_TO_LEFT_DIRECTION : ParagraphDirectionType.LEFT_TO_RIGHT_DIRECTION,
            composerEngine: st.composers[k] === "latin" ? ComposerEngineType.latinCJKComposer : ComposerEngineType.optycaComposer };
    };
    var chars = { length: text.length, brokenLength: null };
    for (i = 0; i < text.length; i++) { chars[i] = makeChar(st, i); }
    st.characters = chars;
    return st;
}
function makeTags() {
    var t = { length: 0 };
    t.add = function () {
        var tag = { name: "", value: "" }, self = t;
        tag.remove = function () {
            var arr = [], k; for (k = 0; k < self.length; k++) { if (self[k] !== tag) { arr.push(self[k]); } }
            for (k = 0; k < self.length; k++) { delete self[k]; }
            for (k = 0; k < arr.length; k++) { self[k] = arr[k]; } self.length = arr.length;
        };
        t[t.length] = tag; t.length++; return tag;
    };
    return t;
}
function makeLayer(name, doc) {
    var lay = { typename: "Layer", name: name, locked: false, visible: true, printable: true, parent: doc, items: [] };
    lay.pageItems = { get length() { return lay.items.length; } };
    function sync() { var k; for (k = 0; k < 50; k++) { delete lay.pageItems[k]; } for (k = 0; k < lay.items.length; k++) { lay.pageItems[k] = lay.items[k]; } }
    function addItem(it) { it.remove = function () { lay.items.splice(lay.items.indexOf(it), 1); sync(); }; lay.items.push(it); sync(); return it; }
    lay.pathItems = { rectangle: function (top, left, w, h) { return addItem({ typename: "PathItem", top: top, left: left, width: w, height: h }); } };
    lay.textFrames = { pointText: function (pt) { var tf = addItem({ typename: "TextFrame", contents: "", textRange: { characterAttributes: {} } }); return tf; } };
    lay.zOrder = function () { };
    lay.remove = function () { doc.layers.list.splice(doc.layers.list.indexOf(lay), 1); doc.layers.sync(); };
    return lay;
}
function makeFrame(doc, layer, story, opts) {
    opts = opts || {};
    var f = { typename: "TextFrame", locked: !!opts.locked, hidden: false, parent: opts.parent || layer, layer: layer,
        name: opts.name || "", geometricBounds: opts.bounds || [0, 100, 200, 0], visibleBounds: opts.bounds || [0, 100, 200, 0],
        previousFrame: opts.previous || null, story: story, tags: makeTags(), selected: false };
    Object.defineProperty(f, "contents", { get: function () { return story.text; } });
    return f;
}
function makeDoc(cmyk) {
    var doc = { typename: "Document", documentColorSpace: cmyk ? "DocumentColorSpace.CMYK" : "DocumentColorSpace.RGB", selection: [] };
    doc.layers = { list: [] };
    doc.layers.sync = function () { var k; for (k = 0; k < 50; k++) { delete doc.layers[k]; } for (k = 0; k < doc.layers.list.length; k++) { doc.layers[k] = doc.layers.list[k]; } doc.layers.length = doc.layers.list.length; };
    doc.layers.add = function () { var l = makeLayer("Calque", doc); doc.layers.list.unshift(l); doc.layers.sync(); return l; };
    doc.frames = [];
    doc.textFrames = {};
    Object.defineProperty(doc.textFrames, "length", { get: function () { return doc.frames.length; } });
    doc.addFrame = function (f) { doc.frames.push(f); doc.textFrames[doc.frames.length - 1] = f; return f; };
    return doc;
}

OBA.setLang(true);
var opts = OBA.optsFromCfg(OBA.DEFAULTS);

/* Document de base */
var doc = makeDoc(false);
var L1 = makeLayer("Arabe", doc), L2 = makeLayer("Français", doc);
doc.layers.list.push(L1, L2); doc.layers.sync(); doc.activeLayer = L1;
var t1 = "الهاتف: +213 550 12 34 56\rالسعر 1 500 DA فقط\rTél : +213 550 12 34 56";
var s1 = makeStory(t1, ["rtl", "rtl", "ltr"]);
var f1 = doc.addFrame(makeFrame(doc, L1, s1, { name: "Carte" }));
var s2 = makeStory("Bonjour 1 500 000 personnes", ["ltr"]);
var f2 = doc.addFrame(makeFrame(doc, L2, s2));
var s3 = makeStory("الهاتف: +213 550 12 34 56", ["rtl"]);
var f3 = doc.addFrame(makeFrame(doc, L1, s3, { locked: true }));

function dirsOf(st) { return st.dirs.map(function (d) { return OBA.dirCode(d); }).join(""); }
var before1 = dirsOf(s1);

/* 1. Analyse : rien n'est modifié */
QUIRK.writes = 0;
var list = OBA.analyseDoc(doc, "document", opts);
ok(list.length === 2, "verrouillé ignoré : " + list.length + " blocs");
ok(QUIRK.writes === 0 && dirsOf(s1) === before1, "analyse sans écriture");
var rep = OBA.buildReport(list, false, null);
ok(rep.totals.islands === 2, "2 séquences à corriger : " + rep.totals.islands);
ok(rep.text.indexOf("vu « 56 34 12 550 213+ » → « +213 550 12 34 56 »") >= 0, "rapport montre ce qui est vu");
ok(rep.text.indexOf("« DA 500 1 » → « 1 500 DA »") >= 0, "rapport quantité");

/* 2. Application */
var done = OBA.applyAnalysis(list);
var a = t1.indexOf("+213"), b = a + "+213 550 12 34 56".length;
var exp = "", i;
var p2 = t1.indexOf("1 500 DA"), q2 = p2 + "1 500 DA".length;
for (i = 0; i < t1.length; i++) { exp += ((i >= a && i < b) || (i >= p2 && i < q2)) ? "1" : "0"; }
ok(dirsOf(s1) === exp, "directions appliquées exactement sur les îlots\n   " + dirsOf(s1) + "\n   " + exp);
ok(dirsOf(s2) === "0".repeat(s2.text.length), "bloc français intact");
ok(dirsOf(s3) === "0".repeat(s3.text.length), "bloc verrouillé intact");
ok(done.chars === (b - a) + (q2 - p2) && done.fail === 0 && done.frames === 1, "compte : " + JSON.stringify(done));
ok(f1.tags.length === 1 && f1.tags[0].name === "OrdreBidiArabe" && /^v1;len=\d+;d=/.test(f1.tags[0].value), "étiquette de sauvegarde");
var nm = OBA.drawMarkers(doc, list, true);
var ml = doc.layers.list.filter(function (l) { return l.name === "OrdreBidiArabe - reperes"; })[0];
ok(nm === 1 && ml && ml.printable === false && ml.items.length === 2, "repère sur calque non imprimable");

/* 3. Second passage : rien */
var list2 = OBA.analyseDoc(doc, "document", opts);
ok(OBA.buildReport(list2, false, null).totals.islands === 0, "second passage : rien à corriger");

/* 4. Rétablir (avec la bizarrerie « valeur égale au style ignorée ») */
QUIRK.ignoreEqualStyle = true;
var rr = OBA.restoreDoc(doc, "document");
QUIRK.ignoreEqualStyle = false;
ok(dirsOf(s1) === before1, "rétabli malgré la bizarrerie du style : " + dirsOf(s1));
ok(rr.frames === 1 && rr.fail === 0 && f1.tags.length === 0, "étiquette retirée : " + JSON.stringify(rr));
ok(NORMAL.characterAttributes.dirOverride === D.DEFAULT_DIRECTION, "style de caractère remis comme avant");

/* 5. Texte modifié après correction → pas de rétablissement */
OBA.applyAnalysis(OBA.analyseDoc(doc, "document", opts));
s1.text = s1.text + " ";
s1.dirs.push(D.DEFAULT_DIRECTION); s1.characters[s1.text.length - 1] = makeChar(s1, s1.text.length - 1); s1.characters.length = s1.text.length;
var rr2 = OBA.restoreDoc(doc, "document");
ok(rr2.mismatch === 1 && rr2.chars === 0, "texte modifié : rétablissement refusé");

/* 6. Direction forcée nuisible */
var doc2 = makeDoc(true), LA = makeLayer("A", doc2); doc2.layers.list.push(LA); doc2.layers.sync(); doc2.activeLayer = LA;
var s4 = makeStory("سنة 2026 مميزة", ["rtl"]);
var y = s4.text.indexOf("2026");
for (i = y; i < y + 4; i++) { s4.dirs[i] = D.RIGHT_TO_LEFT_DIRECTION; }
var f4 = doc2.addFrame(makeFrame(doc2, LA, s4));
var l4 = OBA.analyseDoc(doc2, "document", opts);
ok(l4[0].harmful === 1, "direction RTL forcée sur des chiffres détectée");
OBA.applyAnalysis(l4);
ok(dirsOf(s4) === "0".repeat(s4.text.length), "remise en direction par défaut");
OBA.drawMarkers(doc2, l4, true);
var ml2 = doc2.layers.list.filter(function (l) { return l.name === "OrdreBidiArabe - reperes"; })[0];
ok(ml2 && ml2.items[0].strokeColor && ml2.items[0].strokeColor.kind === "CMYK", "repère CMJN dans un document CMJN");

/* 7. Texte non indexable et composeur non Moyen-Orient */
var s5 = makeStory("الهاتف: +213 550 12 34 56", ["rtl"]); s5.characters.length = 3;
var s6 = makeStory("الهاتف: +213 550 12 34 56", ["rtl"], ["latin"]);
var doc3 = makeDoc(false), LB = makeLayer("B", doc3); doc3.layers.list.push(LB); doc3.layers.sync(); doc3.activeLayer = LB;
doc3.addFrame(makeFrame(doc3, LB, s5, { bounds: [0, 10, 10, 0] }));
doc3.addFrame(makeFrame(doc3, LB, s6, { bounds: [20, 10, 30, 0] }));
var l5 = OBA.analyseDoc(doc3, "document", opts);
ok(l5[0].skipped === "index", "texte non indexable ignoré");
ok(l5[1].composer === 1 && l5[1].islands === 0, "composeur latin : paragraphe ignoré et compté");
var r5 = OBA.buildReport(l5, false, null);
ok(r5.text.indexOf("sans composeur Moyen-Orient") >= 0, "rapport signale le composeur");

/* 8. Portées : calque actif, sélection (groupe, TextRange), blocs liés */
var doc4 = makeDoc(false), LC = makeLayer("C", doc4), LD = makeLayer("D", doc4);
doc4.layers.list.push(LC, LD); doc4.layers.sync(); doc4.activeLayer = LD;
var s7 = makeStory("حجم 500 ml", ["rtl"]), s8 = makeStory("مشروب 7 Up بارد", ["rtl"]);
var g1 = { typename: "GroupItem", locked: false, hidden: false, parent: LC, pageItems: {} };
var f7 = doc4.addFrame(makeFrame(doc4, LC, s7, { parent: g1, bounds: [0, 1, 1, 0] })); g1.pageItems[0] = f7; g1.pageItems.length = 1;
var f8a = doc4.addFrame(makeFrame(doc4, LD, s8, { bounds: [5, 1, 6, 0] }));
var f8b = doc4.addFrame(makeFrame(doc4, LD, s8, { bounds: [9, 1, 10, 0], previous: f8a }));
ok(OBA.gatherHeads(doc4, "layer").length === 1, "calque actif : 1 article (blocs liés comptés une fois)");
ok(OBA.gatherHeads(doc4, "document").length === 2, "document : 2 articles");
doc4.selection = [g1];
ok(OBA.gatherHeads(doc4, "selection").length === 1 && OBA.gatherHeads(doc4, "selection")[0] === f7, "sélection d'un groupe");
doc4.selection = { typename: "TextRange", story: { textFrames: [f8b] } };
var hs = OBA.gatherHeads(doc4, "selection");
ok(hs.length === 1 && hs[0] === f8a, "sélection au texte → bloc de tête de l'article");
LD.locked = true;
ok(OBA.gatherHeads(doc4, "document").length === 1, "calque verrouillé ignoré");

/* 9. Sélection des blocs à corriger */
LD.locked = false; doc4.selection = [];
var l9 = OBA.analyseDoc(doc4, "document", opts);
var nsel = OBA.selectFrames(doc4, l9);
ok(nsel === 2 && doc4.selection.length === 2, "sélectionner les textes à corriger");


/* 10. Bout en bout : main() avec un ScriptUI factice (clic sur Analyser puis « Appliquer maintenant ») */
(function () {
    var alerts = [], shown = [];
    global.alert = function (m) { alerts.push(String(m)); };
    global.Folder = { userData: "/tmp" };
    global.File = function (p) { this.exists = false; this.open = function () { return false; }; };
    global.File.saveDialog = function () { return null; };
    var plan = { main: "Analyser", applyNow: true };
    function Ctrl(type, text) { this.type = type; this.text = text || ""; this.value = false; this.children = []; }
    Ctrl.prototype.add = function (type, b, text) { var c = new Ctrl(type, text); this.children.push(c); this.root.all.push(c); c.root = this.root; return c; };
    global.Window = function (type, title) { this.type = type; this.title = title; this.all = []; this.root = this; this.children = []; };
    global.Window.prototype.add = Ctrl.prototype.add;
    global.Window.prototype.close = function () { };
    global.Window.prototype.show = function () {
        shown.push(this.title);
        var want = (this.all.length > 10) ? plan.main : (plan.applyNow ? "Appliquer maintenant" : "Fermer"), k;
        for (k = 0; k < this.all.length; k++) {
            if (this.all[k].type === "button" && this.all[k].text === want && this.all[k].onClick) { this.all[k].onClick(); return 1; }
        }
        for (k = 0; k < this.all.length; k++) {
            if (this.all[k].type === "button" && this.all[k].text === "Fermer" && this.all[k].onClick) { this.all[k].onClick(); return 0; }
        }
        return 0;
    };
    var d = makeDoc(false), LL = makeLayer("E", d); d.layers.list.push(LL); d.layers.sync(); d.activeLayer = LL;
    var st = makeStory("الهاتف: +213 550 12 34 56", ["rtl"]);
    d.addFrame(makeFrame(d, LL, st));
    d.selection = [];
    global.app = { locale: "fr_FR", documents: { length: 1 }, activeDocument: d, redraw: function () { } };
    OBA.main();
    ok(shown.length === 3 && alerts.length === 0, "main : dialogue, analyse, résultat sans erreur (" + shown.join(" | ") + " / " + alerts.join(";") + ")");
    ok(dirsOf(st) === "00000000" + "11111111111111111", "main : numéro corrigé " + dirsOf(st));
    plan.main = "Rétablir";
    OBA.main();
    ok(dirsOf(st) === "0".repeat(st.text.length) && /Rétablir : 17/.test(alerts[0] || ""), "main : Rétablir " + alerts[0]);
    alerts.length = 0; global.app.documents.length = 0;
    OBA.main();
    ok(/Aucun document ouvert/.test(alerts[0] || ""), "main : message si aucun document");
    alerts.length = 0; global.app.documents.length = 1; plan.main = "Analyser";
    d.selection = []; /* portée mémorisée = sélection, rien de sélectionné → document par défaut */
    plan.applyNow = false;
    OBA.main();
    ok(alerts.length === 0, "main : analyse seule sans alerte");
    global.app.locale = "en_US"; plan.main = "Analyse";
    OBA.main();
    ok(shown[shown.length - 1] === "Analysis", "main : interface anglaise");
})();

console.log("test-simulation : " + pass + " réussis, " + fail + " échoués");
process.exit(fail ? 1 : 0);
