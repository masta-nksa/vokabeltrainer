// Nimmt den kuratierten Entwurf und schreibt ihn in ein mitgeliefertes Deck.
//
// Aufruf:  node tools/voci-import/build.mjs [entwurf.json]
//
// - je Test eine Lektion (Unit); ohne Tests eine einzige Lektion für die Unit
// - der Wortbereich eines Tests ergibt sich aus "von Begriff" bis "bis Begriff"
// - vorhandene Lektionen derselben Unit werden ersetzt, andere bleiben
// - die Deck-Version und der Eintrag in data/decks/index.json zählen hoch

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const draftFile = process.argv[2]
    ? join(process.cwd(), process.argv[2])
    : join(here, 'draft', 'draft.json');

const MONTHS = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const norm = s => String(s).trim().toLowerCase().replace(/\s+/g, ' ');

function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    return `${Number(m[3])}. ${MONTHS[Number(m[2]) - 1]}`;
}

function sliceByTerms(rows, fromTerm, toTerm, testLabel) {
    const find = term => rows.findIndex(r => norm(r.en) === norm(term));
    let a = fromTerm ? find(fromTerm) : 0;
    let b = toTerm ? find(toTerm) : rows.length - 1;
    if (a === -1) throw new Error(`${testLabel}: Begriff "${fromTerm}" nicht in den Zeilen gefunden.`);
    if (b === -1) throw new Error(`${testLabel}: Begriff "${toTerm}" nicht in den Zeilen gefunden.`);
    if (a > b) [a, b] = [b, a];
    return rows.slice(a, b + 1);
}

function itemFrom(code, row) {
    const item = {
        id: `${code}-${String(row.nr).padStart(3, '0')}`,
        source: row.de.trim(),
        target: row.en.trim()
    };
    if (row.image && row.image.trim()) item.image = row.image.trim();
    return item;
}

const draft = JSON.parse(await readFile(draftFile, 'utf8'));
const { deckId, unit } = draft;
const code = unit.code;
const rows = draft.rows.filter(r => r.keep !== false && r.en && r.de);

if (rows.length === 0) throw new Error('Der Entwurf enthält keine übernehmbaren Zeilen.');

const deckFile = join(repoRoot, draft.deckFile || `data/decks/${deckId}.json`);
let deck;
try {
    deck = JSON.parse(await readFile(deckFile, 'utf8'));
} catch {
    deck = {
        id: deckId,
        title: draft.deckTitle || deckId,
        sourceLang: draft.sourceLang || 'de',
        targetLang: draft.targetLang || 'en',
        builtin: true,
        version: 0,
        units: []
    };
}

// Neue Lektionen für diese Unit aufbauen.
const newUnits = [];
if (Array.isArray(draft.tests) && draft.tests.length > 0) {
    for (const test of draft.tests) {
        const part = sliceByTerms(rows, test.fromTerm, test.toTerm, test.label || test.id);
        const date = formatDate(test.date);
        newUnits.push({
            id: `${code}-${test.id}`,
            title: `${code} ${unit.title} · ${test.label || test.id}${date ? ` (${date})` : ''}`,
            ...(test.date ? { test: { date: test.date } } : {}),
            items: part.map(r => itemFrom(code, r))
        });
    }
} else {
    newUnits.push({
        id: code,
        title: `${code} ${unit.title}`,
        items: rows.map(r => itemFrom(code, r))
    });
}

// Alte Lektionen derselben Unit entfernen, Rest behalten, dann nach id sortieren.
const kept = deck.units.filter(u => u.id !== code && !u.id.startsWith(`${code}-`));
deck.units = [...kept, ...newUnits].sort((a, b) => a.id.localeCompare(b.id, 'en'));
deck.builtin = true;
deck.version = (deck.version || 0) + 1;

await writeFile(deckFile, JSON.stringify(deck, null, 2) + '\n');

// Index-Datei nachziehen.
const indexFile = join(repoRoot, 'data', 'decks', 'index.json');
const index = JSON.parse(await readFile(indexFile, 'utf8'));
let entry = index.decks.find(d => d.id === deckId);
if (!entry) {
    entry = { id: deckId, title: deck.title, file: `data/decks/${deckId}.json`, version: 0 };
    index.decks.push(entry);
}
entry.version = deck.version;
await writeFile(indexFile, JSON.stringify(index, null, 2) + '\n');

// Zusammenfassung.
console.log(`${deckFile}`);
console.log(`Deck-Version jetzt ${deck.version}`);
for (const u of newUnits) {
    const withImg = u.items.filter(i => i.image).length;
    console.log(`  ${u.id.padEnd(12)} ${u.title}  (${u.items.length} Wörter, ${withImg} mit Bild)`);
}
