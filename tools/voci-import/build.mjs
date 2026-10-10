// Nimmt den kuratierten Entwurf und schreibt ihn in ein mitgeliefertes Deck.
//
// Aufruf:  node tools/voci-import/build.mjs [entwurf.json]
//
// Eine Unit des Lehrmittels wird zu einer Gruppe mit einer oder mehreren
// Lektionen:
// - `tests`:    je Test eine Lektion; der Wortbereich ergibt sich aus
//               "von Begriff" bis "bis Begriff"
// - `sections`: je Lernziel eine Lektion; jede Zeile nennt ihre `section`
// - keins von beiden: eine einzige Lektion für die Unit
//
// Vorhandene Lektionen derselben Unit werden ersetzt, andere bleiben. Die
// Deck-Version und der Eintrag in data/decks/index.json zählen hoch.
//
// Kennungen bleiben stabil: Ein Eintrag, den es mit demselben Zielwort schon
// gibt, behält seine Kennung – der Lernstand hängt daran.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { slug, lemmaOf } from '../lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const draftFile = process.argv[2]
    ? join(process.cwd(), process.argv[2])
    : join(here, 'draft', 'draft.json');

const MONTHS = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const LEVELS = ['erweitert', 'expert']; // "basis" ist der Normalfall und steht nicht im Deck

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

const belongsToUnit = u => u.group === code || u.id === code || u.id.startsWith(`${code}-`);

// Was es schon gibt: Zielwort → Kennung und Aliase. Wird ein Wort korrigiert
// und trägt die Zeile seine `id`, bleibt die Kennung ebenfalls.
const existing = new Map();
for (const u of deck.units.filter(belongsToUnit)) {
    for (const item of u.items) existing.set(norm(item.target), item);
}

const used = new Set();

// Zwei verschiedene Wörter dürfen nie dieselbe Kennung bekommen – bei
// Kennungen aus dem Wort (idStyle "slug") kann das passieren.
const targetOfId = new Map();

function itemId(row) {
    if (row.id) return row.id;
    const known = existing.get(norm(row.en));
    if (known) return known.id;
    if (draft.idStyle === 'slug') return `${code}-${slug(lemmaOf(row.en.trim(), deck.targetLang))}`;
    return `${code}-${String(row.nr).padStart(3, '0')}`;
}

function itemFrom(row) {
    const id = itemId(row);
    const known = existing.get(norm(row.en));
    const accept = (Array.isArray(row.accept) ? row.accept : String(row.accept ?? '').split(','))
        .map(form => form.trim()).filter(Boolean);

    const item = {
        id,
        source: row.de.trim(),
        target: row.en.trim(),
        ...(accept.length > 0 ? { accept } : {}),
        ...(LEVELS.includes(row.level) ? { level: row.level } : {}),
        ...(row.gender === 'm' || row.gender === 'f' ? { gender: row.gender } : {}),
        ...(row.number === 'pl' ? { number: 'pl' } : {}),
        ...(row.pos ? { pos: row.pos } : {}),
        ...(row.image && row.image.trim() ? { image: row.image.trim() } : {}),
        ...(Array.isArray(row.tags) && row.tags.length > 0 ? { tags: row.tags } : {}),
        ...(row.concept ? { concept: row.concept } : {}),
        ...(known?.aliases ? { aliases: known.aliases } : {})
    };
    return item;
}

/** Baut die Einträge einer Lektion und prüft, dass keine Kennung doppelt ist. */
function itemsFor(part, lessonId) {
    const seenHere = new Set();
    return part.map(row => {
        const item = itemFrom(row);
        if (seenHere.has(item.id)) throw new Error(`${lessonId}: Kennung ${item.id} kommt doppelt vor.`);
        seenHere.add(item.id);
        used.add(item.id);

        const other = targetOfId.get(item.id);
        if (other && other !== norm(item.target)) {
            throw new Error(`Kennung ${item.id} steht für "${other}" und "${item.target}". Einer Zeile eine eigene "id" geben.`);
        }
        targetOfId.set(item.id, norm(item.target));
        return item;
    });
}

// Neue Lektionen für diese Unit aufbauen.
const newUnits = [];
if (Array.isArray(draft.tests) && draft.tests.length > 0) {
    for (const test of draft.tests) {
        const part = sliceByTerms(rows, test.fromTerm, test.toTerm, test.label || test.id);
        const date = formatDate(test.date);
        const id = `${code}-${test.id}`;
        newUnits.push({
            id,
            title: `${test.label || test.id}${date ? ` (${date})` : ''}`,
            group: code,
            ...(test.date ? { test: { date: test.date } } : {}),
            items: itemsFor(part, id)
        });
    }
} else if (Array.isArray(draft.sections) && draft.sections.length > 0) {
    for (const section of draft.sections) {
        const part = rows.filter(r => r.section === section.id);
        if (part.length === 0) continue;
        const id = `${code}-${section.id}`;
        newUnits.push({ id, title: section.title, group: code, items: itemsFor(part, id) });
    }
    const orphans = rows.filter(r => !draft.sections.some(s => s.id === r.section));
    if (orphans.length > 0) {
        throw new Error(`${orphans.length} Zeile(n) ohne gültige Lektion, z.B. "${orphans[0].en}".`);
    }
} else {
    newUnits.push({ id: code, title: `${code} ${unit.title}`, items: itemsFor(rows, code) });
}

// Alte Lektionen derselben Unit entfernen, Rest behalten. Die Reihenfolge der
// Units folgt der Kennung, die der Lektionen innerhalb der Unit dem Entwurf.
const kept = deck.units.filter(u => !belongsToUnit(u));
const order = new Map(newUnits.map((u, i) => [u.id, i]));
deck.units = [...kept, ...newUnits].sort((a, b) => {
    const ga = a.group ?? a.id;
    const gb = b.group ?? b.id;
    if (ga !== gb) return ga.localeCompare(gb, 'en', { numeric: true });
    if (order.has(a.id) && order.has(b.id)) return order.get(a.id) - order.get(b.id);
    return 0;
});

// Die Unit als Gruppe führen, sobald sie mehrere Lektionen hat.
if (newUnits.some(u => u.group)) {
    const groups = (deck.groups ?? []).filter(g => g.id !== code);
    groups.push({ id: code, title: unit.title });
    deck.groups = groups.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}

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
    const levels = u.items.filter(i => i.level).length;
    console.log(`  ${u.id.padEnd(12)} ${u.title}  (${u.items.length} Wörter, ${withImg} mit Bild${levels ? `, ${levels} über Basis` : ''})`);
}

// Kennungen, die es vorher gab und jetzt nicht mehr: deren Lernstand hängt in
// der Luft. Kein Abbruch – aber es soll niemandem entgehen.
const gone = [...existing.values()].filter(item => !used.has(item.id));
if (gone.length > 0) {
    console.log(`\nAchtung: ${gone.length} bisherige Kennung(en) fallen weg:`);
    for (const item of gone) console.log(`  ${item.id}  (${item.target})`);
}
