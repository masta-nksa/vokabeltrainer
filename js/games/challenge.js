// Challenge per Link: Eine Partie ist durch ihre Angaben vollständig bestimmt
// (Spiel, Wortschatz, Lektionen, Niveau, Startwert). Wer sie bekommt, spielt
// dieselbe Partie und vergleicht sein Ergebnis mit dem mitgeschickten.
//
// Die Angaben stehen im #-Teil der Adresse. Der geht nie an einen Server und
// in kein Server-Log – darum braucht es dafür weder Konto noch Backend.
// Fälschen lässt sich ein solcher Link; für ein Spiel unter Freunden genügt
// das.

/**
 * @typedef {Object} Challenge
 * @property {1} v            Format-Version
 * @property {string} game
 * @property {string} deck
 * @property {number} ver     Deck-Version, mit der gespielt wurde
 * @property {string[]} units Gewählte Lektionen
 * @property {string} level
 * @property {number} seed
 * @property {{items?: string[]}} [spec]  Vorgaben des Spiels, z.B. die Wörter
 * @property {number} score
 * @property {number} ms
 * @property {string} alias   Spitzname der herausfordernden Person
 */

const VERSION = 1;
const LEVELS = ['basis', 'erweitert', 'expert'];
const MAX_ALIAS = 24;
const MAX_LIST = 60;
const ID = /^[\w.:-]{1,80}$/;

// Spitznamen statt Namen: ein Tier und eine Zahl.
const ANIMALS = ['Renard', 'Hibou', 'Lynx', 'Castor', 'Loup', 'Panda', 'Tigre', 'Lapin', 'Dauphin', 'Faucon', 'Koala', 'Otarie'];

export function randomAlias() {
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `${animal} ${1 + Math.floor(Math.random() * 99)}`;
}

function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

const isIdList = value => Array.isArray(value) && value.length <= MAX_LIST && value.every(entry => typeof entry === 'string' && ID.test(entry));

/**
 * Prüft, was aus einem Link kommt. Ein Link ist fremde Eingabe: lieber
 * verwerfen als etwas Halbes spielen.
 * @param {unknown} data
 * @returns {Challenge | null}
 */
export function validate(data) {
    if (!data || typeof data !== 'object') return null;
    const c = /** @type {Record<string, unknown>} */ (data);

    if (c.v !== VERSION) return null;
    if (typeof c.game !== 'string' || !ID.test(c.game)) return null;
    if (typeof c.deck !== 'string' || !ID.test(c.deck)) return null;
    if (!isIdList(c.units) || c.units.length === 0) return null;
    if (!LEVELS.includes(c.level)) return null;
    for (const key of ['ver', 'seed', 'score', 'ms']) {
        if (!Number.isFinite(c[key]) || c[key] < 0) return null;
    }
    if (typeof c.alias !== 'string' || c.alias.trim() === '') return null;

    const spec = c.spec && typeof c.spec === 'object' && isIdList(c.spec.items) ? { items: c.spec.items } : undefined;

    return {
        v: VERSION,
        game: c.game,
        deck: c.deck,
        ver: c.ver,
        units: c.units,
        level: c.level,
        seed: Math.floor(c.seed),
        ...(spec ? { spec } : {}),
        score: Math.round(c.score),
        ms: Math.round(c.ms),
        alias: c.alias.trim().slice(0, MAX_ALIAS)
    };
}

/** @param {Challenge} challenge */
export function encode(challenge) {
    return toBase64Url(JSON.stringify(challenge));
}

/**
 * @param {string} text
 * @returns {Challenge | null}
 */
export function decode(text) {
    try {
        return validate(JSON.parse(fromBase64Url(text)));
    } catch {
        return null;
    }
}

/**
 * Der Link zu einer Challenge.
 * @param {Challenge} challenge
 * @param {string} base Adresse der App ohne #-Teil
 */
export function linkFor(challenge, base) {
    return `${base.split('#')[0]}#c=${encode(challenge)}`;
}

/**
 * Liest eine Challenge aus dem #-Teil einer Adresse.
 * @param {string} hash z.B. location.hash
 * @returns {Challenge | null}
 */
export function fromHash(hash) {
    const match = /[#&]c=([\w-]+)/.exec(hash);
    return match ? decode(match[1]) : null;
}
