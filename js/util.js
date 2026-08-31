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

/**
 * Erzeugt falsche Schreibweisen eines Wortes für den Modus "spelling".
 *
 * Jede Variante wird gegen das Original und gegen die bereits erzeugten
 * geprüft. Sonst steht im Quiz zweimal dieselbe oder gar die richtige
 * Antwort zur Auswahl.
 *
 * @param {string} word
 * @param {number} count
 * @returns {string[]}
 */
export function misspellings(word, count = 3) {
    const letters = [...word];
    const positions = letters
        .map((char, index) => (/\p{L}/u.test(char) ? index : -1))
        .filter(index => index >= 0);

    if (positions.length < 2) return [];

    const pick = list => list[Math.floor(Math.random() * list.length)];

    const operations = [
        // Zwei benachbarte Buchstaben vertauschen
        () => {
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
        () => {
            const p = pick(positions);
            return word.slice(0, p) + word.slice(p + 1);
        },
        // Einen Buchstaben verdoppeln
        () => {
            const p = pick(positions);
            return word.slice(0, p) + letters[p] + word.slice(p);
        },
        // Einen Akzent verschlucken, der klassische Fehler im Französischen
        () => {
            const plain = stripDiacritics(word);
            return plain === word ? null : plain;
        },
        // Einen Buchstaben durch einen anderen ersetzen
        () => {
            const p = pick(positions);
            const alphabet = 'abcdefghijklmnopqrstuvwxyz'.replace(letters[p].toLowerCase(), '');
            return word.slice(0, p) + pick([...alphabet]) + word.slice(p + 1);
        }
    ];

    const found = new Set();
    // Grosszügig oft versuchen: manche Operationen greifen bei kurzen Wörtern nicht.
    for (let attempt = 0; attempt < 40 && found.size < count; attempt++) {
        const variant = operations[attempt % operations.length]();
        if (variant && variant !== word && variant.length > 0) found.add(variant);
    }

    return [...found].slice(0, count);
}
