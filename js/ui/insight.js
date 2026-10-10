// Ansicht «Meine Stolpersteine»: Lernkartei, häufige Fehlerarten,
// Verwechslungen, Grammatik, unsichere Wörter – jeweils mit einem Knopf, der
// genau das übt.

import { summarize, statusOf, BOX_DAYS } from '../learning/mastery.js';
import { ERROR_LABELS } from '../learning/errors.js';
import { targetForms } from '../data/decks.js';

// So viele unsichere Wörter stehen in der Liste; geübt werden alle.
const WEAK_SHOWN = 12;

/**
 * @typedef {Object} Handlers
 * @property {(items: import('../storage/index.js').Item[], mode: string, title: string) => void} practice
 * @property {(exerciseId: string) => boolean} practiceGrammar  false, wenn es das Set nicht gibt
 */

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function practiceButton(label, onClick) {
    const button = el('button', null, label);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
}

/**
 * @param {import('../storage/index.js').Deck} deck
 * @param {import('../storage/index.js').Item[]} scope  Die gewählten Wörter – oder alle
 * @param {string} scopeLabel
 * @param {import('../learning/insight.js').Insight} insight
 * @param {{id: string, title: string, grammarId?: string}[]} sets  Übungssets des Decks
 * @param {Handlers} handlers
 */
export function render(deck, scope, scopeLabel, insight, sets, handlers) {
    const everything = deck.units.flatMap(unit => unit.items);
    const byId = new Map(everything.map(item => [item.id, item]));

    document.getElementById('insight-scope').textContent = scopeLabel;

    renderBoxes(scope, insight);
    renderErrors(insight, byId, deck, handlers);
    renderConfusions(insight, byId, deck, handlers);
    renderGrammar(insight, sets, handlers);
    renderWeak(scope, insight, deck, handlers);
}

function renderBoxes(scope, insight) {
    const summary = summarize(scope, insight.mastery, insight.now);
    const box = document.getElementById('insight-boxes');
    box.replaceChildren();

    const columns = [
        ['neu', summary.new, 'noch nie geübt'],
        ...summary.boxes.slice(1).map((count, index) =>
            [`Fach ${index + 1}`, count, index === 0 ? 'gleich nochmals' : `nach ${BOX_DAYS[index + 1]} Tagen`])
    ];
    const most = Math.max(1, ...columns.map(([, count]) => count));

    for (const [label, count, caption] of columns) {
        const column = el('div', 'box');
        const bar = el('div', 'box-bar');
        bar.style.height = `${Math.round(count / most * 100)}%`;
        const track = el('div', 'box-track');
        track.append(bar);
        column.append(el('strong', null, String(count)), track, el('span', null, label), el('small', null, caption));
        box.append(column);
    }

    document.getElementById('insight-summary').textContent = summary.total === 0
        ? 'Keine Wörter in der Auswahl.'
        : `${summary.safe} von ${summary.total} Wörtern sitzen, ${summary.due} sind zur Wiederholung dran. `
          + 'Jedes richtige Wort wandert ein Fach weiter, ein Fehler bringt es zurück ins erste.';
}

function renderErrors(insight, byId, deck, handlers) {
    const box = document.getElementById('insight-errors');
    box.replaceChildren();

    const types = insight.profile.errorTypes.filter(entry => entry.type !== 'confusion').slice(0, 5);
    if (types.length === 0) {
        box.append(el('p', 'hint', 'Noch keine Fehler in den letzten Wochen – oder noch nichts geübt.'));
        return;
    }

    for (const entry of types) {
        const row = el('div', 'insight-row');
        const text = el('div');
        text.append(el('strong', null, `${ERROR_LABELS[entry.type] ?? entry.type} · ${entry.count}×`));

        for (const example of entry.examples) {
            const item = byId.get(example.itemId);
            if (!item) continue;
            const line = el('p', 'hint');
            const wrong = el('s', null, example.given);
            wrong.lang = deck.targetLang;
            const right = el('span', null, targetForms(item)[0]);
            right.lang = deck.targetLang;
            line.append(wrong, ' → ', right);
            text.append(line);
        }
        row.append(text);

        const items = entry.itemIds.map(id => byId.get(id)).filter(Boolean);
        if (items.length > 0) {
            row.append(practiceButton('gezielt üben', () =>
                handlers.practice(items, 'writing', ERROR_LABELS[entry.type] ?? 'Gezielt üben')));
        }
        box.append(row);
    }
}

function renderConfusions(insight, byId, deck, handlers) {
    const card = document.getElementById('insight-confusions-card');
    const box = document.getElementById('insight-confusions');
    box.replaceChildren();

    const pairs = insight.profile.confusions
        .map(pair => ({ ...pair, first: byId.get(pair.a), second: byId.get(pair.b) }))
        .filter(pair => pair.first && pair.second)
        .slice(0, 6);

    card.hidden = pairs.length === 0;
    if (pairs.length === 0) return;

    for (const pair of pairs) {
        const row = el('div', 'insight-row');
        const text = el('div');
        for (const item of [pair.first, pair.second]) {
            const line = el('p');
            const target = el('strong', null, item.target);
            target.lang = deck.targetLang;
            line.append(target, ` – ${item.source}`);
            text.append(line);
        }
        row.append(text);
        box.append(row);
    }

    const all = [...new Set(pairs.flatMap(pair => [pair.first, pair.second]))];
    box.append(practiceButton('diese Paare üben', () => handlers.practice(all, 'terms', 'Verwechslungen')));
}

function renderGrammar(insight, sets, handlers) {
    const card = document.getElementById('insight-grammar-card');
    const box = document.getElementById('insight-grammar');
    box.replaceChildren();

    const rows = insight.profile.grammar
        .map(entry => ({ ...entry, set: sets.find(set => set.id === entry.exerciseId) }))
        .filter(entry => entry.set && entry.total >= 3);

    card.hidden = rows.length === 0;

    for (const entry of rows) {
        const row = el('div', 'insight-row');
        const percent = Math.round(entry.clean / entry.total * 100);
        const text = el('div');
        text.append(
            el('strong', null, entry.set.title.replace(/^Unit[ée]?\s*\d+\s*[–-]\s*/, '')),
            el('p', 'hint', `${percent} % auf Anhieb richtig (${entry.clean} von ${entry.total})`)
        );
        row.append(text, practiceButton('üben', () => handlers.practiceGrammar(entry.exerciseId)));
        box.append(row);
    }
}

function renderWeak(scope, insight, deck, handlers) {
    const card = document.getElementById('insight-weak-card');
    const list = document.getElementById('insight-weak');
    list.replaceChildren();

    const weak = scope
        .filter(item => statusOf(insight.mastery.get(item.id)) === 'weak')
        .sort((a, b) => insight.mastery.get(b.id).wrong - insight.mastery.get(a.id).wrong);

    card.hidden = weak.length === 0;

    for (const item of weak.slice(0, WEAK_SHOWN)) {
        const row = el('li');
        const target = el('strong', null, targetForms(item).join(', '));
        target.lang = deck.targetLang;
        row.append(target, ` – ${item.source}`);
        list.append(row);
    }
    if (weak.length > WEAK_SHOWN) list.append(el('li', 'hint', `… und ${weak.length - WEAK_SHOWN} weitere`));

    // Der Knopf übt alle unsicheren Wörter, nicht nur die gezeigten.
    const button = document.getElementById('insight-weak-start');
    button.onclick = () => handlers.practice(weak, 'terms', 'Noch unsicher');
}
