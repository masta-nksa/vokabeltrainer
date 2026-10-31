// Auswahl von Wortschatz und Lektionen.
//
// Die Lektionen erscheinen als Liste mit Kästchen, gruppiert nach Unit, alle
// Units immer offen. Eine Lektion «… plus» steht eingerückt unter der
// Lektion, zu der sie gehört (dis donc!: «Lernziel 2» und «Lernziel 2 plus»).
//
// Dieselbe Auswahl steht unter «Lernen» und unter «Drucken»; beide zeigen
// immer denselben Stand (`state.selectedUnits`).

import * as storage from '../storage/index.js';
import { languageName, countItems, prepareDeck, inLevel, groupOf } from '../data/decks.js';
import { state } from '../state.js';

/** @type {() => void} */
let onChange = () => {};

/** Kurswahl und Lektionsliste, je einmal unter «Lernen» und «Drucken». */
const SELECTS = ['deck-select', 'print-deck-select'];
const LISTS = ['unit-list', 'print-unit-list'];

/** @param {() => void} handler Wird bei jeder Änderung der Auswahl gerufen. */
export function init(handler) {
    onChange = handler;

    for (const id of SELECTS) {
        document.getElementById(id)
            .addEventListener('change', event => selectDeck(event.target.value));
    }
}

/** Füllt die Wortschatz-Liste und wählt einen aus. */
export async function refresh(preferredDeckId = null) {
    const decks = await storage.listDecks();

    for (const id of SELECTS) {
        const select = document.getElementById(id);
        select.replaceChildren();
        for (const deck of decks) {
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = `${deck.title} · ${countItems(deck)} Wörter`;
            option.title = `${languageName(deck.sourceLang)} → ${languageName(deck.targetLang)}`;
            select.append(option);
        }
    }

    if (decks.length === 0) {
        renderUnits(null);
        return;
    }

    const chosen = decks.some(deck => deck.id === preferredDeckId)
        ? preferredDeckId
        : decks[0].id;
    await selectDeck(chosen);
}

async function selectDeck(deckId) {
    const deck = await storage.getDeck(deckId);

    // Die Auswahl nur verwerfen, wenn tatsächlich ein anderer Wortschatz
    // gewählt wurde. Wer aus einer Runde zurückkommt, findet seine Lektionen
    // sonst jedes Mal abgewählt vor.
    if (state.deck?.id !== deckId) state.selectedUnits = [];

    state.deck = deck ? prepareDeck(deck) : null;
    for (const id of SELECTS) document.getElementById(id).value = deckId;
    renderUnits(state.deck);
    await storage.setSetting('lastDeckId', deckId);
    setSelected(state.selectedUnits);
}

/** @param {import('../storage/index.js').Deck | null} deck */
function renderUnits(deck) {
    for (const id of LISTS) renderUnitsInto(document.getElementById(id), deck);
    refreshCounts();
}

/**
 * @param {HTMLElement} container
 * @param {import('../storage/index.js').Deck | null} deck
 */
function renderUnitsInto(container, deck) {
    container.replaceChildren();

    if (!deck) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        hint.textContent = 'Noch kein Wortschatz vorhanden. Unter «Mehr» lässt sich eine CSV-Datei laden.';
        container.append(hint);
        return;
    }

    // Lektionen nach Unit sammeln, in der Reihenfolge des Decks. Decks ohne
    // `groups` bilden eine einzige Gruppe.
    const titles = new Map((deck.groups ?? []).map(group => [group.id, group.title]));
    const groups = new Map();
    for (const unit of deck.units) {
        const group = titles.has(groupOf(unit)) ? groupOf(unit) : '';
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(unit);
    }

    // Der nächste anstehende Test wird hervorgehoben, vergangene treten zurück.
    const today = todayIso();
    const upcoming = deck.units
        .map(unit => unit.test?.date)
        .filter(date => date && date >= today)
        .sort();
    const dates = { today, next: upcoming[0] ?? null };

    for (const [group, units] of groups) {
        container.append(renderGroup(group, titles.get(group) ?? 'Lektionen', units, dates));
    }
}

/**
 * Eine Unit als offener Block: Kopfzeile mit «alle wählen», darunter je
 * Lektion eine Zeile mit Kästchen.
 */
function renderGroup(group, title, units, dates) {
    const block = document.createElement('section');
    block.className = 'unit-group';
    block.dataset.group = group;

    const head = document.createElement('div');
    head.className = 'unit-group-head';
    const name = document.createElement('h3');
    name.className = 'unit-group-title';
    // textContent statt innerHTML: Titel stammen teils aus hochgeladenen
    // Dateien und dürfen kein Markup einschleusen.
    name.textContent = title;
    const meta = document.createElement('span');
    meta.className = 'unit-group-meta';
    meta.dataset.groupMeta = group;
    const text = document.createElement('span');
    text.className = 'unit-group-text';
    text.append(name, meta);

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'link unit-group-all';
    all.dataset.groupAll = group;
    all.addEventListener('click', () => toggleGroup(group));
    head.append(text, all);

    const list = document.createElement('div');
    list.className = 'unit-rows';
    const ids = new Set(units.map(unit => unit.id));
    for (const unit of units) {
        // «Lernziel 2 plus» steht eingerückt unter «Lernziel 2».
        const isPlus = unit.id.endsWith('-plus') && ids.has(unit.id.slice(0, -'-plus'.length));
        list.append(renderTile(unit, group, isPlus, dates));
    }

    block.append(head, list);
    return block;
}

