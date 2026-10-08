// Ordnet eine falsche Antwort einer Fehlerklasse zu. Grundlage für das
// Schwächenprofil (docs/KONZEPT.md, Abschnitt 3): nicht nur *dass* etwas
// falsch war, sondern *was* – Akzent vergessen, Genus vertauscht, Wörter
// verwechselt.
//
// Rein regelbasiert und ohne Zugriff auf Speicher oder DOM, damit es sich mit
// node tools/test-learning.mjs prüfen lässt.

import { normalize, stripDiacritics } from '../util.js';

/**
 * @typedef {Object} ErrorEntry
 * @property {string} given        Was eingegeben oder angeklickt wurde
 * @property {ErrorType} type
 * @property {string} [detail]     Bei "letters": swap | missing | double |
 *                                 extra | replace | multiple
 * @property {string} [confusedWith]  Bei "confusion": ID des anderen Eintrags
 * @property {boolean} [tolerated] Als richtig gewertet, aber trotzdem notiert
 *                                 (z.B. fehlender Akzent auf Niveau Basis)
 *
 * @typedef {'accent' | 'gender' | 'number' | 'elision' | 'letters' | 'confusion' | 'unknown'} ErrorType
 */

// Wortpaare, die sich nur im Genus bzw. nur in der Zahl unterscheiden. Kommt
// später ins Sprachprofil; die Reihenfolge innerhalb eines Paars spielt keine
// Rolle.
const PAIRS = {
    fr: {
        gender: [
            ['le', 'la'], ['un', 'une'], ['mon', 'ma'], ['ton', 'ta'], ['son', 'sa'],
            ['il', 'elle'], ['ils', 'elles'], ['ce', 'cette'], ['cet', 'cette']
        ],
        number: [
            ['le', 'les'], ['la', 'les'], ["l'", 'les'], ['un', 'des'], ['une', 'des'],
            ['mon', 'mes'], ['ma', 'mes'], ['ton', 'tes'], ['ta', 'tes'], ['son', 'ses'], ['sa', 'ses'],
            ['il', 'ils'], ['elle', 'elles'], ['est', 'sont'], ['a', 'ont'],
            ['ce', 'ces'], ['cette', 'ces'], ['appelle', 'appellent']
        ]
    },
    en: {
        gender: [['he', 'she'], ['his', 'her'], ['him', 'her'], ['himself', 'herself']],
        number: [['is', 'are'], ['was', 'were'], ['has', 'have'], ['this', 'these'], ['that', 'those']]
    }
};

const VOWEL_START = /^[aeiouyhàâäéèêëîïôöûüù]/;

// Französische Elision: le/la/de/… vor Vokal werden zu l'/d'/…
const ELIDING = { le: "l'", la: "l'", de: "d'", je: "j'", se: "s'", ce: "c'", ne: "n'", me: "m'", te: "t'", que: "qu'" };

