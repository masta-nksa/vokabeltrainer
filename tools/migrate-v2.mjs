// Einmalige Umstellung der mitgelieferten Daten auf das Inhaltsmodell v2
// (docs/KONZEPT.md, Abschnitt 1). Gelaufen im Oktober 2026; bleibt im Repo,
// damit nachvollziehbar ist, woher Gruppen, Kennungen und Aliase stammen.
//
//   node tools/migrate-v2.mjs
//
// 1. en-doubledecker-3: Units als `groups`, jede Lektion nennt ihre `group`.
// 2. fr-unite-1 → fr-disdonc: ein Kurs für das ganze Lehrmittel. Angaben wie
//    "(m)" und Doppelformen ("la géo, la géographie") wandern aus dem
//    Lösungswort in eigene Felder; neue stabile Kennungen, die alten als Alias.
// 3. Übungsaufgaben bekommen feste Kennungen statt solcher aus der Position.

import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { slug, exercisesToText } from './lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = async file => JSON.parse(await readFile(join(root, file), 'utf8'));
const write = (file, data) => writeFile(join(root, file), JSON.stringify(data, null, 2) + '\n');

// ------------------------------------------------------- DoubleDecker 3

async function migrateDoubleDecker() {
    const file = 'data/decks/en-doubledecker-3.json';
    const deck = await read(file);
    if (deck.groups) return console.log(`${file}: schon umgestellt`);

    const groups = new Map();
    for (const unit of deck.units) {
        // "3_2 Unit 2 – Music · Test 1 (29. Okt)"
        const match = /^(\S+) (.+?) · (.+)$/.exec(unit.title);
        if (!match) throw new Error(`Unerwarteter Titel: ${unit.title}`);
        const [, code, groupTitle, sectionTitle] = match;
        groups.set(code, groupTitle);
        unit.group = code;
        unit.title = sectionTitle;
    }

    const migrated = {
        id: deck.id, title: deck.title, sourceLang: deck.sourceLang, targetLang: deck.targetLang,
        builtin: true, version: deck.version + 1,
        groups: [...groups].map(([id, title]) => ({ id, title })),
        units: deck.units.map(({ id, title, group, test, items }) => ({ id, title, group, ...(test ? { test } : {}), items }))
    };
    await write(file, migrated);
    console.log(`${file}: ${migrated.groups.length} Units, Version ${migrated.version}`);
    return migrated.version;
}

// ------------------------------------------------------------ Französisch

const ARTICLE = /^(le|la|les|un|une|des)\s+|^l['’]/i;

/** Löst "(m)", "(f pl)" und Doppelformen aus dem Lösungswort. */
function cleanTarget(raw) {
    const out = {};
    let text = raw;

    const marker = /\s*\((m|f)( pl)?\)/.exec(text);
    if (marker) {
        out.gender = marker[1];
        if (marker[2]) out.number = 'pl';
        text = text.replace(marker[0], '');
    }

    // "ACM (activités créatrices manuelles)": Abkürzung und ausgeschrieben
    const expansion = /^(\S+) \((.+)\)$/.exec(text);
    if (expansion) {
        out.target = expansion[1];
        out.accept = [expansion[2]];
        return out;
    }

    // "la géo, la géographie" – aber keine Sätze ("Chouette, c'est …!")
    const forms = /[.!?]$/.test(text) ? [text] : text.split(/,\s*/);
    out.target = forms[0].trim();
    if (forms.length > 1) out.accept = forms.slice(1).map(form => form.trim());
    return out;
}

async function migrateFrench() {
    const oldFile = 'data/decks/fr-unite-1.json';
    let old;
    try {
        old = await read(oldFile);
    } catch {
        return console.log(`${oldFile}: schon umgestellt`);
    }

    const sectionIds = { 'lernziel-1': 'u1-lz1', 'lernziel-s': 'u1-lzs', 'lernziel-2': 'u1-lz2', 'lernziel-3': 'u1-lz3' };
    const seen = new Set();

    const units = old.units.map(unit => ({
        id: sectionIds[unit.id],
        title: unit.title,
        group: 'u1',
        items: unit.items.map(item => {
            const cleaned = cleanTarget(item.target);
            const lemma = cleaned.target.replace(ARTICLE, '');
            const id = `u1-${slug(lemma)}`;
            if (seen.has(id)) throw new Error(`Kennung doppelt: ${id}`);
            seen.add(id);

            return {
                id,
                source: item.source,
                target: cleaned.target,
                ...(cleaned.accept ? { accept: cleaned.accept } : {}),
                ...(cleaned.gender ? { gender: cleaned.gender } : {}),
                ...(cleaned.number ? { number: cleaned.number } : {}),
                ...(item.image ? { image: item.image } : {}),
                aliases: [item.id]
            };
        })
    }));

    const deck = {
        id: 'fr-disdonc',
        title: 'Französisch – dis donc!',
        sourceLang: 'de',
        targetLang: 'fr',
        builtin: true,
        version: 1,
        aliases: ['fr-unite-1'],
        groups: [{ id: 'u1', title: 'Unité 1' }],
        units
    };

    await write('data/decks/fr-disdonc.json', deck);
    await rm(join(root, oldFile));
    console.log(`data/decks/fr-disdonc.json: ${units.reduce((n, u) => n + u.items.length, 0)} Einträge aus fr-unite-1`);
    return deck;
}

// ---------------------------------------------------------------- Übungen

async function freezeTaskIds(file) {
    const data = await read(file);
    let added = 0;
    for (const set of data.sets) {
        set.tasks = set.tasks.map((task, index) => {
            if (task.id) return task;
            added++;
            return { id: `${set.id}-${String(index + 1).padStart(2, '0')}`, ...task };
        });
    }
    if (added > 0) {
        data.version = (data.version ?? 1) + 1;
        await writeFile(join(root, file), exercisesToText(data));
    }
    console.log(`${file}: ${added} Aufgaben mit fester Kennung`);
}

// ------------------------------------------------------------------ Index

const ddVersion = await migrateDoubleDecker();
const french = await migrateFrench();
await freezeTaskIds('data/exercises/en-doubledecker-3.json');

const index = await read('data/decks/index.json');
if (ddVersion) index.decks.find(entry => entry.id === 'en-doubledecker-3').version = ddVersion;
if (french) {
    index.decks = index.decks.filter(entry => entry.id !== 'fr-unite-1');
    index.decks.push({
        id: french.id, title: french.title, file: 'data/decks/fr-disdonc.json',
        version: french.version, replaces: ['fr-unite-1']
    });
}
await write('data/decks/index.json', index);
