// Speed-Runde: so viele Wörter wie möglich, bevor die Zeit abläuft. Ein
// Fehler kostet so viel, wie ein Treffer bringt – Raten lohnt sich nicht.

import { normalize } from '../util.js';
import { targetForms } from '../data/decks.js';
import { classify } from '../learning/errors.js';
import * as writing from '../modes/writing.js';
import { createRng, seededShuffle } from './rng.js';

export const id = 'speed';
export const label = 'Speed-Runde';
export const description = 'So viele Wörter wie möglich, bevor die Zeit abläuft';

// Basis und Erweitert wählen aus vier Übersetzungen, Expert tippt.
const LEVELS = {
    basis: { seconds: 90, input: 'choice' },
    erweitert: { seconds: 60, input: 'choice' },
    expert: { seconds: 45, input: 'text' }
};

const OPTIONS = 4;
const MIN_WORDS = 6;
const POINTS = 10;

export function available(deck, items) {
    return items.length >= MIN_WORDS;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/** @param {import('./host.js').GameContext} context */
export function start(context) {
    const { deck, stage, level } = context;
    const settings = LEVELS[level] ?? LEVELS.erweitert;

    // Reihenfolge und Ablenker hängen nur am Startwert.
    const pool = [...context.items].sort((a, b) => a.id.localeCompare(b.id));
    const rng = createRng(context.seed);
    let queue = seededShuffle(pool, rng);

    const startedAt = Date.now();
    const endsAt = startedAt + settings.seconds * 1000;
    let right = 0;
    let wrong = 0;
    let shownAt = 0;
    let current = null;
    let question = null;
    let open = false;
    let stopped = false;
    let clock = 0;
    let nextTimer = 0;
    const missed = [];

    // --------------------------------------------------------- Oberfläche

    const bar = el('div', 'speed-bar');
    const fill = el('div', 'speed-fill');
    bar.append(fill);

    const prompt = el('p', 'prompt');
    const options = el('div', 'options');
    const note = el('p', 'note');
    note.setAttribute('role', 'status');

    const form = el('form', 'speed-form');
    const field = document.createElement('input');
    field.type = 'text';
    field.autocomplete = 'off';
    field.autocapitalize = 'off';
    field.spellcheck = false;
    field.setAttribute('autocorrect', 'off');
    field.lang = deck.targetLang;
    field.placeholder = 'Übersetzung eintippen';
    const submit = el('button', 'primary', 'prüfen');
    submit.type = 'submit';
    form.append(field, submit);
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (field.value.trim() !== '') answerTyped(field.value);
    });

    stage.append(bar, prompt, settings.input === 'choice' ? options : form, note);

    // ------------------------------------------------------------ Verlauf

    function tick() {
        const left = Math.max(0, endsAt - Date.now());
        fill.style.width = `${left / (settings.seconds * 10)}%`;
        const seconds = Math.ceil(left / 1000);
        context.status(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} · ${right} richtig · ${wrong} falsch`);
        if (left === 0) finish();
    }

    function next() {
        if (stopped) return;
        if (queue.length === 0) queue = seededShuffle(pool, rng);
        current = queue.shift();
        note.textContent = '';
        shownAt = Date.now();
        open = true;

        if (settings.input === 'text') {
            question = writing.buildQuestion(current, pool, 'expert', deck);
            prompt.textContent = current.source;
            prompt.lang = deck.sourceLang;
            field.value = '';
            field.disabled = false;
            field.focus();
            return;
        }

        prompt.textContent = targetForms(current).join(', ');
        prompt.lang = deck.targetLang;

        const seen = new Set([normalize(current.source)]);
        const distractors = [];
        for (const other of seededShuffle(pool, rng)) {
            if (seen.has(normalize(other.source))) continue;
            seen.add(normalize(other.source));
            distractors.push(other);
            if (distractors.length === OPTIONS - 1) break;
        }

        options.replaceChildren();
        for (const choice of seededShuffle([current, ...distractors], rng)) {
            const button = el('button', 'option', choice.source);
            button.type = 'button';
            button.lang = deck.sourceLang;
            button.dataset.id = choice.id;
            button.addEventListener('click', () => answerChoice(choice, button));
            options.append(button);
        }
    }

    function record(correct, error) {
        if (correct) right++;
        else {
            wrong++;
            if (!missed.includes(current)) missed.push(current);
        }

        context.log({
            itemId: current.id,
            skill: settings.input === 'text' ? 'produce' : 'recognize',
            correct,
            tries: correct ? 0 : 1,
            errors: error ? [error] : [],
            durationMs: Date.now() - shownAt
        });
        tick();
    }

    function answerChoice(choice, button) {
        if (!open || stopped) return;
        open = false;
        const correct = choice.id === current.id;

        for (const each of options.children) {
            each.disabled = true;
            if (each.dataset.id === current.id) each.classList.add('right');
        }
        if (!correct) button.classList.add('wrong');

        record(correct, correct ? null : { given: choice.source, type: 'confusion', confusedWith: choice.id });
        // Nach einem Fehler bleibt die Lösung stehen – die Uhr läuft weiter.
        nextTimer = window.setTimeout(next, correct ? 250 : 1300);
    }

    function answerTyped(given) {
        if (!open || stopped) return;
        open = false;
        field.disabled = true;

        const correct = writing.check(question, given, 'expert').correct;
        let error = null;
        if (!correct) {
            const others = pool.filter(item => item.id !== current.id).map(item => ({ id: item.id, text: item.target }));
            error = { given: given.trim().slice(0, 120), ...classify({ given, expected: current.target, lang: deck.targetLang, others }) };
            note.textContent = `Richtig wäre: ${current.target}`;
        }

        record(correct, error);
        nextTimer = window.setTimeout(next, correct ? 200 : 1600);
    }

    function finish() {
        if (stopped) return;
        stopped = true;
        window.clearInterval(clock);
        window.clearTimeout(nextTimer);
        context.finish({
            score: Math.max(0, (right - wrong) * POINTS),
            ms: Date.now() - startedAt,
            detail: `${right} richtig, ${wrong} falsch`,
            missed
        });
    }

    clock = window.setInterval(tick, 200);
    tick();
    next();

    return {
        stop() {
            stopped = true;
            window.clearInterval(clock);
            window.clearTimeout(nextTimer);
        }
    };
}
