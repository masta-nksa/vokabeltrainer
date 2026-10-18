// Auswahl von Wortschatz und Lektionen.
//
// Die Lektionen erscheinen als Kacheln, gruppiert nach Unit. Eine Lektion
// «… plus» steht als zweite Kachel neben der Lektion, zu der sie gehört
// (dis donc!: «Lernziel 2» und «Lernziel 2 plus»).

import * as storage from '../storage/index.js';
import { languageName, countItems, prepareDeck, inLevel, groupOf } from '../data/decks.js';
import { state } from '../state.js';

/** @type {() => void} */
let onChange = () => {};

/** Welche Units aufgeklappt sind, je Deck. Überlebt das Neuzeichnen. */
const openGroups = new Map();

/** @param {() => void} handler Wird bei jeder Änderung der Auswahl gerufen. */
export function init(handler) {
    onChange = handler;

    document.getElementById('deck-select')
        .addEventListener('change', event => selectDeck(event.target.value));
}

/** Füllt die Wortschatz-Liste und wählt einen aus. */
export async function refresh(preferredDeckId = null) {
    const decks = await storage.listDecks();
    const select = document.getElementById('deck-select');
    select.replaceChildren();

    for (const deck of decks) {
        const option = document.createElement('option');
        option.value = deck.id;
        option.textContent = `${deck.title} · ${countItems(deck)} Wörter`;
        option.title = `${languageName(deck.sourceLang)} → ${languageName(deck.targetLang)}`;
        select.append(option);
    }

    if (decks.length === 0) {
        renderUnits(null);
        return;
    }

    const chosen = decks.some(deck => deck.id === preferredDeckId)
        ? preferredDeckId
        : decks[0].id;
    select.value = chosen;
    await selectDeck(chosen);
}

async function selectDeck(deckId) {
    const deck = await storage.getDeck(deckId);

    // Die Auswahl nur verwerfen, wenn tatsächlich ein anderer Wortschatz
    // gewählt wurde. Wer aus einer Runde zurückkommt, findet seine Lektionen
    // sonst jedes Mal abgewählt vor.
    if (state.deck?.id !== deckId) state.selectedUnits = [];

    state.deck = deck ? prepareDeck(deck) : null;
    renderUnits(state.deck);
    await storage.setSetting('lastDeckId', deckId);
    updateSelection();
}

/**
 * Teilt die Lektionen einer Unit in Zeilen: eine Lektion mit ihrer
 * «plus»-Lektion bildet eine Zeile mit Titel, alle übrigen kommen als
 * Kacheln in eine gemeinsame Zeile ohne Titel.
 * @param {import('../storage/index.js').Unit[]} units
 */
function rowsOf(units) {
    const ids = new Set(units.map(unit => unit.id));
    const plusOf = id => `${id}-plus`;
    const isPlus = unit => unit.id.endsWith('-plus') && ids.has(unit.id.slice(0, -'-plus'.length));

    const paired = [];
    const single = [];
    for (const unit of units) {
        if (isPlus(unit)) continue;
        const plus = units.find(entry => entry.id === plusOf(unit.id));
        if (plus) paired.push({ title: unit.title, units: [unit, plus] });
        else single.push(unit);
    }

    const rows = [...paired];
    if (single.length > 0) rows.push({ title: null, units: single });
    return rows;
}

/** @param {import('../storage/index.js').Deck | null} deck */
function renderUnits(deck) {
    const container = document.getElementById('unit-list');
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

    // Aufgeklappt: was schon offen war, sonst Units mit gewählten Lektionen,
    // sonst die neueste Unit.
    const keys = [...groups.keys()];
    let open = openGroups.get(deck.id);
    if (!open) {
        open = new Set(keys.filter(key =>
            groups.get(key).some(unit => state.selectedUnits.includes(unit.id))));
        if (open.size === 0) open.add(keys[keys.length - 1]);
        openGroups.set(deck.id, open);
    }

    const plusLabels = deck.targetLang === 'fr'
        ? ['Vocabulaire', 'plus']
        : ['Wortliste', 'plus'];

    for (const [group, units] of groups) {
        container.append(renderGroup(deck, group, titles.get(group) ?? 'Lektionen', units, open, plusLabels));
    }

    refreshCounts();
}

