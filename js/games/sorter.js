// Genus-Sortierer: Ein Wort fällt herunter und muss ins richtige Fach, bevor
// es unten ankommt. Die einzige Grammatik als Spiel – und nur für Sprachen,
// die ein grammatisches Geschlecht kennen (Sprachprofil).

import { languageProfile, hasGender } from '../learning/languages.js';
import { hasClearGender } from '../learning/generators.js';
import { createRng, seededShuffle } from './rng.js';

export const id = 'sorter';
export const label = 'Genus-Sortierer';
export const description = 'Jedes Wort ins richtige Fach – bevor es unten ankommt';

// Was sortiert wird, wie viele Wörter und wie lange eines fällt.
const LEVELS = {
    basis: { count: 10, seconds: 7, bins: 'article' },
    erweitert: { count: 12, seconds: 5.5, bins: 'gender' },
    expert: { count: 14, seconds: 4, bins: 'possessive' }
};

const MIN_WORDS = 6;
const POINTS = 10;
const SPEED_BONUS = 5;

/**
 * Die Fächer eines Niveaus und in welches ein Wort gehört.
 * @returns {{labels: string[], captions: string[], binOf: (item: object) => number, shown: (item: object) => string, full: (item: object) => string, usable: (item: object) => boolean}}
 */
function rules(kind, profile) {
    const { definite, possessive, vowelStart } = profile;
    const vowel = item => vowelStart.test(item.lemma);
    const article = item => (item.number === 'pl' ? definite.pl : vowel(item) ? definite.elided : definite[item.gender]);
    const withArticle = item => (article(item).endsWith("'") ? `${article(item)}${item.lemma}` : `${article(item)} ${item.lemma}`);

    if (kind === 'article') {
        return {
            labels: [definite.m, definite.f],
            captions: ['männlich', 'weiblich'],
            // Basis: nur Wörter, deren Artikel das Geschlecht zeigt.
            usable: item => item.number === 'sg' && !vowel(item),
            binOf: item => (item.gender === 'm' ? 0 : 1),
            shown: item => item.lemma,
            full: withArticle
        };
    }

    if (kind === 'gender') {
        return {
            labels: ['männlich', 'weiblich'],
            captions: [`${definite.m} · un`, `${definite.f} · une`],
            usable: item => Boolean(item.gender),
            binOf: item => (item.gender === 'm' ? 0 : 1),
            // l' und les verraten das Geschlecht nicht – das muss man wissen.
            shown: item => (item.number === 'pl' || vowel(item) ? withArticle(item) : item.lemma),
            full: item => `${withArticle(item)} (${item.gender === 'm' ? 'männlich' : 'weiblich'})`
        };
    }

    const form = item => (item.number === 'pl' ? possessive.pl : item.gender === 'f' && !vowel(item) ? possessive.f : possessive.m);
    return {
        labels: [possessive.m, possessive.f, possessive.pl],
        captions: ['männlich', 'weiblich', 'Mehrzahl'],
        usable: item => Boolean(item.gender) || item.number === 'pl',
        binOf: item => [possessive.m, possessive.f, possessive.pl].indexOf(form(item)),
        shown: item => item.lemma,
        full: item => `${form(item)} ${item.lemma}`
    };
}

function candidates(deck, items, level) {
    if (!hasGender(deck.targetLang)) return [];
    const rule = rules((LEVELS[level] ?? LEVELS.erweitert).bins, languageProfile(deck.targetLang));
    const seen = new Set();
    return items
        .filter(item => item.pos === 'noun' && item.number && hasClearGender(item, deck.targetLang))
        .filter(item => /^[\p{L}-]+$/u.test(item.lemma) && rule.usable(item))
        .filter(item => !seen.has(item.lemma) && seen.add(item.lemma))
        .sort((a, b) => a.id.localeCompare(b.id));
}