/** Zerlegt in Wörter; ein elidiertes l', s', qu' … ist ein eigenes Wort. */
function tokens(text) {
    return normalize(text)
        .replace(/\b(qu|[a-z])'(?=\S)/g, "$1' ")
        .split(' ')
        .filter(Boolean);
}

function inPairs(pairs, a, b) {
    return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/**
 * Unterscheiden sich zwei Wörter nur im Genus oder nur in der Zahl?
 * @returns {'gender' | 'number' | null}
 */
function agreementKind(a, b, code) {
    const pairs = PAIRS[code];
    if (pairs) {
        if (inPairs(pairs.gender, a, b)) return 'gender';
        if (inPairs(pairs.number, a, b)) return 'number';
    }

    const [short, long] = a.length < b.length ? [a, b] : [b, a];
    if (long === short + 's' || long === short + 'x') return 'number';
    if (code === 'fr' && long === short + 'e') return 'gender';
    return null;
}

/** Wendet die Elision an: "le acteur" → "l'acteur". */
function elide(text) {
    const words = tokens(text);
    const out = [];
    for (let i = 0; i < words.length; i++) {
        const next = words[i + 1];
        if (ELIDING[words[i]] && next && VOWEL_START.test(next)) {
            out.push(ELIDING[words[i]] + next);
            i++;
        } else {
            out.push(words[i]);
        }
    }
    return out.join(' ').replace(/' /g, "'");
}

/**
 * Editierdistanz mit Vertauschung benachbarter Zeichen (Damerau, OSA).
 * @param {string} a
 * @param {string} b
 */
export function editDistance(a, b) {
    const x = [...a];
    const y = [...b];
    const d = Array.from({ length: x.length + 1 }, (_, i) =>
        Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

    for (let i = 1; i <= x.length; i++) {
        for (let j = 1; j <= y.length; j++) {
            const cost = x[i - 1] === y[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
    }
    return d[x.length][y.length];
}

/** Welche Art von Buchstabenfehler bei Distanz 1? */
function letterDetail(given, expected) {
    const g = [...given];
    const e = [...expected];

    if (g.length < e.length) return 'missing';

    if (g.length > e.length) {
        // Steht der zusätzliche Buchstabe neben einem gleichen, ist es eine
        // Verdopplung (cousinne), sonst ein fremder Buchstabe.
        const i = g.findIndex((char, k) => char !== e[k]);
        const at = i === -1 ? g.length - 1 : i;
        return g[at] === g[at - 1] || g[at] === g[at + 1] ? 'double' : 'extra';
    }

    const i = g.findIndex((char, k) => char !== e[k]);
    return g[i] === e[i + 1] && g[i + 1] === e[i] ? 'swap' : 'replace';
}

/**
 * Bestimmt die Fehlerklasse einer falschen Antwort.
 *
 * @param {Object} input
 * @param {string} input.given     Die Eingabe
 * @param {string} input.expected  Die richtige Antwort
 * @param {string} [input.lang]    Sprache der Antwort (BCP-47)
 * @param {{id: string, text: string}[]} [input.others]
 *   Andere Einträge der Runde, als Text auf der Antwortseite. Trifft die
 *   Eingabe einen davon, ist es eine Verwechslung.
 * @returns {Omit<ErrorEntry, 'given'>}
 */
export function classify({ given, expected, lang = '', others = [] }) {
    const g = normalize(given);
    const e = normalize(expected);
    const code = lang.slice(0, 2).toLowerCase();

    const other = others.find(entry => normalize(entry.text) === g && normalize(entry.text) !== e);
    if (other) return { type: 'confusion', confusedWith: other.id };

    if (stripDiacritics(g) === stripDiacritics(e)) return { type: 'accent' };

    if (code === 'fr' && (elide(g) === e || elide(e) === g)) return { type: 'elision' };

    const gt = tokens(g);
    const et = tokens(e);
    if (gt.length === et.length) {
        const kinds = gt
            .map((word, i) => (word === et[i] ? 'same' : agreementKind(word, et[i], code)))
            .filter(kind => kind !== 'same');
        if (kinds.length > 0 && kinds.every(Boolean)) {
            return { type: kinds.includes('number') ? 'number' : 'gender' };
        }
    }

    if ([...e].length >= 3) {
        const distance = editDistance(g, e);
        if (distance === 1) return { type: 'letters', detail: letterDetail(g, e) };
        if (distance === 2) return { type: 'letters', detail: 'multiple' };
    }

    return { type: 'unknown' };
}

/**
 * Fehlerklasse einer Variante, deren Entstehung bekannt ist – im Modus
 * "spelling" wurde jede falsche Option durch benannte Operationen erzeugt
 * (misspellings in util.js).
 * @param {string[]} ops
 * @returns {Omit<ErrorEntry, 'given'>}
 */
export function fromOperations(ops) {
    if (ops.length === 0) return { type: 'unknown' };
    if (ops.every(op => op === 'accent')) return { type: 'accent' };
    const letterOps = ops.filter(op => op !== 'accent');
    return { type: 'letters', detail: ops.length === 1 ? letterOps[0] : 'multiple' };
}
