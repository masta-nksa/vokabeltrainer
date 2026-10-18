// Modus "terms": Das Wort in der Zielsprache erscheint und wird vorgelesen,
// aus mehreren Übersetzungen ist die richtige zu wählen.

import { sample, shuffle, normalize, optionCount } from '../util.js';
import { targetForms } from '../data/decks.js';

export const id = 'terms';
export const label = 'Erkennen';
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
 * @param {import('../storage/index.js').Deck} [deck]
 * @param {{confusions?: Map<string, string[]>}} [hints]
 *   Was der Lernende schon verwechselt hat
 */
export function buildQuestion(item, pool, level = 'erweitert', deck, hints = {}) {
    const settings = LEVELS[level] ?? LEVELS.erweitert;

    // Ablenker kommen aus den gewählten Lektionen. Sie stammen bewusst nicht
    // aus dem ganzen Wortschatz, sonst sind sie zu leicht auszuschliessen.
    const candidates = [...new Set(
        pool.map(entry => entry.source).filter(text => normalize(text) !== normalize(item.source))
    )];

    // Mehr Optionen bei höherem Niveau (Basis 4, Erweitert 6, Expert 8),
    // begrenzt durch das, was die gewählten Lektionen hergeben.
    const wanted = optionCount(level) - 1;

    // Wörter, die schon einmal mit diesem verwechselt wurden, kommen
    // absichtlich als Ablenker – bis die Unterscheidung sitzt. Basis bleibt
    // davon verschont.
    const partners = level === 'basis' ? [] : (hints.confusions?.get(item.id) ?? []);
    const confused = pool
        .filter(entry => partners.includes(entry.id) && candidates.includes(entry.source))
        .map(entry => entry.source)
        .slice(0, wanted);

    const others = candidates.filter(text => !confused.includes(text));
    const distractors = [
        ...confused,
        ...pickDistractors(others, item.source, settings.distractors, wanted - confused.length)
    ];
    const options = shuffle([item.source, ...distractors]);

    return {
        // Alle Formen zeigen und vorlesen: "la géo, la géographie".
        prompt: targetForms(item).join(', '),
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