export function available(deck, items, level) {
    return candidates(deck, items, level).length >= MIN_WORDS;
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
    const rule = rules(settings.bins, languageProfile(deck.targetLang));

    // Die Reihenfolge hängt nur am Startwert: gleiche Partie für alle.
    const pool = candidates(deck, context.items, level);
    const rng = createRng(context.seed);
    let sequence = seededShuffle(pool, rng);
    while (sequence.length < settings.count) sequence = [...sequence, ...seededShuffle(pool, rng)];
    sequence = sequence.slice(0, settings.count);

    const startedAt = Date.now();
    let index = -1;
    let score = 0;
    let right = 0;
    let shownAt = 0;
    let open = false;
    let stopped = false;
    let fallTimer = 0;
    let nextTimer = 0;
    const missed = [];

    // --------------------------------------------------------- Oberfläche

    const lane = el('div', 'sorter-lane');
    const word = el('div', 'sorter-word');
    word.lang = deck.targetLang;
    lane.append(word);

    const note = el('p', 'note');
    note.setAttribute('role', 'status');

    const bins = el('div', 'sorter-bins');
    const buttons = rule.labels.map((text, position) => {
        const button = el('button', 'sorter-bin');
        button.type = 'button';
        button.append(el('strong', null, text), el('small', null, rule.captions[position]));
        button.addEventListener('click', () => answer(position));
        bins.append(button);
        return button;
    });

    const keysHint = el('p', 'hint',
        buttons.length === 2 ? 'Tastatur: ← und →' : 'Tastatur: ←, ↓ und → oder 1, 2, 3');

    stage.append(lane, bins, note, keysHint);

    function onKey(event) {
        if (stopped) return;
        const last = buttons.length - 1;
        const map = { ArrowLeft: 0, ArrowRight: last, ArrowDown: buttons.length === 3 ? 1 : -1, 1: 0, 2: 1, 3: 2 };
        const position = map[event.key];
        if (position === undefined || position < 0 || position > last) return;
        event.preventDefault();
        answer(position);
    }
    document.addEventListener('keydown', onKey);

    // ------------------------------------------------------------ Verlauf

    function status() {
        context.status(`Wort ${Math.min(index + 1, sequence.length)} von ${sequence.length} · ${score} Punkte`);
    }

    function next() {
        if (stopped) return;
        index++;
        if (index >= sequence.length) return finish();

        note.textContent = '';
        note.classList.remove('ok');
        for (const button of buttons) button.classList.remove('right', 'wrong');

        const item = sequence[index];
        word.textContent = rule.shown(item);

        // Oben einsetzen, dann in einem Zug nach unten fallen lassen.
        word.style.transition = 'none';
        word.style.top = '0%';
        void word.offsetWidth;
        word.style.transition = `top ${settings.seconds}s linear`;
        word.style.top = 'calc(100% - 2.8rem)';

        shownAt = Date.now();
        open = true;
        status();
        fallTimer = window.setTimeout(() => answer(-1), settings.seconds * 1000);
    }

    /** @param {number} position Gewähltes Fach, -1 = zu spät */
    function answer(position) {
        if (!open || stopped) return;
        open = false;
        window.clearTimeout(fallTimer);

        const item = sequence[index];
        const correctBin = rule.binOf(item);
        const elapsed = Date.now() - shownAt;
        const correct = position === correctBin;

        // Stehen lassen, wo es gerade ist.
        word.style.top = getComputedStyle(word).top;
        word.style.transition = 'none';

        buttons[correctBin].classList.add('right');
        if (correct) {
            right++;
            score += POINTS + Math.round(SPEED_BONUS * Math.max(0, 1 - elapsed / (settings.seconds * 1000)));
        } else {
            if (position >= 0) buttons[position].classList.add('wrong');
            if (!missed.includes(item)) missed.push(item);
            note.textContent = `${position < 0 ? 'Zu spät! ' : ''}Richtig: ${rule.full(item)}`;
        }

        const chosePlural = [position, correctBin].some(bin => rule.captions[bin] === 'Mehrzahl');
        context.log({
            itemId: item.id,
            // Geübt wird das Geschlecht, nicht das Wort selbst.
            skill: 'apply',
            correct,
            tries: correct ? 0 : 1,
            errors: correct ? [] : [{
                given: position < 0 ? '(zu spät)' : `${rule.labels[position]} ${item.lemma}`,
                type: position < 0 ? 'unknown' : chosePlural ? 'number' : 'gender'
            }],
            durationMs: elapsed
        });

        status();
        nextTimer = window.setTimeout(next, correct ? 400 : 1600);
    }

    function finish() {
        stopped = true;
        document.removeEventListener('keydown', onKey);
        context.finish({
            score,
            ms: Date.now() - startedAt,
            detail: `${right} von ${sequence.length} richtig einsortiert`,
            missed
        });
    }

    next();

    return {
        stop() {
            stopped = true;
            window.clearTimeout(fallTimer);
            window.clearTimeout(nextTimer);
            document.removeEventListener('keydown', onKey);
        }
    };
}
