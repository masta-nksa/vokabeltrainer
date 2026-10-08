// Modus "terms": Das Wort in der Zielsprache erscheint und wird vorgelesen,
// aus mehreren Übersetzungen ist die richtige zu wählen.

import { sample, shuffle, normalize, optionCount } from '../util.js';

export const id = 'terms';
export const label = 'terms';
export const description = 'Wort hören und die richtige Übersetzung wählen';
export const inputKind = 'choice';
export const skill = 'recognize';

// Kein Bild: die Optionen sind die Übersetzungen, ein Bild verriete die
// richtige sofort.
export const showsImage = false;

// Die Frage wurde bereits vorgelesen, die Antwort ist die Muttersprache.
// Nach einem Treffer noch etwas vorzulesen bringt nichts und wird von der
// naechsten Frage ohnehin abgeschnitten.
export const speakAnswerOnCorrect = false;

// Wie ähnlich die Ablenker der richtigen Antwort in der Länge sind:
// "distant" hebt sich deutlich ab, "close" liegt nahe dran und ist dadurch
// schwerer auszuschliessen, "random" mischt – im Schnitt mehr Variation als
// "distant".
const LEVELS = {
    basis: { distractors: 'distant' },
    erweitert: { distractors: 'random' },
    expert: { distractors: 'close' }
};

/**
 * Wählt `count` Ablenker aus den Kandidaten.
 * @param {string[]} candidates
 * @param {string} answer
 * @param {'distant' | 'random' | 'close'} closeness
 * @param {number} count
 */
function pickDistractors(candidates, answer, closeness, count) {
    if (closeness === 'random') return sample(candidates, count);

    const byCloseness = [...candidates].sort((a, b) => {
        const diffA = Math.abs(a.length - answer.length);
        const diffB = Math.abs(b.length - answer.length);
        return closeness === 'close' ? diffA - diffB : diffB - diffA;
    });

    // Nicht immer strikt die extremsten nehmen, sonst wiederholt sich die
    // Auswahl bei jeder Frage – daher aus einem grosszügigen Vorlauf ziehen.
    const shortlist = byCloseness.slice(0, Math.max(count, Math.ceil(candidates.length / 2)));
    return sample(shortlist, count);
}

/**
 * @param {import('../storage/index.js').Item} item
 * @param {import('../storage/index.js').Item[]} pool Nur die gewählten Lektionen
 * @param {import('../learning/levels.js').Level} [level]
 */
export function buildQuestion(item, pool, level = 'erweitert') {
    const settings = LEVELS[level] ?? LEVELS.erweitert;

    // Ablenker kommen aus den gewählten Lektionen. Sie stammen bewusst nicht
    // aus dem ganzen Wortschatz, sonst sind sie zu leicht auszuschliessen.
    const candidates = [...new Set(
        pool.map(entry => entry.source).filter(text => normalize(text) !== normalize(item.source))
    )];

    // Mehr Optionen bei höherem Niveau (Basis 4, Erweitert 6, Expert 8),
    // begrenzt durch das, was die gewählten Lektionen hergeben.
    const distractors = pickDistractors(candidates, item.source, settings.distractors, optionCount(level) - 1);
    const options = shuffle([item.source, ...distractors]);

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
