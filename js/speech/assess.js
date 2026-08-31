// Schnittstelle für die Ausspracheprüfung.
//
// Noch nicht angeschlossen. Dieses Modul markiert die Stelle, an der später
// ein Dienst wie Azure Pronunciation Assessment andockt: Aufnahme hinein,
// Bewertung pro Wort und Phonem heraus. Der Rest der App spricht nur über
// diese Funktionen, damit der Anschluss eine Änderung an einer Datei bleibt.
//
// Der Schlüssel für den Dienst darf nie im Browser liegen. Die Aufnahme geht
// an einen eigenen Proxy, der den Schlüssel hält.

/**
 * @typedef {Object} PhonemeScore
 * @property {string} phoneme
 * @property {number} accuracy   0 bis 100
 *
 * @typedef {Object} WordScore
 * @property {string} word
 * @property {number} accuracy
 * @property {PhonemeScore[]} phonemes
 *
 * @typedef {Object} Assessment
 * @property {number} accuracy      Aussprachegenauigkeit gesamt
 * @property {number} fluency
 * @property {number} completeness
 * @property {WordScore[]} words
 * @property {string} [advice]      Rückmeldung in Alltagssprache
 */

/** Ob der Modus speaking angeboten werden kann. */
export function isAvailable() {
    return false;
}

/**
 * @param {{audio: Blob, expected: string, lang: string}} _request
 * @returns {Promise<Assessment>}
 */
export async function assess(_request) {
    throw new Error('Die Ausspracheprüfung ist noch nicht angeschlossen.');
}
