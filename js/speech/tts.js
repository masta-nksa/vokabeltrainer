// Sprachausgabe über die Browser-eigene Sprachsynthese.
//
// Die Qualität hängt fast vollständig davon ab, welche Stimme erwischt wird.
// Ein Rechner bietet oft ein Dutzend an: ältere lokale neben deutlich
// besseren Stimmen, die über das Netz erzeugt werden. Wer einfach die erste
// passende nimmt, bekommt meist die schlechteste. Deshalb werden die Stimmen
// hier bewertet, und die Wahl lässt sich überschreiben und merken.

let voices = [];

function refreshVoices() {
    voices = speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
    refreshVoices();
    // Chrome liefert die Stimmen erst asynchron nach.
    speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

/** Vom Benutzer gewählte Stimmen, Sprachkürzel auf voiceURI. */
const preferred = new Map();

export function isAvailable() {
    return 'speechSynthesis' in window;
}

/**
 * Bewertet, wie gut eine Stimme zu einer Sprache passt. Höher ist besser.
 * @param {SpeechSynthesisVoice} voice
 * @param {string} lang
 */
function rate(voice, lang) {
    const wanted = lang.toLowerCase().replace('_', '-');
    const base = wanted.split('-')[0];
    const voiceLang = voice.lang.toLowerCase().replace('_', '-');

    if (!voiceLang.startsWith(base)) return -1;

    let score = voiceLang === wanted ? 4 : 2;

    // Stimmen aus dem Netz klingen fast immer besser als lokal erzeugte.
    if (voice.localService === false) score += 3;

    const name = voice.name.toLowerCase();
    if (name.includes('natural') || name.includes('neural')) score += 3;
    if (name.includes('google')) score += 2;
    if (name.includes('espeak')) score -= 5;

    return score;
}

/**
 * Alle brauchbaren Stimmen für eine Sprache, beste zuerst.
 * @param {string} lang
 * @returns {SpeechSynthesisVoice[]}
 */
export function voicesFor(lang) {
    return voices
        .map(voice => ({ voice, score: rate(voice, lang) }))
        .filter(entry => entry.score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.voice);
}

/** @param {string} lang */
function pickVoice(lang) {
    const chosen = preferred.get(lang);
    if (chosen) {
        const match = voices.find(voice => voice.voiceURI === chosen);
        if (match) return match;
    }
    return voicesFor(lang)[0];
}

/**
 * Übernimmt gespeicherte Stimmwahlen.
 * @param {Record<string, string>} map Sprachkürzel auf voiceURI
 */
export function usePreferred(map) {
    preferred.clear();
    for (const [lang, uri] of Object.entries(map ?? {})) preferred.set(lang, uri);
}

/**
 * Setzt die Stimme für eine Sprache.
 * @param {string} lang
 * @param {string} voiceURI Leerer Wert stellt die automatische Wahl her
 */
export function setPreferred(lang, voiceURI) {
    if (voiceURI) preferred.set(lang, voiceURI);
    else preferred.delete(lang);
}

/** @param {string} lang */
export function getPreferred(lang) {
    return preferred.get(lang) ?? '';
}

/**
 * Liest einen Text in der angegebenen Sprache vor.
 * @param {string} text
 * @param {string} lang BCP-47, etwa fr-FR
 */
export function speak(text, lang) {
    if (!isAvailable() || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;

    // Etwas langsamer als die Vorgabe: einzelne Vokabeln in fremder Sprache
    // sind bei voller Geschwindigkeit schwer zu erfassen.
    utterance.rate = 0.9;

    utterance.onerror = event => {
        // Ein Abbruch stammt vom cancel() unten und ist kein Fehler.
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
            console.warn('Sprachausgabe fehlgeschlagen:', event.error);
        }
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
}

export function stop() {
    if (isAvailable()) speechSynthesis.cancel();
}
