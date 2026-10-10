// Kreuzworträtsel: deutscher Hinweis, das Wort der Zielsprache kommt ins
// Gitter. Die Buchstabenzahl ist an den Feldern abzulesen.
//
// Jedes fertig eingetragene Wort wird sofort geprüft und protokolliert –
// mit der Eingabe und ihrer Fehlerklasse, wie im Quiz.

import { stripDiacritics } from '../util.js';
import { languageProfile } from '../learning/languages.js';
import { classify } from '../learning/errors.js';
import { statusOf } from '../learning/mastery.js';
import { hasClearGender } from '../learning/generators.js';
import { createRng, seededShuffle } from './rng.js';
import { buildGrid, cellsOf } from './crosswordGrid.js';

export const id = 'crossword';
export const label = 'Kreuzworträtsel';
export const description = 'Deutsches Wort lesen, das französische ins Gitter schreiben';

// Wortzahl, Hilfen und Strenge je Niveau.
const LEVELS = {
    basis: { words: 7, firstLetter: true, strictAccents: false, emoji: true },
    erweitert: { words: 10, firstLetter: false, strictAccents: true, emoji: true },
    expert: { words: 13, firstLetter: false, strictAccents: true, emoji: false }
};

const MIN_WORDS = 5;
const MAX_SIDE = 13;
const POINTS = 100;
const PENALTY = 30;
const MIN_POINTS = 10;

/** Ins Gitter passt ein einzelnes Wort: Buchstaben, allenfalls Bindestrich. */
function usable(item) {
    return typeof item.lemma === 'string'
        && /^[\p{L}-]+$/u.test(item.lemma)
        && [...item.lemma].length >= 3
        && [...item.lemma].length <= MAX_SIDE;
}

/** Jedes Wort nur einmal, auch wenn es in zwei Lektionen steht. */
function candidates(items) {
    const seen = new Set();
    return items
        .filter(usable)
        .filter(item => !seen.has(item.lemma.toLowerCase()) && seen.add(item.lemma.toLowerCase()))
        .sort((a, b) => a.id.localeCompare(b.id));
}

export function available(deck, items) {
    return candidates(items).length >= MIN_WORDS;
}

/**
 * Wählt die Wörter: unsichere und fällige zuerst, dann Neues, dann Sicheres –
 * innerhalb der Gruppe zufällig. In einer Challenge sind sie vorgegeben.
 */
