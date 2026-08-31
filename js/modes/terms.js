// Modus "terms": Das Wort in der Zielsprache erscheint und wird vorgelesen,
// aus vier Übersetzungen ist die richtige zu wählen.

import { sample, shuffle, normalize } from '../util.js';

export const id = 'terms';
export const label = 'terms';
export const description = 'Wort hören und die richtige Übersetzung wählen';
export const inputKind = 'choice';

// Die Frage wurde bereits vorgelesen, die Antwort ist die Muttersprache.
// Nach einem Treffer noch etwas vorzulesen bringt nichts und wird von der
// naechsten Frage ohnehin abgeschnitten.
export const speakAnswerOnCorrect = false;

/**
 * @param {import('../storage/index.js').Item} item
 * @param {import('../storage/index.js').Item[]} pool Nur die gewählten Lektionen
 */
export function buildQuestion(item, pool) {
    // Ablenker kommen aus den gewählten Lektionen. Sie stammen bewusst nicht
    // aus dem ganzen Wortschatz, sonst sind sie zu leicht auszuschliessen.
    const candidates = [...new Set(
        pool.map(entry => entry.source).filter(text => normalize(text) !== normalize(item.source))
    )];

    const options = shuffle([item.source, ...sample(candidates, 3)]);

    return {
        prompt: item.target,
        promptSide: 'target',
        speakPrompt: true,
        options,
        answer: item.source,
        answerSide: 'source'
    };
}

export function check(question, given) {
    return { correct: normalize(given) === normalize(question.answer) };
}
