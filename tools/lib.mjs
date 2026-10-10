// Gemeinsame Helfer der Entwicklungsskripte.

import { splitArticle } from '../js/util.js';

/** Kennung aus einem Wort: ohne Akzente, klein, Bindestriche. */
export function slug(text) {
    return text
        .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
        .replace(/-$/, '');
}

/** Das Wort ohne führenden Artikel – Grundlage der Kennung. */
export function lemmaOf(target, lang) {
    return splitArticle(target, lang)?.rest ?? target;
}

/** Ein Objekt auf einer Zeile, mit Leerzeichen wie von Hand geschrieben. */
export function compact(value) {
    if (Array.isArray(value)) return `[${value.map(compact).join(', ')}]`;
    if (value && typeof value === 'object') {
        return `{ ${Object.entries(value).map(([key, entry]) => `${JSON.stringify(key)}: ${compact(entry)}`).join(', ')} }`;
    }
    return JSON.stringify(value);
}

/**
 * Schreibt eine Übungsdatei so, wie sie von Hand gepflegt wird: eine Aufgabe
 * pro Zeile. JSON.stringify würde jede Aufgabe über sechs Zeilen ziehen.
 */
export function exercisesToText(data) {
    const NL = '\n';
    const sets = data.sets.map(set => {
        const { tasks = [], ...head } = set;
        const lines = Object.entries(head).map(([key, value]) => `      ${JSON.stringify(key)}: ${compact(value)},`);
        const taskLines = tasks.map(task => `        ${compact(task)}`);
        return ['    {', ...lines, '      "tasks": [', taskLines.join(',' + NL), '      ]', '    }'].join(NL);
    });
    const { sets: _, ...head } = data;
    const headLines = Object.entries(head).map(([key, value]) => `  ${JSON.stringify(key)}: ${compact(value)},`);
    return ['{', ...headLines, '  "sets": [', sets.join(',' + NL), '  ]', '}', ''].join(NL);
}
