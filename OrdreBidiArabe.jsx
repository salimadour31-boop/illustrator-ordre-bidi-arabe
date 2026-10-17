//@target illustrator
/*
 * OrdreBidiArabe.jsx — v1.0.0
 * (c) 2026 Amirouche Amwanes — Licence MIT (voir LICENSE / see LICENSE)
 *
 * FR : Remet dans le bon ordre, à l'intérieur des paragraphes arabes (RTL),
 *      les numéros de téléphone, nombres à espaces, quantités avec unité
 *      latine, noms de modèles / codes latins avec chiffres, e-mails et sites
 *      que l'algorithme bidirectionnel Unicode affiche à l'envers
 *      (« +213 550 12 34 56 » lu « 56 34 12 550 213+ », « iPhone 15 Pro » lu
 *      « Pro 15 iPhone »). Le script simule l'algorithme Unicode UAX #9 sur
 *      chaque paragraphe, ne touche que les séquences réellement affichées
 *      dans le désordre, et leur applique la « Direction des caractères :
 *      de gauche à droite » d'Illustrator (attribut dirOverride). Il annule
 *      aussi les directions forcées nuisibles (chiffres forcés en RTL =
 *      chiffres inversés, arabe forcé en LTR = lettres à l'envers).
 *      Le contenu du texte n'est jamais modifié ; seule la direction des
 *      caractères change. Bouton Rétablir. Aucun appel réseau.
 * EN : Puts phone numbers, space-grouped numbers, quantities with Latin units,
 *      Latin model names / codes with digits, e-mails and URLs back in reading
 *      order inside Arabic (RTL) paragraphs, where the Unicode bidi algorithm
 *      scrambles them. Simulates UAX #9 per paragraph, fixes only runs that are
 *      really displayed out of order with Illustrator's Left-to-Right
 *      Character Direction (dirOverride), resets harmful forced directions.
 *      Text content is never changed. Restore button. No network access.
 *
 * Statut / Status : NON TESTÉ DANS ILLUSTRATOR — NOT TESTED IN ILLUSTRATOR
 * (syntaxe ES3 vérifiée, moteur testé sous Node contre bidi-js ; voir README).
 * Travaillez sur une copie du document. / Work on a copy of your document.
 *
 * Idée de contournement pour les attributs égaux au style appliqué :
 * sttk3 (Adobe Community, 2024) — réécrit ici, pas de code copié.
 */

