// Wandelt eine Semikolon-CSV in ein Deck-JSON um.
// Aufruf: node tools/csv-to-deck.mjs <csv> <ziel.json> <deckId> <titel> <sourceLang> <targetLang> [version]
// Die CSV-Spalten sind Lektion;Zielsprache;Ausgangssprache – also die zu
// lernende Sprache vor Deutsch. Im Deck steht source (Deutsch) zuerst.
//
// Gelesen wird mit demselben Parser wie im Browser, damit ein Deck aus diesem
// Tool und ein Deck aus dem Import-Knopf identisch aufgebaut sind.
import { readFileSync, writeFileSync } from 'node:fs';
import { deckFromCsv } from '../js/data/csv.js';

const [csvPath, outPath, deckId, title, sourceLang, targetLang, version] = process.argv.slice(2);

const raw = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '');
const deck = deckFromCsv(raw, { id: deckId, title, sourceLang, targetLang });

deck.builtin = true;
deck.version = Number(version) || 1;

writeFileSync(outPath, JSON.stringify(deck, null, 2) + '\n', 'utf8');

const count = deck.units.reduce((sum, unit) => sum + unit.items.length, 0);
console.log(`${outPath}: ${deck.units.length} Lektionen, ${count} Einträge`);
for (const unit of deck.units) console.log(`  ${unit.id.padEnd(14)} ${unit.title} (${unit.items.length})`);
