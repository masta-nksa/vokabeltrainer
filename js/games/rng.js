// Zufall mit Startwert. Eine Partie, die nur aus diesem Generator schöpft,
// lässt sich mit demselben Startwert exakt wiederholen – darauf beruhen die
// Challenges: zwei Personen spielen dieselbe Partie.

/**
 * @typedef {() => number} Rng  Liefert wie Math.random() eine Zahl in [0, 1)
 */

/**
 * mulberry32: klein, schnell, gut genug für Spiele.
 * @param {number} seed
 * @returns {Rng}
 */
export function createRng(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Ein frischer Startwert für eine neue Partie. */
export function randomSeed() {
    return Math.floor(Math.random() * 0x7FFFFFFF);
}

/**
 * Mischt eine Kopie (Fisher-Yates) mit dem gegebenen Generator.
 * @template T
 * @param {T[]} array
 * @param {Rng} rng
 * @returns {T[]}
 */
export function seededShuffle(array, rng) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * @template T
 * @param {T[]} list
 * @param {Rng} rng
 * @returns {T}
 */
export function seededPick(list, rng) {
    return list[Math.floor(rng() * list.length)];
}