/**
 * Eine Unit als aufklappbarer Block mit ihren Kacheln.
 * @param {Set<string>} open
 * @param {string[]} plusLabels Beschriftung der beiden Kacheln einer Zeile
 */
function renderGroup(deck, group, title, units, open, plusLabels) {
    const block = document.createElement('details');
    block.className = 'unit-group';
    block.dataset.group = group;
    block.open = open.has(group);
    block.addEventListener('toggle', () => {
        if (block.open) open.add(group);
        else open.delete(group);
    });

    const summary = document.createElement('summary');
    const name = document.createElement('span');
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
    summary.append(text, icon('i-chevron', 'chevron'));

    const body = document.createElement('div');
    body.className = 'unit-group-body';

    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'link unit-group-all';
    all.dataset.groupAll = group;
    all.addEventListener('click', () => toggleGroup(group));
    body.append(all);

    for (const row of rowsOf(units)) {
        const line = document.createElement('div');
        line.className = row.title ? 'unit-row' : 'unit-row plain';

        if (row.title) {
            const heading = document.createElement('span');
            heading.className = 'unit-row-title';
            heading.textContent = row.title;
            line.append(heading);
        }

        const tiles = document.createElement('div');
        tiles.className = 'unit-tiles';
        row.units.forEach((unit, index) => {
            const label = row.title ? plusLabels[index] : unit.title;
            tiles.append(renderTile(unit, group, label));
        });
        line.append(tiles);
        body.append(line);
    }

    block.append(summary, body);
    return block;
}

/** Eine Lektion als Kachel zum An- und Abwählen. */
function renderTile(unit, group, label) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'unit-tile';
    tile.value = unit.id;
    tile.dataset.group = group;
    tile.setAttribute('aria-pressed', String(state.selectedUnits.includes(unit.id)));
    tile.addEventListener('click', () => {
        tile.setAttribute('aria-pressed', String(!isOn(tile)));
        updateSelection();
    });

    const name = document.createElement('span');
    name.className = 'unit-tile-name';
    name.append(icon('i-check', 'check'));
    name.append(document.createTextNode(label));

    const count = document.createElement('span');
    count.className = 'unit-tile-count';
    count.dataset.unit = unit.id;

    tile.append(name, count);
    return tile;
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

    for (const count of document.querySelectorAll('#unit-list .unit-tile-count')) {
        count.textContent = words(sizeOf(count.dataset.unit));
    }

    for (const meta of document.querySelectorAll('#unit-list [data-group-meta]')) {
        const members = tiles().filter(tile => tile.dataset.group === meta.dataset.groupMeta);
        const total = members.reduce((sum, tile) => sum + sizeOf(tile.value), 0);
        const chosen = members.filter(isOn).length;
        meta.textContent = chosen > 0
            ? `${chosen} von ${members.length} gewählt`
            : `${members.length} ${members.length === 1 ? 'Lektion' : 'Lektionen'} · ${words(total)}`;
    }

    for (const button of document.querySelectorAll('#unit-list [data-group-all]')) {
        const members = tiles().filter(tile => tile.dataset.group === button.dataset.groupAll);
        button.textContent = members.every(isOn) ? 'keine wählen' : 'alle wählen';
    }
}

/** @param {number} n */
function words(n) {
    return `${n} ${n === 1 ? 'Wort' : 'Wörter'}`;
}

/** Wählt alle Lektionen einer Unit an – oder ab, wenn schon alle gewählt sind. */
function toggleGroup(group) {
    const members = tiles().filter(tile => tile.dataset.group === group);
    const allOn = members.every(isOn);
    for (const tile of members) tile.setAttribute('aria-pressed', String(!allOn));
    updateSelection();
}

/** @returns {HTMLButtonElement[]} */
function tiles() {
    return [...document.querySelectorAll('#unit-list .unit-tile')];
}

/** @param {HTMLButtonElement} tile */
function isOn(tile) {
    return tile.getAttribute('aria-pressed') === 'true';
}

function updateSelection() {
    state.selectedUnits = tiles().filter(isOn).map(tile => tile.value);
    refreshCounts();
    onChange();
}