var OBA = (function () {
    var VERSION = "1.0.0";

    /* ------------------------------------------------------------------
     * 1. Classes bidirectionnelles Unicode (sous-ensemble utile)
     *    Unicode bidi classes (useful subset of UCD)
     * ------------------------------------------------------------------ */
    var L = 0, R = 1, AL = 2, EN = 3, ES = 4, ET = 5, AN = 6, CS = 7,
        NSM = 8, BN = 9, B = 10, S = 11, WS = 12, ON = 13;
    var CLASS_NAMES = ["L", "R", "AL", "EN", "ES", "ET", "AN", "CS", "NSM", "BN", "B", "S", "WS", "ON"];

    function bidiClass(c) {
        if (c < 0x80) {
            if (c >= 0x30 && c <= 0x39) { return EN; }
            if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) { return L; }
            if (c === 0x03) { return WS; } /* saut de ligne forcé d'Illustrator / Illustrator forced line break */
            if (c === 0x09 || c === 0x0B || c === 0x1F) { return S; }
            if (c === 0x0A || c === 0x0D || (c >= 0x1C && c <= 0x1E)) { return B; }
            if (c === 0x0C || c === 0x20) { return WS; }
            if (c < 0x20 || c === 0x7F) { return BN; }
            if (c === 0x2B || c === 0x2D) { return ES; }
            if (c === 0x23 || c === 0x24 || c === 0x25) { return ET; }
            if (c === 0x2C || c === 0x2E || c === 0x2F || c === 0x3A) { return CS; }
            return ON;
        }
        if (c < 0x0590) {
            if (c === 0x85) { return B; }
            if (c < 0xA0) { return BN; }
            if (c === 0xA0) { return CS; }
            if (c >= 0xA2 && c <= 0xA5) { return ET; }
            if (c === 0xB0 || c === 0xB1) { return ET; }
            if (c === 0xB2 || c === 0xB3 || c === 0xB9) { return EN; }
            if (c === 0xAD) { return BN; }
            if (c === 0xAA || c === 0xB5 || c === 0xBA) { return L; }
            if (c < 0xC0) { return ON; }
            if (c === 0xD7 || c === 0xF7) { return ON; }
            if (c >= 0x02B9 && c <= 0x02BA) { return ON; }
            if (c >= 0x02C2 && c <= 0x02CF) { return ON; }
            if (c >= 0x02D2 && c <= 0x02DF) { return ON; }
            if (c >= 0x02E5 && c <= 0x02ED && c !== 0x02EC) { return ON; }
            if (c >= 0x02EF && c <= 0x02FF) { return ON; }
            if (c >= 0x0300 && c <= 0x036F) { return NSM; }
            if (c === 0x0374 || c === 0x0375 || c === 0x037E || c === 0x0384 || c === 0x0385 || c === 0x0387 || c === 0x03F6) { return ON; }
            if (c >= 0x0483 && c <= 0x0489) { return NSM; }
            if (c === 0x058A || c === 0x058D || c === 0x058E) { return ON; }
            if (c === 0x058F) { return ET; }
            return L;
        }
        if (c <= 0x05FF) { /* hébreu / Hebrew */
            if ((c >= 0x0591 && c <= 0x05BD) || c === 0x05BF || c === 0x05C1 || c === 0x05C2 ||
                c === 0x05C4 || c === 0x05C5 || c === 0x05C7) { return NSM; }
            return R;
        }
        if (c <= 0x06FF) { /* arabe / Arabic */
            if (c <= 0x0605) { return AN; }
            if (c <= 0x0607) { return ON; }
            if (c === 0x0608) { return AL; }
            if (c <= 0x060A) { return ET; }
            if (c === 0x060B) { return AL; }
            if (c === 0x060C) { return CS; }
            if (c === 0x060D) { return AL; }
            if (c <= 0x060F) { return ON; }
            if (c <= 0x061A) { return NSM; }
            if (c <= 0x064A) { return AL; }
            if (c <= 0x065F) { return NSM; }
            if (c <= 0x0669) { return AN; }
            if (c === 0x066A) { return ET; }
            if (c <= 0x066C) { return AN; }
            if (c <= 0x066F) { return AL; }
            if (c === 0x0670) { return NSM; }
            if (c <= 0x06D5) { return AL; }
            if (c <= 0x06DC) { return NSM; }
            if (c === 0x06DD) { return AN; }
            if (c === 0x06DE) { return ON; }
            if (c <= 0x06E4) { return NSM; }
            if (c <= 0x06E6) { return AL; }
            if (c <= 0x06E8) { return NSM; }
            if (c === 0x06E9) { return ON; }
            if (c <= 0x06ED) { return NSM; }
            if (c <= 0x06EF) { return AL; }
            if (c <= 0x06F9) { return EN; }
            return AL;
        }
        if (c <= 0x074F) { /* syriaque / Syriac */
            if (c === 0x0711 || (c >= 0x0730 && c <= 0x074A)) { return NSM; }
            return AL;
        }
        if (c <= 0x077F) { return AL; }
        if (c <= 0x07BF) { return (c >= 0x07A6 && c <= 0x07B0) ? NSM : AL; }
        if (c <= 0x085F) { return R; }
        if (c <= 0x089F) {
            if (c === 0x0890 || c === 0x0891) { return AN; }
            if (c >= 0x0898) { return NSM; }
            return AL;
        }
        if (c <= 0x08FF) {
            if (c >= 0x08CA && c <= 0x08E1) { return NSM; }
            if (c === 0x08E2) { return AN; }
            if (c >= 0x08E3) { return NSM; }
            return AL;
        }
        if (c >= 0x2000 && c <= 0x2BFF) {
            if (c <= 0x200A) { return WS; }
            if (c <= 0x200D) { return BN; }
            if (c === 0x200E) { return L; }
            if (c === 0x200F) { return R; }
            if (c === 0x2028) { return WS; }
            if (c === 0x2029) { return B; }
            if (c >= 0x202A && c <= 0x202E) { return BN; } /* plongements explicites non modélisés */
            if (c === 0x202F) { return CS; }
            if (c >= 0x2030 && c <= 0x2034) { return ET; }
            if (c === 0x2044) { return CS; }
            if (c === 0x205F) { return WS; }
            if (c >= 0x2060 && c <= 0x206F) { return BN; }
            if (c === 0x2070 || (c >= 0x2074 && c <= 0x2079) || (c >= 0x2080 && c <= 0x2089)) { return EN; }
            if (c === 0x207A || c === 0x207B || c === 0x208A || c === 0x208B) { return ES; }
            if (c === 0x2071 || c === 0x207F || (c >= 0x2090 && c <= 0x209C)) { return L; }
            if (c >= 0x20A0 && c <= 0x20CF) { return ET; }
            if (c >= 0x20D0 && c <= 0x20F0) { return NSM; }
            if (c === 0x212E) { return ET; }
            if (c >= 0x2100 && c <= 0x214F) {
                if (c === 0x2102 || c === 0x2107 || (c >= 0x210A && c <= 0x2113) || c === 0x2115 ||
                    (c >= 0x2119 && c <= 0x211D) || c === 0x2124 || c === 0x2126 || c === 0x2128 ||
                    (c >= 0x212A && c <= 0x212D) || (c >= 0x212F && c <= 0x2139) ||
                    (c >= 0x213C && c <= 0x213F) || (c >= 0x2145 && c <= 0x2149) || c === 0x214E) { return L; }
                return ON;
            }
            if (c >= 0x2160 && c <= 0x2188) { return L; }
            if (c === 0x2212) { return ES; }
            if (c === 0x2213) { return ET; }
            if (c >= 0x2488 && c <= 0x249B) { return EN; }
            if (c >= 0x249C && c <= 0x24E9) { return L; }
            return ON;
        }
        if (c >= 0x2D30 && c <= 0x2D7F) { return c === 0x2D7F ? NSM : L; } /* tifinagh */
        if (c === 0x3000) { return WS; }
        if (c >= 0xD800 && c <= 0xDFFF) { return L; }
        if (c >= 0xFB1D && c <= 0xFB4F) {
            if (c === 0xFB1E) { return NSM; }
            if (c === 0xFB29) { return ES; }
            return R;
        }
        if (c >= 0xFB50 && c <= 0xFDFF) {
            if (c === 0xFD3E || c === 0xFD3F || c >= 0xFDFD) { return ON; }
            return AL;
        }
        if (c >= 0xFE00 && c <= 0xFE0F) { return NSM; }
        if (c >= 0xFE20 && c <= 0xFE2F) { return NSM; }
        if (c >= 0xFE50 && c <= 0xFE6F) {
            if (c === 0xFE50 || c === 0xFE52 || c === 0xFE55) { return CS; }
            if (c === 0xFE5F || c === 0xFE69 || c === 0xFE6A) { return ET; }
            if (c === 0xFE62 || c === 0xFE63) { return ES; }
            return ON;
        }
        if (c >= 0xFE70 && c <= 0xFEFE) { return AL; }
        if (c === 0xFEFF) { return BN; }
        if (c >= 0xFF01 && c <= 0xFF5E) {
            if (c >= 0xFF03 && c <= 0xFF05) { return ET; }
            if (c === 0xFF0B || c === 0xFF0D) { return ES; }
            if (c === 0xFF0C || c === 0xFF0E || c === 0xFF0F || c === 0xFF1A) { return CS; }
            if (c >= 0xFF10 && c <= 0xFF19) { return EN; }
            if ((c >= 0xFF21 && c <= 0xFF3A) || (c >= 0xFF41 && c <= 0xFF5A)) { return L; }
            return ON;
        }
        if (c >= 0xFFF9 && c <= 0xFFFD) { return ON; }
        return L;
    }

    function strOf(s) { var a = [], i; for (i = 0; i < s.length; i++) { a.push(s.charCodeAt(i)); } return a; }

    /* Paires de crochets (BD16) / paired brackets */
    var OPEN_BR = { 0x28: 0x29, 0x5B: 0x5D, 0x7B: 0x7D, 0xFF08: 0xFF09, 0xFF3B: 0xFF3D, 0xFF5B: 0xFF5D, 0x2329: 0x232A, 0x3008: 0x3009 };
    var CLOSE_BR = { 0x29: 1, 0x5D: 1, 0x7D: 1, 0xFF09: 1, 0xFF3D: 1, 0xFF5D: 1, 0x232A: 1, 0x3009: 1 };
    function normBr(c) { if (c === 0x2329) { return 0x3008; } if (c === 0x232A) { return 0x3009; } return c; }
    var MIRROR = { 0x28: 0x29, 0x29: 0x28, 0x5B: 0x5D, 0x5D: 0x5B, 0x7B: 0x7D, 0x7D: 0x7B, 0x3C: 0x3E, 0x3E: 0x3C,
        0xAB: 0xBB, 0xBB: 0xAB, 0x2039: 0x203A, 0x203A: 0x2039 };

    function isNI(t) { return t === B || t === S || t === WS || t === ON; }
    function strongDir(t) { if (t === L) { return L; } if (t === R || t === EN || t === AN) { return R; } return -1; }

    /* Résout une suite isolée (sans isolats) : règles W1–W7, N0, N1–N2.
       Resolves one isolating run sequence: rules W1–W7, N0, N1–N2. */
    function resolveRun(run, types, orig, codes, lev, sos, eos) {
        var m = run.length, t = [], j, k, last, e = (lev % 2) ? R : L;
        for (j = 0; j < m; j++) { t[j] = types[run[j]]; }
        /* W1 */
        for (j = 0; j < m; j++) { if (t[j] === NSM) { t[j] = (j === 0) ? sos : t[j - 1]; } }
        /* W2 */
        last = sos;
        for (j = 0; j < m; j++) {
            if (t[j] === L || t[j] === R || t[j] === AL) { last = t[j]; }
            else if (t[j] === EN && last === AL) { t[j] = AN; }
        }
        /* W3 */
        for (j = 0; j < m; j++) { if (t[j] === AL) { t[j] = R; } }
        /* W4 */
        for (j = 1; j < m - 1; j++) {
            if (t[j] === ES && t[j - 1] === EN && t[j + 1] === EN) { t[j] = EN; }
            else if (t[j] === CS) {
                if (t[j - 1] === EN && t[j + 1] === EN) { t[j] = EN; }
                else if (t[j - 1] === AN && t[j + 1] === AN) { t[j] = AN; }
            }
        }
        /* W5 */
        for (j = 0; j < m; j++) {
            if (t[j] === ET) {
                k = j; while (k < m && t[k] === ET) { k++; }
                if ((j > 0 && t[j - 1] === EN) || (k < m && t[k] === EN)) { var x; for (x = j; x < k; x++) { t[x] = EN; } }
                j = k - 1;
            }
        }
        /* W6 */
        for (j = 0; j < m; j++) { if (t[j] === ES || t[j] === ET || t[j] === CS) { t[j] = ON; } }
        /* W7 */
        last = sos;
        for (j = 0; j < m; j++) {
            if (t[j] === L || t[j] === R) { last = t[j]; }
            else if (t[j] === EN && last === L) { t[j] = L; }
        }
        /* N0 — paires de crochets / bracket pairs */
        var pairs = [], stack = [], c, s2, overflow = false;
        for (j = 0; j < m; j++) {
            if (t[j] !== ON) { continue; }
            c = normBr(codes[run[j]]);
            if (OPEN_BR[c] !== undefined) {
                if (stack.length >= 63) { overflow = true; break; }
                stack.push({ close: normBr(OPEN_BR[c]), pos: j });
            } else if (CLOSE_BR[c]) {
                for (s2 = stack.length - 1; s2 >= 0; s2--) {
                    if (stack[s2].close === c) { pairs.push([stack[s2].pos, j]); stack.length = s2; break; }
                }
            }
        }
        if (overflow) { pairs = []; }
        pairs.sort(function (a, b) { return a[0] - b[0]; });
        var pi, a0, b0, foundE, foundO, d, ctx, setTo, o = (e === L) ? R : L;
        for (pi = 0; pi < pairs.length; pi++) {
            a0 = pairs[pi][0]; b0 = pairs[pi][1]; foundE = false; foundO = false; setTo = -1;
            for (j = a0 + 1; j < b0; j++) {
                d = strongDir(t[j]);
                if (d === e) { foundE = true; break; }
                if (d === o) { foundO = true; }
            }
            if (foundE) { setTo = e; }
            else if (foundO) {
                ctx = sos;
                for (j = a0 - 1; j >= 0; j--) { d = strongDir(t[j]); if (d !== -1) { ctx = d; break; } }
                setTo = (ctx === o) ? o : e;
            }
            if (setTo !== -1) {
                t[a0] = setTo; t[b0] = setTo;
                for (j = a0 + 1; j < m && orig[run[j]] === NSM; j++) { t[j] = setTo; }
                for (j = b0 + 1; j < m && orig[run[j]] === NSM; j++) { t[j] = setTo; }
            }
        }
        /* N1 / N2 */
        var before, after;
        for (j = 0; j < m; j++) {
            if (isNI(t[j])) {
                k = j; while (k < m && isNI(t[k])) { k++; }
                before = (j === 0) ? sos : strongDir(t[j - 1]);
                after = (k === m) ? eos : strongDir(t[k]);
                var v = (before === after) ? before : e, y;
                for (y = j; y < k; y++) { t[y] = v; }
                j = k - 1;
            }
        }
        for (j = 0; j < m; j++) { types[run[j]] = t[j]; }
    }

    /* Niveaux d'imbrication d'un paragraphe (sans saut de paragraphe interne).
       ovr[i] : 0 = direction par défaut, 1 = forcée LTR, 2 = forcée RTL.
       Embedding levels of one paragraph. Returns {levels, visual, orig}. */
    function resolveParagraph(codes, ovr, p) {
        var n = codes.length, orig = [], types = [], levels = [], i, t, o;
        for (i = 0; i < n; i++) {
            t = bidiClass(codes[i]); orig[i] = t;
            o = ovr ? (ovr[i] || 0) : 0;
            if (o === 1) { levels[i] = (p % 2 === 0) ? p + 2 : p + 1; if (t !== BN) { t = L; } }
            else if (o === 2) { levels[i] = (p % 2 === 1) ? p + 2 : p + 1; if (t !== BN) { t = R; } }
            else { levels[i] = p; }
            types[i] = t;
        }
        var seq = [];
        for (i = 0; i < n; i++) { if (types[i] !== BN) { seq.push(i); } }
        var runs = [], start = 0, k;
        for (k = 1; k <= seq.length; k++) {
            if (k === seq.length || levels[seq[k]] !== levels[seq[k - 1]]) { runs.push(seq.slice(start, k)); start = k; }
        }
        var r, lev, prevLev, nextLev;
        for (r = 0; r < runs.length; r++) {
            if (!runs[r].length) { continue; }
            lev = levels[runs[r][0]];
            prevLev = (r === 0) ? p : levels[runs[r - 1][0]];
            nextLev = (r === runs.length - 1) ? p : levels[runs[r + 1][0]];
            resolveRun(runs[r], types, orig, codes, lev,
                (Math.max(prevLev, lev) % 2) ? R : L, (Math.max(nextLev, lev) % 2) ? R : L);
        }
        /* I1 / I2 */
        for (i = 0; i < n; i++) {
            if (types[i] === BN) { continue; }
            t = types[i];
            if (levels[i] % 2 === 0) {
                if (t === R) { levels[i] += 1; } else if (t === AN || t === EN) { levels[i] += 2; }
            } else if (t === L || t === EN || t === AN) { levels[i] += 1; }
        }
        for (i = 0; i < n; i++) { if (types[i] === BN) { levels[i] = (i > 0) ? levels[i - 1] : p; } }
        /* L1 + L2 par ligne (saut de ligne forcé U+0003 ou U+2028) / per line */
        var visual = [], ls = 0, le, j;
        while (ls <= n) {
            le = ls; while (le < n && codes[le] !== 0x03 && codes[le] !== 0x2028) { le++; }
            var lineEnd = (le < n) ? le + 1 : n; /* le caractère de saut appartient à la ligne */
            /* L1 */
            var trailing = true;
            for (j = lineEnd - 1; j >= ls; j--) {
                t = orig[j];
                if (t === S || t === B) { levels[j] = p; trailing = true; }
                else if (t === WS || t === BN) { if (trailing) { levels[j] = p; } }
                else { trailing = false; }
            }
            /* L2 */
            var idx = [], maxL = 0, minOdd = 999;
            for (j = ls; j < lineEnd; j++) {
                idx.push(j);
                if (levels[j] > maxL) { maxL = levels[j]; }
                if (levels[j] % 2 === 1 && levels[j] < minOdd) { minOdd = levels[j]; }
            }
            var lv, a, b2, tmp;
            for (lv = maxL; lv >= minOdd && lv > 0; lv--) {
                a = 0;
                while (a < idx.length) {
                    if (levels[idx[a]] >= lv) {
                        b2 = a; while (b2 < idx.length && levels[idx[b2]] >= lv) { b2++; }
                        var lo = a, hi = b2 - 1;
                        while (lo < hi) { tmp = idx[lo]; idx[lo] = idx[hi]; idx[hi] = tmp; lo++; hi--; }
                        a = b2;
                    } else { a++; }
                }
            }
            for (j = 0; j < idx.length; j++) { visual.push(idx[j]); }
            if (lineEnd >= n) { break; }
            ls = lineEnd;
        }
        return { levels: levels, visual: visual, orig: orig };
    }

    /* Position visuelle de chaque caractère logique / visual position of each logical char */
    function visualPositions(res, n) {
        var pos = [], i;
        for (i = 0; i < res.visual.length; i++) { pos[res.visual[i]] = i; }
        for (i = 0; i < n; i++) { if (pos[i] === undefined) { pos[i] = -1; } }
        return pos;
    }

    /* Vrai si la plage [a, b[ s'affiche d'un seul tenant, de gauche à droite, dans l'ordre logique.
       True when [a, b) is shown contiguously, left to right, in logical order. */
    function displayedInOrder(res, a, b, n) {
        var pos = visualPositions(res, n), i;
        for (i = a; i < b - 1; i++) { if (pos[i + 1] !== pos[i] + 1) { return false; } }
        return true;
    }

    /* Ce que le lecteur voit de la plage [a, b[ (ordre visuel gauche → droite, miroirs appliqués).
       What the reader sees of [a, b) (visual order, mirrored brackets). */
    function seenString(s, res, a, b) {
        var out = "", i, li, c;
        for (i = 0; i < res.visual.length; i++) {
            li = res.visual[i];
            if (li >= a && li < b) {
                c = s.charCodeAt(li);
                if (res.levels[li] % 2 === 1 && MIRROR[c] !== undefined) { c = MIRROR[c]; }
                out += String.fromCharCode(c);
            }
        }
        return out;
    }

    /* ------------------------------------------------------------------
     * 2. Repérage des îlots gauche → droite dans un paragraphe arabe
     *    Finding left-to-right islands in an Arabic paragraph
     * ------------------------------------------------------------------ */
    function isDigit(c) { return (c >= 0x30 && c <= 0x39) || (c >= 0x660 && c <= 0x669) || (c >= 0x6F0 && c <= 0x6F9); }
    function isAsciiDigit(c) { return c >= 0x30 && c <= 0x39; }
    function isLatinLetter(c) {
        if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) { return true; }
        if (c >= 0xC0 && c <= 0x2AF) { return c !== 0xD7 && c !== 0xF7; }
        if (c >= 0x1E00 && c <= 0x1EFF) { return true; }
        if (c >= 0x370 && c <= 0x4FF) { return bidiClass(c) === L; }
        if (c >= 0x2D30 && c <= 0x2D6F) { return true; } /* tifinagh */
        return c === 0xB5 || c === 0x2126;
    }
    function isCore(c) { return isDigit(c) || isLatinLetter(c); }
    function isSpace(c) { return c === 0x20 || c === 0xA0 || c === 0x202F || c === 0x2009 || c === 0x2006 || c === 0x2007; }
    function isArabicLetter(c) { var t = bidiClass(c); return t === AL || t === R; }

    var INNER = {}, LEAD = {}, TRAIL = {};
    (function () {
        var inner = [0x2E, 0x2C, 0x3A, 0x2F, 0x2D, 0x2010, 0x2011, 0x2013, 0x2212, 0x2B, 0xD7, 0x2A, 0x23, 0x25,
            0x2030, 0xB0, 0x40, 0x5F, 0x26, 0x27, 0x2019, 0x3D, 0x28, 0x29, 0x5B, 0x5D, 0x7E, 0xB2, 0xB3, 0xB9,
            0xBC, 0xBD, 0xBE, 0x20AC, 0x24, 0xA3, 0xA5, 0x2103, 0x66B, 0x66C, 0x66A, 0x2116, 0xBA, 0xAA, 0xAE, 0x2122, 0x3F, 0x21];
        var lead = [0x2B, 0x2D, 0x2212, 0x28, 0x5B, 0x23, 0x40, 0x24, 0x20AC, 0xA3, 0x7E, 0x2116];
        var trail = [0x29, 0x5D, 0x25, 0x2030, 0x66A, 0xB0, 0x2103, 0xB2, 0xB3, 0xB9, 0x20AC, 0x24, 0xA3, 0xA5, 0xAE, 0x2122, 0x2B];
        var i;
        for (i = 0; i < inner.length; i++) { INNER[inner[i]] = 1; }
        for (i = 0; i < lead.length; i++) { LEAD[lead[i]] = 1; }
        for (i = 0; i < trail.length; i++) { TRAIL[trail[i]] = 1; }
    })();

    /* « ? » et « ! » ne sont admis qu'à l'intérieur d'une URL (après « / » ou « = ») — gérés plus bas. */

    var UNITS = {};
    (function () {
        var u = ("mm cm dm m km mi ft in yd m2 m3 cm2 cm3 km2 mm2 ml cl dl l lt ltr g mg kg t lb lbs oz kcal cal kj j " +
            "w kw kwh wh v a ma mah mbps kbps go gb mo mb ko kb to tb hz khz mhz ghz px pt pc dpi ppp c f da dzd " +
            "eur usd euro euros dinar dinars h min mn s sec ms an ans mois jours pcs pce cv ch hp bar psi kmh mph rpm " +
            "ppm mol pa kpa mpa n nm lm lux db x").split(" ");
        var i; for (i = 0; i < u.length; i++) { UNITS[u[i]] = 1; }
    })();

    function lower(s) { return s.toLowerCase(); }
    function digitCount(s) { var n = 0, i; for (i = 0; i < s.length; i++) { if (isDigit(s.charCodeAt(i))) { n++; } } return n; }
    function letterCount(s) { var n = 0, i; for (i = 0; i < s.length; i++) { if (isLatinLetter(s.charCodeAt(i))) { n++; } } return n; }
    /* chiffres arabes-indiens → ASCII pour les tests de forme / Arabic-Indic digits → ASCII for pattern tests */
    function asciiDigits(s) {
        var out = "", i, c;
        for (i = 0; i < s.length; i++) {
            c = s.charCodeAt(i);
            if (c >= 0x660 && c <= 0x669) { c = c - 0x660 + 0x30; }
            else if (c >= 0x6F0 && c <= 0x6F9) { c = c - 0x6F0 + 0x30; }
            else if (c === 0xA0 || c === 0x202F || c === 0x2009 || c === 0x2006 || c === 0x2007) { c = 0x20; }
            else if (c === 0x2212 || c === 0x2013 || c === 0x2010 || c === 0x2011) { c = 0x2D; }
            else if (c === 0x66B) { c = 0x2C; }
            else if (c === 0x66C) { c = 0x2E; }
            else if (c === 0x66A) { c = 0x25; }
            out += String.fromCharCode(c);
        }
        return out;
    }

    var RX_PHONE_CHARS = /^[+0-9 ().\-\/]+$/;
    function isPhone(t) {
        var a = asciiDigits(t), d = digitCount(a);
        if (!RX_PHONE_CHARS.test(a)) { return false; }
        if (d < 8 || d > 15) { return false; }
        if (!/^(\+|00|0|\(\+?0?\d)/.test(a)) { return false; }
        return /[ .\-\/()]/.test(a) || a.charAt(0) === "+";
    }
    var RX_THOUSANDS = /^[+\-]?\d{1,3}( \d{3})+([.,]\d+)?$/;
    var RX_PLAIN_NUM = /^[+\-~]?[$\u20AC\u00A3]?\d+([.,:\/]\d+)*[%\u2030\u00B0\u00B2\u00B3\u20AC$\u00A3]?$/;

    function isUnitToken(tok) {
        var t = lower(tok).replace(/[\u00B2]/g, "2").replace(/[\u00B3]/g, "3").replace(/^\u00B0/, "");
        if (tok === "%" || tok === "\u2030" || tok === "\u20AC" || tok === "$" || tok === "\u00A3" || tok === "\u00D7" || tok === "*") { return true; }
        if (/^\u00B0[cfCF]$/.test(tok) || tok === "\u2103") { return true; }
        if (t.indexOf("/") > 0) { var parts = t.split("/"); return UNITS[parts[0]] === 1 && UNITS[parts[1]] === 1; }
        return UNITS[t] === 1;
    }
    function isNumToken(tok) { return RX_PLAIN_NUM.test(asciiDigits(tok)); }
    function isNumUnitToken(tok) {
        var a = asciiDigits(tok), m = /^([+\-~]?\d+(?:[.,]\d+)*)([^\d].*)$/.exec(a);
        return !!(m && isUnitToken(m[2]));
    }

    /* Catégorie d'un îlot / island category:
       tel, num, qty, web, ref, range */
    function categorize(t) {
        var a = asciiDigits(t), d = digitCount(a), l = letterCount(a);
        if (/@/.test(a) && l > 0) { return "web"; }
        if (/^(https?:|www\.)/i.test(a) || /[a-z0-9]\.(dz|com|fr|net|org|info|io|co|edu|gov|ma|tn|eg|sa|ae|qa|uk|de|be|ca|app|shop|store)(\/|$)/i.test(a)) { return "web"; }
        if (/^#[^\s]+$/.test(a) && l > 0) { return "web"; }
        if (l === 0) {
            if (isPhone(t)) { return "tel"; }
            if (RX_THOUSANDS.test(a) || RX_PLAIN_NUM.test(a)) { return "num"; }
            if (/ [\-\/,;\u2013\u2014|] |, /.test(t) || /[\u2013\u2014]/.test(t)) { return "range"; }
            if (d > 0 && /^[0-9 .,]+$/.test(a)) { return "range"; } /* nombres juxtaposés : liste */
            return "num";
        }
        /* quantités : nombres, dimensions et unités seulement */
        var toks = a.split(" "), k, hasNum = false, hasUnit = false, ok = true;
        for (k = 0; k < toks.length; k++) {
            var tk = toks[k];
            if (tk === "") { continue; }
            if (isNumToken(tk)) { hasNum = true; }
            else if (isNumUnitToken(tk)) { hasNum = true; hasUnit = true; }
            else if (isUnitToken(tk)) { hasUnit = true; }
            else { ok = false; break; }
        }
        if (ok && hasNum && hasUnit) { return "qty"; }
        return "ref";
    }

    /* Séparateurs de liste ou de plage entourés d'espaces : on coupe l'îlot ici
       (en arabe, une liste ou une plage se lit normalement de droite à gauche). */
    function isListSepAt(s, i, end) {
        var c = s.charCodeAt(i);
        if ((c === 0x2C || c === 0x3B) && i + 1 < end && isSpace(s.charCodeAt(i + 1))) { return true; }
        if ((c === 0x2D || c === 0x2013 || c === 0x2014 || c === 0x2F || c === 0x7C || c === 0x2212) &&
            i > 0 && isSpace(s.charCodeAt(i - 1)) && i + 1 < end && isSpace(s.charCodeAt(i + 1))) { return true; }
        if ((c === 0x2013 || c === 0x2014) && i > 0 && isDigit(s.charCodeAt(i - 1))) { return true; }
        return false;
    }

    /* Coupe [a, b[ aux séparateurs de liste, ou aux espaces entre nombres qui ne sont pas des milliers. */
    function splitIsland(s, a, b, out, keepRanges) {
        var t = s.substring(a, b);
        if (isPhone(t)) { out.push([a, b]); return; }
        if (!keepRanges) {
            var i;
            for (i = a + 1; i < b - 1; i++) {
                if (isListSepAt(s, i, b)) {
                    var l = i, r = i + 1;
                    while (l > a && isSpace(s.charCodeAt(l - 1))) { l--; }
                    while (r < b && isSpace(s.charCodeAt(r))) { r++; }
                    trimPush(s, a, l, out, keepRanges);
                    trimPush(s, r, b, out, keepRanges);
                    return;
                }
            }
            /* nombres seuls séparés par des espaces (pas des milliers) → nombres distincts */
            var at = asciiDigits(t);
            if (letterCount(at) === 0 && / /.test(at) && !RX_THOUSANDS.test(at)) {
                var st = a;
                for (i = a; i <= b; i++) {
                    if (i === b || isSpace(s.charCodeAt(i))) { trimPush(s, st, i, out, keepRanges); st = i + 1; }
                }
                return;
            }
        }
        out.push([a, b]);
    }

    function trimPush(s, a, b, out, keepRanges) {
        var r = trimIsland(s, a, b);
        if (r && r[1] > r[0]) { splitIsland(s, r[0], r[1], out, keepRanges); }
    }

    /* Retire en tête et en fin ce qui ne peut pas border un îlot ; équilibre les parenthèses. */
    function trimIsland(s, a, b) {
        var changed = true, c;
        while (changed && b > a) {
            changed = false;
            while (b > a) {
                c = s.charCodeAt(b - 1);
                if (isCore(c) || TRAIL[c]) { break; }
                b--; changed = true;
            }
            while (a < b) {
                c = s.charCodeAt(a);
                if (isCore(c)) { break; }
                if (LEAD[c]) {
                    var k = a; while (k < b && LEAD[s.charCodeAt(k)]) { k++; }
                    if (k < b && isCore(s.charCodeAt(k)) && k - a <= 3) { break; }
                }
                a++; changed = true;
            }
            if (b <= a) { return null; }
            /* « + » final seulement collé à une lettre ou un chiffre (Canal+, 16+) */
            c = s.charCodeAt(b - 1);
            if (c === 0x2B && !(b - 2 >= a && isCore(s.charCodeAt(b - 2)))) { b--; changed = true; continue; }
            /* parenthèses / crochets non appariés aux bords */
            var t = s.substring(a, b), op = count(t, "(") , cl = count(t, ")"), ob = count(t, "["), cb = count(t, "]");
            if (s.charAt(b - 1) === ")" && cl > op) { b--; changed = true; continue; }
            if (s.charAt(a) === "(" && op > cl) { a++; changed = true; continue; }
            if (s.charAt(b - 1) === "]" && cb > ob) { b--; changed = true; continue; }
            if (s.charAt(a) === "[" && ob > cb) { a++; changed = true; continue; }
            /* parenthèses qui entourent tout l'îlot : on les laisse au texte arabe (règle N0) */
            if (s.charAt(a) === "(" && s.charAt(b - 1) === ")" && matchingParen(t) === t.length - 1) { a++; b--; changed = true; continue; }
        }
        if (b <= a) { return null; }
        return [a, b];
    }
    function count(t, ch) { var n = 0, i; for (i = 0; i < t.length; i++) { if (t.charAt(i) === ch) { n++; } } return n; }
    function matchingParen(t) {
        var depth = 0, i;
        for (i = 0; i < t.length; i++) {
            if (t.charAt(i) === "(") { depth++; }
            else if (t.charAt(i) === ")") { depth--; if (depth === 0) { return i; } }
        }
        return -1;
    }

    /* Liste des îlots [début, fin[ et catégories / list of islands */
    function findIslands(s, keepRanges) {
        var n = s.length, i = 0, out = [], raw = [], c, j, k;
        while (i < n) {
            c = s.charCodeAt(i);
            var startOk = isCore(c);
            if (!startOk && LEAD[c]) {
                k = i; while (k < n && LEAD[s.charCodeAt(k)] && k - i < 3) { k++; }
                startOk = k < n && isCore(s.charCodeAt(k));
            }
            if (!startOk) { i++; continue; }
            j = i + 1;
            while (j < n) {
                c = s.charCodeAt(j);
                if (isCore(c)) { j++; continue; }
                if (isSpace(c)) {
                    /* une seule espace, suivie d'un caractère d'îlot */
                    if (j + 1 < n && !isSpace(s.charCodeAt(j + 1)) && (isCore(s.charCodeAt(j + 1)) || INNER[s.charCodeAt(j + 1)])) { j++; continue; }
                    break;
                }
                if (c === 0x3F || c === 0x21) { /* ? ! seulement dans une URL */
                    if (/[\/=]/.test(s.substring(i, j)) && /(www\.|https?:|\.[a-z]{2,4}\/)/i.test(s.substring(i, j)) &&
                        j + 1 < n && isCore(s.charCodeAt(j + 1))) { j++; continue; }
                    break;
                }
                if (INNER[c]) { j++; continue; }
                break;
            }
            raw.push([i, j]);
            i = j;
        }
        var r;
        for (r = 0; r < raw.length; r++) { trimPush(s, raw[r][0], raw[r][1], out, keepRanges); }
        var res = [];
        for (r = 0; r < out.length; r++) {
            res.push({ start: out[r][0], end: out[r][1], text: s.substring(out[r][0], out[r][1]), cat: categorize(s.substring(out[r][0], out[r][1])) });
        }
        return res;
    }

    /* ------------------------------------------------------------------
     * 3. Plan de correction d'un paragraphe / correction plan of a paragraph
     * ------------------------------------------------------------------
     * s    : texte du paragraphe (sans \r)        paragraph text
     * ovr  : directions forcées actuelles 0/1/2   current overrides
     * p    : 1 = paragraphe RTL, 0 = LTR           paragraph level
     * opts : { cats: {tel,num,qty,ref,web,range}, resetHarmful }
     * Renvoie / returns { newOvr, changes:[{i,from,to}], islands:[...], harmful:[...], failed:[...] }
     */
    function planParagraph(s, ovr, p, opts) {
        var codes = strOf(s), n = s.length, cur = [], i, j;
        for (i = 0; i < n; i++) { cur[i] = ovr ? (ovr[i] || 0) : 0; }
        var harmful = [], islands = [], failed = [], okCount = 0;
        if (opts.resetHarmful) {
            i = 0;
            while (i < n) {
                if (cur[i] === 0) { i++; continue; }
                j = i; while (j < n && cur[j] === cur[i]) { j++; }
                var ar = 0, lt = 0, x, cc, cl;
                for (x = i; x < j; x++) {
                    cc = codes[x]; cl = bidiClass(cc);
                    if (cl === AL || cl === R) { if (isArabicLetter(cc)) { ar++; } }
                    else if (cl === L || cl === EN || cl === AN) { lt++; }
                }
                var bad = (cur[i] === 2 && lt >= 2) || (cur[i] === 1 && ar >= 2);
                if (bad) {
                    var before = resolveParagraph(codes, cur, p);
                    harmful.push({ start: i, end: j, kind: cur[i] === 2 ? "rtl" : "ltr", text: s.substring(i, j),
                        seen: seenString(s, before, i, j) });
                    for (x = i; x < j; x++) { cur[x] = 0; }
                }
                i = j;
            }
        }
        if (p === 1) {
            var found = findIslands(s, !!(opts.cats && opts.cats.range));
            for (i = 0; i < found.length; i++) {
                var isl = found[i];
                if (isl.end - isl.start < 2) { continue; }
                if (!opts.cats || !opts.cats[isl.cat]) { continue; }
                var hasArabic = false;
                for (j = isl.start; j < isl.end; j++) { if (isArabicLetter(codes[j])) { hasArabic = true; break; } }
                if (hasArabic) { continue; }
                var res = resolveParagraph(codes, cur, p);
                if (displayedInOrder(res, isl.start, isl.end, n)) { okCount++; continue; }
                var trial = cur.slice();
                for (j = isl.start; j < isl.end; j++) { trial[j] = 1; }
                var res2 = resolveParagraph(codes, trial, p);
                if (!displayedInOrder(res2, isl.start, isl.end, n)) {
                    failed.push({ start: isl.start, end: isl.end, text: isl.text, cat: isl.cat });
                    continue;
                }
                islands.push({ start: isl.start, end: isl.end, text: isl.text, cat: isl.cat,
                    seen: seenString(s, res, isl.start, isl.end), after: seenString(s, res2, isl.start, isl.end) });
                cur = trial;
            }
        }
        var changes = [];
        for (i = 0; i < n; i++) { if (cur[i] !== (ovr ? (ovr[i] || 0) : 0)) { changes.push({ i: i, from: ovr ? (ovr[i] || 0) : 0, to: cur[i] }); } }
        return { newOvr: cur, changes: changes, islands: islands, harmful: harmful, failed: failed, okCount: okCount };
    }

    function hasRTLLetters(s) {
        var i; for (i = 0; i < s.length; i++) { if (isArabicLetter(s.charCodeAt(i))) { return true; } }
        return false;
    }

    /* ------------------------------------------------------------------
     * 4. Couche Illustrator / Illustrator layer
     * ------------------------------------------------------------------ */
    var TAG_NAME = "OrdreBidiArabe";
    var MARK_LAYER = "OrdreBidiArabe - reperes";
    var LANG_FR = true;
    function T(fr, en) { return LANG_FR ? fr : en; }
    function setLang(fr) { LANG_FR = !!fr; }

    var CAT_LABEL = {
        tel: ["Téléphone", "Phone"], num: ["Nombre", "Number"], qty: ["Quantité", "Quantity"],
        ref: ["Nom / code latin", "Latin name / code"], web: ["E-mail / site", "E-mail / web"], range: ["Plage / liste", "Range / list"]
    };
    function catLabel(c) { var l = CAT_LABEL[c] || [c, c]; return T(l[0], l[1]); }

    function dirCode(v) {
        if (v === undefined || v === null) { return 0; }
        try {
            if (v == DirOverrideType.LEFT_TO_RIGHT_DIRECTION) { return 1; }
            if (v == DirOverrideType.RIGHT_TO_LEFT_DIRECTION) { return 2; }
            if (v == DirOverrideType.DEFAULT_DIRECTION) { return 0; }
        } catch (e) { }
        var s = String(v);
        if (s.indexOf("LEFT_TO_RIGHT") >= 0) { return 1; }
        if (s.indexOf("RIGHT_TO_LEFT") >= 0) { return 2; }
        return 0;
    }
    function dirEnum(code) {
        if (code === 1) { return DirOverrideType.LEFT_TO_RIGHT_DIRECTION; }
        if (code === 2) { return DirOverrideType.RIGHT_TO_LEFT_DIRECTION; }
        return DirOverrideType.DEFAULT_DIRECTION;
    }
    function readDir(ch) { try { return dirCode(ch.characterAttributes.dirOverride); } catch (e) { return 0; } }

    /* Applique une direction à un caractère et vérifie. Illustrator ignore parfois une valeur
       locale égale à celle du style de caractère appliqué : on change alors le style un instant
       (contournement décrit par sttk3 pour la direction de paragraphe), puis on le remet.
       Sets a character direction and checks it; works around values equal to the applied style. */
    function setDir(ch, code) {
        try { ch.characterAttributes.dirOverride = dirEnum(code); } catch (e) { }
        if (readDir(ch) === code) { return true; }
        try {
            var st = ch.characterStyles[0], saved = st.characterAttributes.dirOverride;
            if (dirCode(saved) === code) {
                st.characterAttributes.dirOverride = dirEnum(code === 0 ? 1 : 0);
                ch.characterAttributes.dirOverride = dirEnum(code);
                st.characterAttributes.dirOverride = saved;
            }
        } catch (e2) { }
        return readDir(ch) === code;
    }

    function paraIsRTL(pa) {
        var v; try { v = pa.paragraphDirection; } catch (e) { return false; }
        if (v === undefined || v === null) { return false; }
        try { if (v == ParagraphDirectionType.RIGHT_TO_LEFT_DIRECTION) { return true; } } catch (e2) { }
        return String(v).indexOf("RIGHT_TO_LEFT") >= 0;
    }
    function composerOK(pa) {
        var v; try { v = pa.composerEngine; } catch (e) { return true; }
        if (v === undefined || v === null) { return true; }
        try { if (v == ComposerEngineType.optycaComposer) { return true; } } catch (e2) { }
        return String(v).toLowerCase().indexOf("optyca") >= 0;
    }

    function isEditable(item) {
        var p = item, guard = 0;
        try {
            while (p && p.typename !== "Document" && guard < 100) {
                if (p.typename === "Layer") { if (p.locked || !p.visible) { return false; } }
                else { if (p.locked || p.hidden) { return false; } }
                p = p.parent; guard++;
            }
        } catch (e) { return false; }
        return true;
    }
    function inLayer(item, layer) {
        var p, guard = 0;
        try { p = item.layer; } catch (e) { return false; }
        while (p && guard < 100) {
            try { if (p === layer) { return true; } } catch (e1) { }
            try { if (p.name === layer.name && p.typename === "Layer") { return true; } } catch (e2) { }
            try { p = (p.parent && p.parent.typename === "Layer") ? p.parent : null; } catch (e3) { p = null; }
            guard++;
        }
        return false;
    }
    function frameKey(f) {
        var k = "";
        try { k += String(f.geometricBounds); } catch (e) { }
        try { k += "|" + f.contents.length + "|" + f.contents.substring(0, 40); } catch (e2) { }
        try { k += "|" + f.layer.name; } catch (e3) { }
        return k;
    }

    /* Blocs de tête des articles à traiter / head frames of the stories to process */
    function gatherHeads(doc, scope) {
        var heads = [], keys = {};
        function addFrame(f) {
            if (!f || f.typename !== "TextFrame") { return; }
            var h = f, g = 0;
            try { while (h.previousFrame && g < 1000) { h = h.previousFrame; g++; } } catch (e) { }
            if (!isEditable(h)) { return; }
            var key = frameKey(h);
            if (keys[key]) { return; }
            keys[key] = 1; heads.push(h);
        }
        function walk(it) {
            if (!it) { return; }
            var tn = it.typename, i;
            if (tn === "TextFrame") { addFrame(it); }
            else if (tn === "GroupItem") { for (i = 0; i < it.pageItems.length; i++) { walk(it.pageItems[i]); } }
            else if (tn === "TextRange") { try { addFrame(it.story.textFrames[0]); } catch (e) { } }
        }
        var i;
        if (scope === "selection") {
            var sel = doc.selection;
            if (sel && sel.typename === "TextRange") { walk(sel); }
            else if (sel) { for (i = 0; i < sel.length; i++) { walk(sel[i]); } }
        } else {
            for (i = 0; i < doc.textFrames.length; i++) {
                var f = doc.textFrames[i];
                if (scope === "layer" && !inLayer(f, doc.activeLayer)) { continue; }
                if (f.layer && f.layer.name === MARK_LAYER) { continue; }
                addFrame(f);
            }
        }
        return heads;
    }

    function frameName(f) {
        var n = "";
        try { n = f.name; } catch (e) { }
        if (!n) { try { n = f.contents.replace(/[\r\n\u0003]+/g, " ").substring(0, 28); } catch (e2) { n = "?"; } }
        return n;
    }

    /* Analyse d'un article / analyse one story */
    function analyseStory(head, opts) {
        var info = { head: head, name: frameName(head), paras: [], skipped: "", islands: 0, harmful: 0, failed: 0,
            ok: 0, composer: 0, ltrArabic: 0, rtlParas: 0, changes: 0, cats: {} };
        var story, text, chars;
        try { story = head.story; text = story.textRange.contents; chars = story.characters; }
        catch (e) { info.skipped = "read"; return info; }
        info.story = story; info.text = text;
        if (chars.length !== text.length) { info.skipped = "index"; return info; }
        var parts = text.split(/[\r\n]/), off = 0, k, j;
        for (k = 0; k < parts.length; k++) {
            var s = parts[k], po = off;
            off += s.length + 1;
            if (!s.length) { continue; }
            var rtlLetters = hasRTLLetters(s), pa = null, rtl = false;
            try { pa = chars[po].paragraphAttributes; rtl = paraIsRTL(pa); } catch (e1) { pa = null; }
            if (!rtl && !rtlLetters) { continue; }
            if (rtl && pa && !composerOK(pa)) { info.composer++; continue; }
            var ovr = [];
            for (j = 0; j < s.length; j++) { ovr[j] = readDir(chars[po + j]); }
            var plan = planParagraph(s, ovr, rtl ? 1 : 0, opts);
            if (rtl) { info.rtlParas++; }
            else if (arabicMajority(s)) { info.ltrArabic++; }
            info.paras.push({ offset: po, text: s, rtl: rtl, plan: plan });
            info.islands += plan.islands.length; info.harmful += plan.harmful.length;
            info.failed += plan.failed.length; info.ok += plan.okCount; info.changes += plan.changes.length;
            for (j = 0; j < plan.islands.length; j++) {
                var c = plan.islands[j].cat; info.cats[c] = (info.cats[c] || 0) + 1;
            }
        }
        return info;
    }
    function arabicMajority(s) {
        var a = 0, l = 0, i, c;
        for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); if (isArabicLetter(c)) { a++; } else if (isLatinLetter(c)) { l++; } }
        return a > l;
    }

    function analyseDoc(doc, scope, opts) {
        var heads = gatherHeads(doc, scope), list = [], i;
        for (i = 0; i < heads.length; i++) { list.push(analyseStory(heads[i], opts)); }
        return list;
    }

    /* Étiquette de sauvegarde pour Rétablir / backup tag for Restore */
    function findTag(item) {
        try {
            var i;
            for (i = 0; i < item.tags.length; i++) { if (item.tags[i].name === TAG_NAME) { return item.tags[i]; } }
        } catch (e) { }
        return null;
    }
    function parseTag(v) {
        var out = { len: -1, map: {}, order: [] }, parts = String(v).split(";"), i;
        for (i = 0; i < parts.length; i++) {
            if (parts[i].indexOf("len=") === 0) { out.len = parseInt(parts[i].substring(4), 10); }
            else if (parts[i].indexOf("d=") === 0) {
                var es = parts[i].substring(2).split(","), k;
                for (k = 0; k < es.length; k++) {
                    var kv = es[k].split(":");
                    if (kv.length === 2) {
                        var o = parseInt(kv[0], 10), val = parseInt(kv[1], 10);
                        if (!isNaN(o) && !isNaN(val) && out.map[o] === undefined) { out.map[o] = val; out.order.push(o); }
                    }
                }
            }
        }
        return out;
    }
    function saveTag(item, entries, len) {
        var tag = findTag(item), old = tag ? parseTag(tag.value) : { len: len, map: {}, order: [] }, i;
        if (old.len !== len) { old = { len: len, map: {}, order: [] }; }
        for (i = 0; i < entries.length; i++) {
            if (old.map[entries[i].i] === undefined) { old.map[entries[i].i] = entries[i].from; old.order.push(entries[i].i); }
        }
        var d = [];
        for (i = 0; i < old.order.length; i++) { d.push(old.order[i] + ":" + old.map[old.order[i]]); }
        try {
            if (!tag) { tag = item.tags.add(); tag.name = TAG_NAME; }
            tag.value = "v1;len=" + len + ";d=" + d.join(",");
            return true;
        } catch (e) { return false; }
    }

    function applyAnalysis(list) {
        var done = { chars: 0, fail: 0, frames: 0, islands: 0, harmful: 0, tagFail: 0 }, i, k, j;
        for (i = 0; i < list.length; i++) {
            var info = list[i];
            if (info.skipped || !info.changes) { continue; }
            var chars = info.story.characters, rec = [];
            for (k = 0; k < info.paras.length; k++) {
                var pr = info.paras[k], ch = pr.plan.changes;
                for (j = 0; j < ch.length; j++) {
                    var idx = pr.offset + ch[j].i;
                    if (setDir(chars[idx], ch[j].to)) { done.chars++; rec.push({ i: idx, from: ch[j].from }); }
                    else { done.fail++; }
                }
                done.islands += pr.plan.islands.length; done.harmful += pr.plan.harmful.length;
            }
            if (rec.length) {
                done.frames++;
                if (!saveTag(info.head, rec, info.text.length)) { done.tagFail++; }
            }
        }
        return done;
    }

    function restoreDoc(doc, scope) {
        var heads = gatherHeads(doc, scope), res = { frames: 0, chars: 0, mismatch: 0, fail: 0 }, i, k;
        for (i = 0; i < heads.length; i++) {
            var tag = findTag(heads[i]);
            if (!tag) { continue; }
            var data = parseTag(tag.value), story = heads[i].story, text = story.textRange.contents;
            if (data.len !== text.length) { res.mismatch++; continue; }
            var chars = story.characters, okAll = true;
            for (k = 0; k < data.order.length; k++) {
                if (setDir(chars[data.order[k]], data.map[data.order[k]])) { res.chars++; } else { res.fail++; okAll = false; }
            }
            if (okAll) { try { tag.remove(); } catch (e) { } }
            res.frames++;
        }
        return res;
    }

    /* Repères sur calque non imprimable / markers on a non-printing layer */
    function getMarkLayer(doc, create) {
        var lay = null, i;
        for (i = 0; i < doc.layers.length; i++) { if (doc.layers[i].name === MARK_LAYER) { lay = doc.layers[i]; break; } }
        if (lay) {
            try { lay.locked = false; lay.visible = true; } catch (e) { }
            if (create) { try { while (lay.pageItems.length) { lay.pageItems[0].remove(); } } catch (e2) { } }
            return lay;
        }
        if (!create) { return null; }
        lay = doc.layers.add(); lay.name = MARK_LAYER;
        try { lay.printable = false; } catch (e3) { }
        try { lay.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (e4) { }
        return lay;
    }
    function makeColor(doc, kind) {
        var rgb = kind === "red" ? [230, 30, 40] : (kind === "green" ? [20, 160, 80] : [255, 130, 0]), c;
        var isCMYK = false;
        try { isCMYK = String(doc.documentColorSpace).indexOf("CMYK") >= 0; } catch (e) { }
        if (isCMYK) {
            c = new CMYKColor();
            if (kind === "red") { c.cyan = 0; c.magenta = 95; c.yellow = 90; c.black = 0; }
            else if (kind === "green") { c.cyan = 80; c.magenta = 0; c.yellow = 90; c.black = 0; }
            else { c.cyan = 0; c.magenta = 55; c.yellow = 100; c.black = 0; }
        } else { c = new RGBColor(); c.red = rgb[0]; c.green = rgb[1]; c.blue = rgb[2]; }
        return c;
    }
    function drawMarker(doc, lay, frame, label, kind) {
        try {
            var b = frame.visibleBounds, col = makeColor(doc, kind);
            var r = lay.pathItems.rectangle(b[1] + 3, b[0] - 3, (b[2] - b[0]) + 6, (b[1] - b[3]) + 6);
            r.filled = false; r.stroked = true; r.strokeWidth = 1; r.strokeColor = col;
            try { r.strokeDashes = [4, 2]; } catch (e1) { }
            var t = lay.textFrames.pointText([b[0] - 3, b[1] + 6]);
            t.contents = label;
            try { t.textRange.characterAttributes.size = 7; t.textRange.characterAttributes.fillColor = col; } catch (e2) { }
            return true;
        } catch (e) { return false; }
    }
    function drawMarkers(doc, list, applied) {
        var lay = null, i, n = 0;
        for (i = 0; i < list.length; i++) {
            var info = list[i];
            if (info.skipped || (!info.islands && !info.harmful && !info.failed)) { continue; }
            if (!lay) { lay = getMarkLayer(doc, true); }
            var kind = info.failed ? "red" : (applied ? "green" : "orange");
            var label = (applied ? T("corrigé : ", "fixed: ") : T("à corriger : ", "to fix: ")) + (info.islands + info.harmful) +
                (info.failed ? T(" ; non corrigeable : ", " ; not fixable: ") + info.failed : "");
            if (drawMarker(doc, lay, info.head, label, kind)) { n++; }
        }
        if (!lay) { lay = getMarkLayer(doc, false); if (lay) { try { while (lay.pageItems.length) { lay.pageItems[0].remove(); } } catch (e) { } } }
        return n;
    }

    function selectFrames(doc, list) {
        var arr = [], i;
        for (i = 0; i < list.length; i++) { if (!list[i].skipped && (list[i].changes || list[i].failed)) { arr.push(list[i].head); } }
        try { doc.selection = null; } catch (e) { }
        try { if (arr.length) { doc.selection = arr; } } catch (e2) {
            for (i = 0; i < arr.length; i++) { try { arr[i].selected = true; } catch (e3) { } }
        }
        return arr.length;
    }

    /* Rapport texte / text report */
    function buildReport(list, applied, done) {
        var tot = { frames: list.length, skipped: 0, rtl: 0, ok: 0, islands: 0, harmful: 0, failed: 0, composer: 0, ltrArabic: 0, cats: {} };
        var lines = [], ex = [], i, k, j, c;
        for (i = 0; i < list.length; i++) {
            var f = list[i];
            if (f.skipped) { tot.skipped++; continue; }
            tot.rtl += f.rtlParas; tot.ok += f.ok; tot.islands += f.islands; tot.harmful += f.harmful;
            tot.failed += f.failed; tot.composer += f.composer; tot.ltrArabic += f.ltrArabic;
            for (c in f.cats) { if (f.cats.hasOwnProperty(c)) { tot.cats[c] = (tot.cats[c] || 0) + f.cats[c]; } }
            for (k = 0; k < f.paras.length; k++) {
                var pl = f.paras[k].plan;
                for (j = 0; j < pl.harmful.length; j++) {
                    ex.push("[" + f.name + "] " + (pl.harmful[j].kind === "rtl" ?
                        T("Direction forcée RTL sur « ", "Forced RTL direction on « ") :
                        T("Direction forcée LTR sur l'arabe « ", "Forced LTR direction on Arabic « ")) +
                        pl.harmful[j].text + T(" » (vu « ", " » (seen « ") + pl.harmful[j].seen + T(" ») → direction par défaut", " ») → default direction"));
                }
                for (j = 0; j < pl.islands.length; j++) {
                    ex.push("[" + f.name + "] " + catLabel(pl.islands[j].cat) + T(" : vu « ", ": seen « ") + pl.islands[j].seen +
                        " » → « " + pl.islands[j].after + " »");
                }
                for (j = 0; j < pl.failed.length; j++) {
                    ex.push("[" + f.name + "] " + T("NON CORRIGEABLE : « ", "NOT FIXABLE: « ") + pl.failed[j].text + " »");
                }
            }
        }
        lines.push("OrdreBidiArabe v" + VERSION + (applied ? T(" — correction appliquée", " — correction applied") : T(" — analyse (rien n'a été modifié)", " — analysis (nothing changed)")));
        lines.push("");
        lines.push(T("Blocs de texte examinés : ", "Text objects checked: ") + tot.frames + (tot.skipped ? T(" (dont non lisibles ignorés : ", " (unreadable, skipped: ") + tot.skipped + ")" : ""));
        lines.push(T("Paragraphes arabes (sens RTL) examinés : ", "Arabic (RTL) paragraphs checked: ") + tot.rtl);
        lines.push(T("Séquences latines / chiffrées déjà dans le bon ordre : ", "Latin / numeric runs already in order: ") + tot.ok);
        var cl = [];
        for (c in tot.cats) { if (tot.cats.hasOwnProperty(c)) { cl.push(catLabel(c) + " " + tot.cats[c]); } }
        lines.push(T("Séquences affichées dans le désordre : ", "Runs displayed out of order: ") + tot.islands + (cl.length ? " (" + cl.join(", ") + ")" : ""));
        lines.push(T("Directions forcées qui inversent le texte : ", "Forced directions that reverse text: ") + tot.harmful);
        if (tot.failed) { lines.push(T("Non corrigeables automatiquement : ", "Not fixable automatically: ") + tot.failed); }
        if (tot.composer) { lines.push(T("Paragraphes RTL sans composeur Moyen-Orient (ignorés) : ", "RTL paragraphs without Middle Eastern composer (skipped): ") + tot.composer); }
        if (tot.ltrArabic) { lines.push(T("Paragraphes surtout arabes en sens LTR (îlots non traités, réglez d'abord le sens du paragraphe) : ", "Mostly Arabic paragraphs set LTR (islands not processed, fix paragraph direction first): ") + tot.ltrArabic); }
        if (applied && done) {
            lines.push(T("Caractères modifiés : ", "Characters changed: ") + done.chars + T(" dans ", " in ") + done.frames + T(" bloc(s)", " object(s)") +
                (done.fail ? T(" ; échecs : ", " ; failures: ") + done.fail : "") +
                (done.tagFail ? T(" ; sauvegarde pour Rétablir impossible sur ", " ; restore backup failed on ") + done.tagFail : ""));
        }
        lines.push("");
        if (ex.length) {
            lines.push(T("Détail (« vu » = ce que le lecteur voit, de gauche à droite) :", "Details (« seen » = what the reader sees, left to right):"));
            for (i = 0; i < ex.length && i < 400; i++) { lines.push("  " + ex[i]); }
            if (ex.length > 400) { lines.push("  … +" + (ex.length - 400)); }
        } else {
            lines.push(T("Rien à corriger.", "Nothing to fix."));
        }
        return { text: lines.join("\n"), totals: tot, examples: ex.length };
    }

    /* ------------------------------------------------------------------
     * 5. Réglages, dialogue, point d'entrée / settings, dialog, entry point
     * ------------------------------------------------------------------ */
    var DEFAULTS = { scope: "selection", tel: true, num: true, qty: true, ref: true, web: true, range: false,
        resetHarmful: true, markers: true, report: false };

    function cfgFile() { try { return new File(Folder.userData + "/OrdreBidiArabe.cfg"); } catch (e) { return null; } }
    function loadCfg() {
        var c = {}, k;
        for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { c[k] = DEFAULTS[k]; } }
        var f = cfgFile();
        try {
            if (f && f.exists && f.open("r")) {
                while (!f.eof) {
                    var line = f.readln(), p = line.indexOf("=");
                    if (p > 0) {
                        var key = line.substring(0, p), val = line.substring(p + 1);
                        if (DEFAULTS.hasOwnProperty(key)) { c[key] = (typeof DEFAULTS[key] === "boolean") ? (val === "1") : val; }
                    }
                }
                f.close();
            }
        } catch (e) { }
        return c;
    }
    function saveCfg(c) {
        var f = cfgFile(), k;
        try {
            if (f && f.open("w")) {
                for (k in DEFAULTS) {
                    if (DEFAULTS.hasOwnProperty(k)) { f.writeln(k + "=" + ((typeof DEFAULTS[k] === "boolean") ? (c[k] ? "1" : "0") : c[k])); }
                }
                f.close();
            }
        } catch (e) { }
    }

    function optsFromCfg(c) {
        return { cats: { tel: c.tel, num: c.num, qty: c.qty, ref: c.ref, web: c.web, range: c.range }, resetHarmful: c.resetHarmful };
    }

    function showText(title, text, offerApply) {
        var w = new Window("dialog", title), res = false;
        w.orientation = "column"; w.alignChildren = ["fill", "top"];
        var e = w.add("edittext", undefined, text, { multiline: true, readonly: true, scrolling: true });
        e.preferredSize = [640, 380];
        var g = w.add("group"); g.alignment = ["right", "top"];
        if (offerApply) {
            var bA = g.add("button", undefined, T("Appliquer maintenant", "Apply now"));
            bA.onClick = function () { res = true; w.close(1); };
        }
        var bC = g.add("button", undefined, T("Fermer", "Close"), { name: "ok" });
        bC.onClick = function () { w.close(0); };
        w.show();
        return res;
    }

    function writeReport(text) {
        try {
            var f = File.saveDialog(T("Enregistrer le rapport", "Save report"), "*.txt");
            if (!f) { return; }
            if (!/\.txt$/i.test(f.name)) { f = new File(f.fsName + ".txt"); }
            f.encoding = "UTF-8";
            if (f.open("w")) { f.write("\uFEFF" + text); f.close(); }
        } catch (e) { }
    }

    function dialog(cfg, hasSel) {
        var w = new Window("dialog", "OrdreBidiArabe v" + VERSION + T(" — ordre des nombres et du latin dans l'arabe", " — numbers & Latin order in Arabic"));
        w.orientation = "column"; w.alignChildren = ["fill", "top"]; w.spacing = 8;
        var intro = w.add("statictext", undefined,
            T("Remet de gauche à droite, dans les paragraphes arabes (RTL), les séquences que l'algorithme bidirectionnel affiche à l'envers. Seule la Direction des caractères change ; le texte n'est jamais modifié.",
              "Puts back left to right, inside Arabic (RTL) paragraphs, the runs the bidi algorithm displays out of order. Only Character Direction changes; text is never modified."),
            { multiline: true });
        intro.preferredSize = [520, 44];

        var pS = w.add("panel", undefined, T("Portée", "Scope")); pS.orientation = "row";
        var rSel = pS.add("radiobutton", undefined, T("Sélection", "Selection"));
        var rLay = pS.add("radiobutton", undefined, T("Calque actif", "Active layer"));
        var rDoc = pS.add("radiobutton", undefined, T("Document", "Document"));
        var sc = cfg.scope; if (sc === "selection" && !hasSel) { sc = "document"; }
        rSel.value = sc === "selection"; rLay.value = sc === "layer"; rDoc.value = sc === "document";

        var pC = w.add("panel", undefined, T("Séquences à remettre dans l'ordre", "Runs to put back in order"));
        pC.orientation = "column"; pC.alignChildren = ["left", "top"];
        var cTel = pC.add("checkbox", undefined, T("Téléphones / fax  (+213 550 12 34 56 · 0550 12 34 56 · (021) 23 45 67)", "Phone / fax  (+213 550 12 34 56 · 0550 12 34 56 · (021) 23 45 67)"));
        var cNum = pC.add("checkbox", undefined, T("Nombres à espaces ou à signe  (1 500 000 · -5 · +20%)", "Space-grouped or signed numbers  (1 500 000 · -5 · +20%)"));
        var cQty = pC.add("checkbox", undefined, T("Quantités avec unité latine  (500 ml · 30 x 40 cm · 1 500 DA · -5 °C)", "Quantities with Latin units  (500 ml · 30 x 40 cm · 1 500 DA · -5 °C)"));
        var cRef = pC.add("checkbox", undefined, T("Noms, modèles et codes latins  (100% Natural · 7 Up · 2 en 1 · 3 Suisses)", "Latin names, models, codes  (100% Natural · 7 Up · 2 in 1 · 3 Suisses)"));
        var cWeb = pC.add("checkbox", undefined, T("E-mails, sites, @comptes, #mots-dièse", "E-mails, websites, @handles, #hashtags"));
        var cRng = pC.add("checkbox", undefined, T("Plages et listes aussi  (10 - 20 · 3, 5, 7) — en arabe elles se lisent d'habitude de droite à gauche", "Ranges and lists too  (10 - 20 · 3, 5, 7) — in Arabic these usually read right to left"));
        cTel.value = cfg.tel; cNum.value = cfg.num; cQty.value = cfg.qty; cRef.value = cfg.ref; cWeb.value = cfg.web; cRng.value = cfg.range;

        var pO = w.add("panel", undefined, T("Options", "Options")); pO.orientation = "column"; pO.alignChildren = ["left", "top"];
        var cHarm = pO.add("checkbox", undefined, T("Annuler les directions forcées qui inversent (chiffres forcés en RTL, arabe forcé en LTR)", "Reset forced directions that reverse text (digits forced RTL, Arabic forced LTR)"));
        var cMark = pO.add("checkbox", undefined, T("Repères sur un calque non imprimable", "Markers on a non-printing layer"));
        var cRep = pO.add("checkbox", undefined, T("Enregistrer un rapport .txt", "Save a .txt report"));
        cHarm.value = cfg.resetHarmful; cMark.value = cfg.markers; cRep.value = cfg.report;

        var note = w.add("statictext", undefined, T("Conseil : travaillez sur une copie du document. Rétablir remet les directions d'origine (si le texte n'a pas changé depuis).",
            "Tip: work on a copy. Restore puts back the original directions (if the text has not changed since)."), { multiline: true });
        note.preferredSize = [520, 30];

        var g = w.add("group"); g.alignment = ["fill", "top"];
        var bAn = g.add("button", undefined, T("Analyser", "Analyse"));
        var bSe = g.add("button", undefined, T("Sélectionner les textes", "Select texts"));
        var bRe = g.add("button", undefined, T("Rétablir", "Restore"));
        var bAp = g.add("button", undefined, T("Appliquer", "Apply"), { name: "ok" });
        var bCa = g.add("button", undefined, T("Fermer", "Close"), { name: "cancel" });
        var action = null;
        function collect() {
            cfg.scope = rSel.value ? "selection" : (rLay.value ? "layer" : "document");
            cfg.tel = cTel.value; cfg.num = cNum.value; cfg.qty = cQty.value; cfg.ref = cRef.value; cfg.web = cWeb.value; cfg.range = cRng.value;
            cfg.resetHarmful = cHarm.value; cfg.markers = cMark.value; cfg.report = cRep.value;
        }
        bAn.onClick = function () { collect(); action = "analyse"; w.close(1); };
        bSe.onClick = function () { collect(); action = "select"; w.close(1); };
        bRe.onClick = function () { collect(); action = "restore"; w.close(1); };
        bAp.onClick = function () { collect(); action = "apply"; w.close(1); };
        bCa.onClick = function () { action = null; w.close(0); };
        w.show();
        return action;
    }

    function main() {
        try { setLang(String(app.locale).toLowerCase().indexOf("fr") === 0); } catch (e0) { setLang(true); }
        if (!app.documents.length) {
            alert(T("Aucun document ouvert. Ouvrez un document Illustrator puis relancez OrdreBidiArabe.",
                "No document open. Open an Illustrator document and run OrdreBidiArabe again."));
            return;
        }
        if (typeof DirOverrideType === "undefined") {
            alert(T("Cette version d'Illustrator n'expose pas la Direction des caractères (DirOverrideType) aux scripts. Il faut une version avec les fonctions Moyen-Orient (CC 2018 ou plus récente).",
                "This Illustrator version does not expose Character Direction (DirOverrideType) to scripts. A version with Middle Eastern features is required (CC 2018 or later)."));
            return;
        }
        var doc = app.activeDocument, cfg = loadCfg();
        var sel = doc.selection, hasSel = !!(sel && (sel.typename === "TextRange" || sel.length > 0));
        var action = dialog(cfg, hasSel);
        if (!action) { return; }
        saveCfg(cfg);
        if (cfg.scope === "selection" && !hasSel) {
            alert(T("Rien n'est sélectionné. Sélectionnez des blocs de texte, ou choisissez Calque actif ou Document.",
                "Nothing is selected. Select text objects, or choose Active layer or Document."));
            return;
        }
        if (action === "restore") {
            var rr = restoreDoc(doc, cfg.scope);
            try { var ml = getMarkLayer(doc, false); if (ml) { ml.remove(); } } catch (eM) { }
            alert(T("Rétablir : ", "Restore: ") + rr.chars + T(" caractère(s) remis dans ", " character(s) restored in ") + rr.frames + T(" bloc(s).", " object(s).") +
                (rr.mismatch ? T("\nTexte modifié depuis la correction (non rétabli) : ", "\nText changed since the fix (not restored): ") + rr.mismatch : "") +
                (rr.fail ? T("\nÉchecs : ", "\nFailures: ") + rr.fail : ""));
            return;
        }
        var opts = optsFromCfg(cfg);
        var list = analyseDoc(doc, cfg.scope, opts);
        if (!list.length) {
            alert(T("Aucun bloc de texte modifiable dans la portée choisie (les objets verrouillés ou masqués sont ignorés).",
                "No editable text object in the chosen scope (locked or hidden objects are skipped)."));
            return;
        }
        if (action === "select") {
            var ns = selectFrames(doc, list);
            alert(ns ? T("Blocs à corriger sélectionnés : ", "Objects to fix selected: ") + ns : T("Rien à corriger.", "Nothing to fix."));
            return;
        }
        var rep;
        if (action === "analyse") {
            rep = buildReport(list, false, null);
            if (cfg.markers) { drawMarkers(doc, list, false); }
            if (cfg.report) { writeReport(rep.text); }
            var go = showText(T("Analyse", "Analysis"), rep.text, rep.totals.islands + rep.totals.harmful > 0);
            if (!go) { return; }
        }
        var done = applyAnalysis(list);
        rep = buildReport(list, true, done);
        if (cfg.markers) { drawMarkers(doc, list, true); }
        try { app.redraw(); } catch (eR) { }
        if (cfg.report) { writeReport(rep.text); }
        showText(T("Résultat", "Result"), rep.text, false);
    }

    return {
        VERSION: VERSION, CLASS_NAMES: CLASS_NAMES, bidiClass: bidiClass, strOf: strOf,
        resolveParagraph: resolveParagraph, displayedInOrder: displayedInOrder, seenString: seenString,
        findIslands: findIslands, categorize: categorize, isPhone: isPhone, planParagraph: planParagraph,
        hasRTLLetters: hasRTLLetters, setLang: setLang, dirCode: dirCode, setDir: setDir,
        gatherHeads: gatherHeads, analyseStory: analyseStory, analyseDoc: analyseDoc, applyAnalysis: applyAnalysis,
        restoreDoc: restoreDoc, parseTag: parseTag, drawMarkers: drawMarkers, selectFrames: selectFrames,
        buildReport: buildReport, optsFromCfg: optsFromCfg, DEFAULTS: DEFAULTS, main: main
    };
})();

if (typeof module !== "undefined" && module.exports) {
    module.exports = OBA;
} else if (typeof app !== "undefined") {
    try { OBA.main(); } catch (err) { alert("OrdreBidiArabe : " + err + (err.line ? " (ligne / line " + err.line + ")" : "")); }
}
