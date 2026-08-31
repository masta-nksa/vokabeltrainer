// Druckvorlage: Tabelle der gewählten Wörter, wahlweise mit Lücke zum
// Ausfüllen.

import { shuffle } from '../util.js';
import { languageName } from '../data/decks.js';

/** @type {import('../storage/index.js').Item[]} */
let rows = [];
/** @type {import('../storage/index.js').Deck | null} */
let deck = null;

export function init() {
    document.getElementById('print-shuffle').addEventListener('click', () => {
        rows = shuffle(rows);
        renderTable();
    });
    document.getElementById('print-start').addEventListener('click', printWindow);
    document.getElementById('print-close').addEventListener('click', close);
    document.getElementById('print-overlay').addEventListener('click', close);

    for (const radio of document.querySelectorAll('input[name="print-mode"]')) {
        radio.addEventListener('change', renderTable);
    }
}

/**
 * @param {import('../storage/index.js').Deck} selectedDeck
 * @param {import('../storage/index.js').Item[]} items
 */
export function open(selectedDeck, items) {
    deck = selectedDeck;
    rows = [...items];
    renderTable();
    document.getElementById('print-overlay').hidden = false;
    document.getElementById('print-dialog').hidden = false;
}

export function close() {
    document.getElementById('print-overlay').hidden = true;
    document.getElementById('print-dialog').hidden = true;
}

function printMode() {
    const checked = document.querySelector('input[name="print-mode"]:checked');
    return checked ? checked.value : 'both';
}

function headings() {
    if (!deck) return ['', ''];
    const source = languageName(deck.sourceLang);
    const target = languageName(deck.targetLang);
    const mode = printMode();

    if (mode === 'both') return [target, source];
    if (mode === 'source') return [source, target];
    return [target, source];
}

function renderTable() {
    const table = document.getElementById('print-table');
    table.replaceChildren();

    const [left, right] = headings();
    const head = table.createTHead().insertRow();
    for (const title of [left, right]) {
        const cell = document.createElement('th');
        cell.textContent = title;
        head.append(cell);
    }

    const mode = printMode();
    const body = table.createTBody();

    for (const item of rows) {
        const row = body.insertRow();
        if (mode === 'both') {
            row.insertCell().textContent = item.target;
            row.insertCell().textContent = item.source;
        } else if (mode === 'source') {
            row.insertCell().textContent = item.source;
            row.insertCell().className = 'blank';
        } else {
            row.insertCell().textContent = item.target;
            row.insertCell().className = 'blank';
        }
    }
}

/**
 * Druckt in einem eigenen Fenster. Die Seite selbst bleibt dabei unangetastet
 * samt allen Ereignisbindungen.
 */
function printWindow() {
    const table = document.getElementById('print-table');
    const win = window.open('', '_blank', 'width=800,height=600');

    if (!win) {
        alert('Der Browser hat das Druckfenster blockiert. Bitte Pop-ups für diese Seite erlauben.');
        return;
    }

    const title = deck ? deck.title : 'Wortschatz';
    win.document.write(
        '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">' +
        '<title>' + title.replace(/[<>&]/g, '') + '</title><style>' +
        'body{font-family:system-ui,sans-serif;margin:2rem}' +
        'h1{font-size:1.2rem}' +
        'table{width:100%;border-collapse:collapse;margin-top:1rem}' +
        'th,td{border:1px solid #999;padding:.5rem;text-align:left}' +
        'td.blank{width:55%}' +
        '</style></head><body><h1></h1></body></html>'
    );
    win.document.close();
    win.document.querySelector('h1').textContent = title;
    win.document.body.append(win.document.importNode(table, true));

    win.focus();
    win.print();
    win.close();
}
