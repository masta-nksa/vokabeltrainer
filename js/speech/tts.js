// Sprachausgabe über die Browser-eigene Sprachsynthese.

let voices = [];

function refreshVoices() {
    voices = speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
    refreshVoices();
    // Chrome liefert die Stimmen erst asynchron nach.
    speechSynthesis.addEventListener('voiceschanged', refreshVoices);
}

export function isAvailable() {
    return 'speechSynthesis' in window;
}

/**
 * Sucht eine Stimme zur Sprache. Ein "fr" trifft auch ein "fr-CA".
 * @param {string} lang
 */
function pickVoice(lang) {
    const wanted = lang.toLowerCase().replace('_', '-');
    const base = wanted.split('-')[0];
    return voices.find(voice => voice.lang.toLowerCase().replace('_', '-') === wanted)
        ?? voices.find(voice => voice.lang.toLowerCase().startsWith(base));
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
