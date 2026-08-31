// Wandelt eine Semikolon-CSV in ein Deck-JSON um.
// Aufruf: node tools/csv-to-deck.mjs <csv> <ziel.json> <deckId> <titel> <sourceLang> <targetLang>
// Die CSV-Spalten der Altdaten sind Lektion;Zielsprache;Ausgangssprache – also
// Englisch vor Deutsch. Im Deck steht source (Deutsch) zuerst, target danach.
import { readFileSync, writeFileSync } from 'node:fs';

const [csvPath, outPath, deckId, title, sourceLang, targetLang] = process.argv.slice(2);

const raw = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const rows = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '')
    .slice(1)
    .map(line => line.split(';').map(cell => cell.trim()));

const units = [];
const byUnit = new Map();

for (const [unitTitle, target, source] of rows) {
    if (!unitTitle || !target || !source) continue;
    if (!byUnit.has(unitTitle)) {
        const unit = { id: unitTitle.split(' ')[0], title: unitTitle, items: [] };
        byUnit.set(unitTitle, unit);
        units.push(unit);
    }
    const unit = byUnit.get(unitTitle);
    unit.items.push({
        id: `${unit.id}-${String(unit.items.length + 1).padStart(3, '0')}`,
        source,
        target
    });
}

const deck = { id: deckId, title, sourceLang, targetLang, builtin: true, units };
writeFileSync(outPath, JSON.stringify(deck, null, 2) + '\n', 'utf8');

const count = units.reduce((sum, unit) => sum + unit.items.length, 0);
console.log(`${outPath}: ${units.length} Lektionen, ${count} Einträge`);