function chooseWords(context, count) {
    const pool = candidates(context.items);

    if (context.spec?.items) {
        const byId = new Map(pool.map(item => [item.id, item]));
        return context.spec.items.map(itemId => byId.get(itemId)).filter(Boolean);
    }

    const rank = { weak: 0, new: 1, learning: 2, safe: 3 };
    const mastery = context.insight?.mastery ?? new Map();
    return seededShuffle(pool, Math.random)
        .sort((a, b) => rank[statusOf(mastery.get(a.id))] - rank[statusOf(mastery.get(b.id))])
        .slice(0, count);
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
    const lang = deck.targetLang;

    const words = chooseWords(context, settings.words);
    // Das Gitter hängt nur am Startwert und an der Wortliste – so entsteht
    // bei einer Challenge auf beiden Seiten dasselbe.
    const grid = buildGrid(words.map(item => ({ id: item.id, word: item.lemma })), createRng(context.seed), { maxSide: MAX_SIDE });
    const byId = new Map(words.map(item => [item.id, item]));

    const startedAt = Date.now();
    let timer = 0;
    let stopped = false;

    // ------------------------------------------------------------ Zustand

    /** @type {Map<string, {input: HTMLInputElement, letter: string, entries: number[], locked: boolean}>} */
    const cells = new Map();
    const key = (row, col) => `${row},${col}`;

    const entries = grid.entries.map((entry, index) => ({
        ...entry,
        index,
        item: byId.get(entry.id),
        cells: cellsOf(entry).map(cell => key(cell.row, cell.col)),
        solved: false,
        errors: [],
        lastWrong: '',
        openedAt: 0,
        clue: null
    }));

    let active = entries[0] ?? null;
    /** @type {HTMLInputElement | null} */
    let lastInput = null;

    // --------------------------------------------------------- Oberfläche

    const board = el('div', 'cw-grid');
    board.style.setProperty('--cols', String(grid.width));

    for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
            const owners = entries.filter(entry => entry.cells.includes(key(row, col)));
            if (owners.length === 0) {
                board.append(el('div', 'cw-blank'));
                continue;
            }

            const position = owners[0].cells.indexOf(key(row, col));
            const letter = owners[0].letters[position];

            const cell = el('div', 'cw-cell');
            const starts = owners.find(entry => entry.cells[0] === key(row, col));
            if (starts) cell.append(el('span', 'cw-number', String(starts.number)));

            const input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 2; // Platz für das neue Zeichen neben dem alten
            input.autocomplete = 'off';
            input.autocapitalize = 'off';
            input.spellcheck = false;
            input.lang = lang;
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('aria-label', `Zeile ${row + 1}, Spalte ${col + 1}`);
            input.dataset.key = key(row, col);
            cell.append(input);
            board.append(cell);

            cells.set(key(row, col), { input, letter, entries: owners.map(entry => entry.index), locked: false });
        }
    }

    // Vorgegebenes: Bindestriche immer, auf Basis der erste Buchstabe.
    for (const [, cell] of cells) {
        if (cell.letter === '-') lock(cell);
    }
    if (settings.firstLetter) {
        for (const entry of entries) lock(cells.get(entry.cells[0]));
    }

    const accents = el('div', 'cw-accents');
    for (const char of languageProfile(lang).specialChars) {
        const button = el('button', null, char);
        button.type = 'button';
        // mousedown statt click: das Feld soll den Fokus behalten.
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('click', () => {
            if (!lastInput || lastInput.disabled) return;
            lastInput.focus();
            type(lastInput, char);
        });
        accents.append(button);
    }

    const note = el('p', 'note');
    note.setAttribute('role', 'status');

    const hintButton = el('button', null, 'Buchstabe aufdecken');
    hintButton.type = 'button';
    hintButton.addEventListener('click', revealLetter);

    const clues = el('div', 'cw-clues');
    for (const [dir, title] of [['across', 'Waagrecht'], ['down', 'Senkrecht']]) {
        const list = entries.filter(entry => entry.dir === dir);
        if (list.length === 0) continue;
        const column = el('div');
        column.append(el('h2', null, title));
        for (const entry of list) {
            const clue = el('button', 'cw-clue');
            clue.type = 'button';
            // Das Geschlecht nur nennen, wo es eindeutig ist (nicht bei "un/une enfant").
            const gender = entry.item.pos === 'noun' && entry.item.number === 'sg' && hasClearGender(entry.item, lang)
                ? ` (${entry.item.gender})` : '';
            const picture = settings.emoji && entry.item.image && !/\.\w{2,4}$/.test(entry.item.image)
                ? ` ${entry.item.image}` : '';
            clue.textContent = `${entry.number}. ${entry.item.source.split(',')[0].trim()}${gender}${picture}`;
            clue.addEventListener('click', () => focusEntry(entry));
            entry.clue = clue;
            column.append(clue);
        }
        clues.append(column);
    }

    // Der Hinweis zum aktiven Wort steht über dem Gitter – auf dem Handy liegt
    // die Liste sonst unter der Tastatur.
    const currentClue = el('p', 'cw-current');
    currentClue.setAttribute('role', 'status');

    stage.append(currentClue, board, accents, note, hintButton, clues);

    // ------------------------------------------------------------ Eingabe

    board.addEventListener('focusin', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        lastInput = input;
        const cell = cells.get(input.dataset.key);
        // Im aktiven Wort bleiben, wenn die Zelle dazugehört.
        if (!active || !cell.entries.includes(active.index)) setActive(firstOpen(cell) ?? entries[cell.entries[0]]);
    });

    board.addEventListener('click', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        const cell = cells.get(input.dataset.key);
        // Zweiter Klick auf eine Kreuzung wechselt die Richtung.
        if (active && cell.entries.length > 1 && input === document.activeElement && input.dataset.clicked === '1') {
            const other = cell.entries.map(index => entries[index]).find(entry => entry !== active);
            if (other) setActive(other);
        }
        for (const [, each] of cells) each.input.dataset.clicked = '';
        input.dataset.clicked = '1';
    });

    board.addEventListener('input', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        // Das zuletzt getippte Zeichen zählt; so lässt sich ein Feld überschreiben.
        const typed = [...input.value].pop() ?? '';
        input.value = '';
        if (typed) type(input, typed);
    });

    board.addEventListener('keydown', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        const [row, col] = input.dataset.key.split(',').map(Number);

        const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (moves[event.key]) {
            event.preventDefault();
            const [dr, dc] = moves[event.key];
            cells.get(key(row + dr, col + dc))?.input.focus();
            return;
        }

        if (event.key === 'Backspace') {
            event.preventDefault();
            const cell = cells.get(input.dataset.key);
            if (!cell.locked && input.value !== '') {
                input.value = '';
                return;
            }
            step(input, -1, true);
        }
    });

    function lock(cell) {
        cell.locked = true;
        cell.input.value = cell.letter;
        cell.input.readOnly = true;
        cell.input.tabIndex = -1;
        cell.input.parentElement.classList.add('fixed');
    }

    function firstOpen(cell) {
        return cell.entries.map(index => entries[index]).find(entry => !entry.solved);
    }

    function setActive(entry) {
        active = entry;
        if (entry.openedAt === 0) entry.openedAt = Date.now();
        for (const [position, cell] of cells) {
            cell.input.parentElement.classList.toggle('active', entry.cells.includes(position));
        }
        for (const each of entries) each.clue.classList.toggle('active', each === entry);
        currentClue.textContent = `${entry.dir === 'across' ? '→' : '↓'} ${entry.clue.textContent}`;
        note.textContent = '';
    }

    function focusEntry(entry) {
        setActive(entry);
        const open = entry.cells.map(position => cells.get(position)).find(cell => !cell.locked && cell.input.value === '')
            ?? entry.cells.map(position => cells.get(position)).find(cell => !cell.locked);
        open?.input.focus();
    }

    /** Geht im aktiven Wort ein Feld weiter oder zurück, über feste Felder hinweg. */
    function step(input, direction, clear = false) {
        if (!active) return;
        let index = active.cells.indexOf(input.dataset.key);
        if (index === -1) return;

        for (index += direction; index >= 0 && index < active.cells.length; index += direction) {
            const cell = cells.get(active.cells[index]);
            if (cell.locked) continue;
            if (clear) cell.input.value = '';
            cell.input.focus();
            return;
        }
    }

    function type(input, char) {
        const cell = cells.get(input.dataset.key);
        if (cell.locked || stopped) return;

        input.value = char.toLowerCase();
        step(input, 1);

        for (const index of cell.entries) check(entries[index]);
    }

    // ------------------------------------------------------------ Prüfung

    function check(entry) {
        if (entry.solved) return;
        const given = entry.cells.map(position => cells.get(position).input.value).join('');
        if ([...given].length < entry.letters.length) return;

        const expected = entry.letters.join('');
        const exact = given === expected;
        const loose = stripDiacritics(given) === stripDiacritics(expected);

        if (exact || (loose && !settings.strictAccents)) {
            // Auf Basis gilt der fehlende Akzent – notiert wird er trotzdem.
            if (!exact) entry.errors.push({ given, type: 'accent', tolerated: true });
            solve(entry);
            return;
        }

        // Dieselbe falsche Füllung nicht zweimal zählen (ein Kreuzungsfeld
        // löst die Prüfung für beide Wörter aus).
        if (given === entry.lastWrong) return;
        entry.lastWrong = given;

        const others = words
            .filter(item => item.id !== entry.item.id)
            .map(item => ({ id: item.id, text: item.lemma }));
        entry.errors.push({ given, ...classify({ given, expected, lang, others }) });

        for (const position of entry.cells) flash(cells.get(position).input.parentElement);
        if (entry === active && level !== 'expert') {
            note.textContent = loose ? 'Fast! Achte auf die Akzente.' : 'Das stimmt noch nicht – schau die Buchstaben an.';
        }
    }

    function flash(node) {
        node.classList.remove('wrong');
        // Neu auslösen, auch wenn die Klasse eben noch gesetzt war.
        void node.offsetWidth;
        node.classList.add('wrong');
    }

    function solve(entry) {
        entry.solved = true;
        entry.clue.classList.add('solved');
        for (const position of entry.cells) {
            const cell = cells.get(position);
            lock(cell);
            cell.input.parentElement.classList.remove('wrong');
            cell.input.parentElement.classList.add('solved');
        }

        const counted = entry.errors.filter(error => !error.tolerated);
        context.log({
            itemId: entry.item.id,
            skill: 'produce',
            correct: counted.length === 0,
            tries: counted.length,
            errors: entry.errors,
            durationMs: Date.now() - (entry.openedAt || startedAt)
        });

        // Ein Kreuzungsbuchstabe kann das Nachbarwort vervollständigt haben.
        for (const other of entries) check(other);

        note.textContent = '';
        update();

        const next = entries.find(each => !each.solved);
        if (!next) return finish();
        if (entry === active) focusEntry(next);
    }

    function revealLetter() {
        if (!active || active.solved) return;
        const open = active.cells.map(position => cells.get(position))
            .find(cell => !cell.locked && cell.input.value !== cell.letter);
        if (!open) return;

        active.errors.push({ given: '(Buchstabe aufgedeckt)', type: 'unknown' });
        lock(open);
        for (const index of open.entries) check(entries[index]);
        const rest = active.cells.map(position => cells.get(position)).find(cell => !cell.locked);
        rest?.input.focus();
    }

    // ------------------------------------------------------------ Verlauf

    function update() {
        const solved = entries.filter(entry => entry.solved).length;
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        context.status(`${solved} von ${entries.length} Wörtern · ${clock}`);
    }

    function finish() {
        stopped = true;
        window.clearInterval(timer);

        const points = entries.map(entry =>
            Math.max(MIN_POINTS, POINTS - PENALTY * entry.errors.filter(error => !error.tolerated).length));
        const clean = entries.filter(entry => entry.errors.every(error => error.tolerated)).length;

        context.finish({
            score: points.reduce((sum, value) => sum + value, 0),
            ms: Date.now() - startedAt,
            detail: `${clean} von ${entries.length} Wörtern ohne Fehler`,
            missed: entries.filter(entry => entry.errors.some(error => !error.tolerated)).map(entry => entry.item),
            spec: { items: words.map(item => item.id) }
        });
    }

    if (entries.length === 0) {
        stage.replaceChildren(el('p', 'hint', 'Aus diesen Wörtern lässt sich kein Gitter bauen. Wähle mehr Lektionen.'));
    } else {
        update();
        timer = window.setInterval(update, 1000);
        focusEntry(entries[0]);
    }

    return {
        stop() {
            stopped = true;
            window.clearInterval(timer);
        }
    };
}