/**
 * Eine Lektion als Zeile mit Kästchen zum An- und Abwählen.
 * @param {{ today: string, next: string | null }} dates
 */
function renderTile(unit, group, isPlus, dates) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = isPlus ? 'unit-tile plus' : 'unit-tile';

    // Ohne Testdatum gilt eine Lektion als nicht vorbei. Am Prüfungstag
    // selbst ist der Test noch nicht vorbei.
    const date = unit.test?.date;
    const status = !date ? null
        : date < dates.today ? 'past'
        : date === dates.next ? 'next'
        : null;
    if (status) tile.classList.add(status);
    tile.value = unit.id;
    tile.dataset.group = group;
    tile.setAttribute('aria-pressed', String(state.selectedUnits.includes(unit.id)));
    tile.addEventListener('click', () => {
        const selected = state.selectedUnits;
        setSelected(selected.includes(unit.id)
            ? selected.filter(id => id !== unit.id)
            : [...selected, unit.id]);
    });

    const box = document.createElement('span');
    box.className = 'unit-tile-box';
    box.append(icon('i-check', 'check'));

    const name = document.createElement('span');
    name.className = 'unit-tile-name';
    name.textContent = unit.title;

    const count = document.createElement('span');
    count.className = 'unit-tile-count';
    count.dataset.unit = unit.id;

    tile.append(box, name);
    if (status) {
        const badge = document.createElement('span');
        badge.className = 'unit-tile-badge';
        badge.textContent = status === 'past' ? 'vorbei' : 'als Nächstes';
        tile.append(badge);
    }
    tile.append(count);
    return tile;
}

/** Heutiges Datum als JJJJ-MM-TT in Ortszeit, vergleichbar mit `test.date`. */
function todayIso() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** @param {string} id @param {string} className */
function icon(id, className) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `icon ${className}`);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
}

/**
 * Schreibt in jede Lektion, wie viele Wörter sie auf dem gewählten Niveau
 * hat, und in jede Unit die Summe. Nach einem Niveauwechsel aufrufen.
 */
export function refreshCounts() {
    const deck = state.deck;
    if (!deck) return;

    const sizeOf = id => {
        const unit = deck.units.find(entry => entry.id === id);
        return unit ? unit.items.filter(item => inLevel(item, state.level)).length : 0;
    };

    for (const count of document.querySelectorAll('.unit-list .unit-tile-count')) {
        count.textContent = words(sizeOf(count.dataset.unit));
    }

    for (const meta of document.querySelectorAll('.unit-list [data-group-meta]')) {
        const members = groupUnits(meta.dataset.groupMeta);
        const total = members.reduce((sum, id) => sum + sizeOf(id), 0);
        const chosen = members.filter(id => state.selectedUnits.includes(id)).length;
        meta.textContent = chosen > 0
            ? `${chosen} von ${members.length} gewählt`
            : `${members.length} ${members.length === 1 ? 'Lektion' : 'Lektionen'} · ${words(total)}`;
    }

    for (const button of document.querySelectorAll('.unit-list [data-group-all]')) {
        const allOn = groupUnits(button.dataset.groupAll).every(id => state.selectedUnits.includes(id));
        button.textContent = allOn ? 'keine wählen' : 'alle wählen';
    }
}

/** @param {number} n */
function words(n) {
    return `${n} ${n === 1 ? 'Wort' : 'Wörter'}`;
}

/** Wählt alle Lektionen einer Unit an – oder ab, wenn schon alle gewählt sind. */
function toggleGroup(group) {
    const members = groupUnits(group);
    const selected = state.selectedUnits;
    const allOn = members.every(id => selected.includes(id));
    setSelected(allOn
        ? selected.filter(id => !members.includes(id))
        : [...selected, ...members]);
}

/** Die Lektionen einer Unit, ohne Doppel aus den beiden Listen. */
function groupUnits(group) {
    const tiles = document.querySelectorAll('.unit-list .unit-tile');
    return [...new Set([...tiles]
        .filter(tile => tile.dataset.group === group)
        .map(tile => tile.value))];
}

/**
 * Setzt die gewählten Lektionen – in der Reihenfolge des Decks – und
 * gleicht beide Listen an.
 * @param {string[]} ids
 */
function setSelected(ids) {
    const order = (state.deck?.units ?? []).map(unit => unit.id);
    state.selectedUnits = order.filter(id => ids.includes(id));
    for (const tile of document.querySelectorAll('.unit-list .unit-tile')) {
        tile.setAttribute('aria-pressed', String(state.selectedUnits.includes(tile.value)));
    }
    refreshCounts();
    onChange();
}
