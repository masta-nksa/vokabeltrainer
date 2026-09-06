// Kleine Helfer ohne eigene Zuständigkeit.

/**
 * Mischt eine Kopie des Arrays (Fisher-Yates, gleichverteilt).
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Zieht bis zu `count` verschiedene Werte.
 * @template T
 * @param {T[]} pool
 * @param {number} count
 */
export function sample(pool, count) {
    return shuffle(pool).slice(0, count);
}

/** Entfernt Akzente: aus eleve mit Akzenten wird eleve ohne. */
export function stripDiacritics(text) {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Wie viele Antwortmöglichkeiten ein Auswahl-Modus anbietet. Mehr Optionen
 * heisst mehr zu lesen und weniger Ratewahrscheinlichkeit – darum steigt die
 * Zahl mit der Stufe. Fehlt es an Kandidaten, zeigen die Modi entsprechend
 * weniger an.
 * @param {string} difficulty easy | medium | hard
 */
export function optionCount(difficulty) {
    return { easy: 4, medium: 6, hard: 8 }[difficulty] ?? 4;
}

/**
 * Vereinheitlicht eine Antwort für den Vergleich: Kleinschreibung,
 * zusammengefasste Leerzeichen, kein Satzzeichen am Ende.
 */
export function normalize(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.!?;:]+$/, '');
}

function letterPositions(text) {
    return [...text]
        .map((char, index) => (/\p{L}/u.test(char) ? index : -1))
        .filter(index => index >= 0);
}

const pick = list => list[Math.floor(Math.random() * list.length)];

// Jede Operation arbeitet auf dem aktuellen Zwischenstand, nicht auf dem
// Original – so lassen sich mehrere Fehler nacheinander anwenden (schwerer
// Modus). Liefert null, wenn die Operation auf diesem Text nicht greift.
const OPERATIONS = [
    // Zwei benachbarte Buchstaben vertauschen
    text => {
        const letters = [...text];
        const positions = letterPositions(text);
        const candidates = positions.filter((p, i) =>
            i < positions.length - 1 &&
            positions[i + 1] === p + 1 &&
            letters[p] !== letters[p + 1]);
        if (candidates.length === 0) return null;
        const p = pick(candidates);
        const copy = [...letters];
        [copy[p], copy[p + 1]] = [copy[p + 1], copy[p]];
        return copy.join('');
    },
    // Einen Buchstaben weglassen
    text => {
        const positions = letterPositions(text);
        if (positions.length === 0) return null;
        const p = pick(positions);
        return text.slice(0, p) + text.slice(p + 1);
    },
    // Einen Buchstaben verdoppeln
    text => {
        const positions = letterPositions(text);
        if (positions.length === 0) return null;
        const p = pick(positions);
        return text.slice(0, p) + text[p] + text.slice(p);
    },
    // Einen Akzent verschlucken, der klassische Fehler im Französischen
    text => {
        const plain = stripDiacritics(text);
        return plain === text ? null : plain;
    },
    // Einen Buchstaben durch einen anderen ersetzen
    text => {
        const positions = letterPositions(text);
        if (positions.length === 0) return null;
        const p = pick(positions);
        const letters = [...text];
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'.replace(letters[p].toLowerCase(), '');
        return text.slice(0, p) + pick([...alphabet]) + text.slice(p + 1);
    }
];

// Im leichten Modus nur die offensichtlichen Fehler: fehlender oder
// doppelter Buchstabe. Vertauschung, Akzent- und Ersetzungsfehler sind
// subtiler und bleiben den höheren Stufen vorbehalten.
const SIMPLE_OPERATIONS = [OPERATIONS[1], OPERATIONS[2]];

/**
 * Erzeugt falsche Schreibweisen eines Wortes für den Modus "spelling".
 *
 * Der Aufrufer prüft die Ergebnisse zusätzlich gegen das Original und gegen
 * bereits vergebene Optionen (z.B. andere Wörter der Lektion) – hier wird
 * nur dafür gesorgt, dass innerhalb einer Charge keine Wiederholungen
 * entstehen.
 *
 * @param {string} word
 * @param {number} count
 * @param {{edits?: number, simpleOnly?: boolean}} [difficulty]
 *   `edits`: wie viele Fehler pro Variante kombiniert werden (schwerer Modus
 *   kombiniert mehrere). `simpleOnly`: nur offensichtliche Fehlerarten
 *   verwenden (leichter Modus).
 * @returns {string[]}
 */
export function misspellings(word, count = 3, { edits = 1, simpleOnly = false } = {}) {
    if (letterPositions(word).length < 2) return [];

    const operations = simpleOnly ? SIMPLE_OPERATIONS : OPERATIONS;
    const found = new Set();

    // Grosszügig oft versuchen: manche Operationen greifen bei kurzen Wörtern nicht.
    const maxAttempts = Math.max(60, count * 12);
    for (let attempt = 0; attempt < maxAttempts && found.size < count; attempt++) {
        let variant = word;
        for (let step = 0; step < edits; step++) {
            const next = pick(operations)(variant);
            if (next && next.length > 0) variant = next;
        }
        if (variant !== word) found.add(variant);
    }

    return [...found].slice(0, count);
}
