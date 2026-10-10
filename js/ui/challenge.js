// Oberfläche der Challenges: den Link zu einer gespielten Partie verschicken
// und eine eingehende Herausforderung annehmen. Die Daten selbst packt
// js/games/challenge.js.

import * as storage from '../storage/index.js';
import * as screens from './screens.js';
import { linkFor, randomAlias } from '../games/challenge.js';
import { formatTime } from '../games/host.js';

const LEVEL_LABELS = { basis: 'Basis', erweitert: 'Erweitert', expert: 'Expert' };

/** Der eigene Spitzname – einmal ausgewürfelt, dann behalten. */
async function ownAlias() {
    let alias = await storage.getSetting('alias', null);
    if (!alias) {
        alias = randomAlias();
        await storage.setSetting('alias', alias);
    }
    return alias;
}

/** @type {import('../games/challenge.js').Challenge | null} Was gerade zum Verschicken bereitsteht */
let outgoing = null;

function renderLink() {
    if (!outgoing) return;
    document.getElementById('share-alias').textContent = outgoing.alias;
    document.getElementById('share-link').value = linkFor(outgoing, location.href);
    document.getElementById('share-message').textContent = '';
}

export function init() {
    document.getElementById('share-reroll').addEventListener('click', async () => {
        if (!outgoing) return;
        outgoing.alias = randomAlias();
        await storage.setSetting('alias', outgoing.alias);
        renderLink();
    });

    document.getElementById('share-link').addEventListener('focus', event => event.target.select());

    document.getElementById('share-copy').addEventListener('click', async () => {
        const field = document.getElementById('share-link');
        const message = document.getElementById('share-message');
        try {
            await navigator.clipboard.writeText(field.value);
            message.textContent = 'Kopiert – jetzt in einen Chat einfügen.';
        } catch {
            // Ohne Zugriff auf die Zwischenablage: markieren und von Hand kopieren.
            field.focus();
            field.select();
            message.textContent = 'Der Link ist markiert – mit Kopieren (Strg+C) übernehmen.';
        }
    });

    const native = document.getElementById('share-native');
    native.hidden = typeof navigator.share !== 'function';
    native.addEventListener('click', () => {
        if (!outgoing) return;
        navigator.share({
            title: 'Vokabeltrainer – Herausforderung',
            text: `${outgoing.alias} fordert dich heraus: ${outgoing.score} Punkte. Schaffst du mehr?`,
            url: document.getElementById('share-link').value
        }).catch(() => { /* abgebrochen */ });
    });
}

/** Blendet die Karte aus, etwa wenn eine neue Partie beginnt. */
export function hideShare() {
    outgoing = null;
    document.getElementById('game-share').hidden = true;
}

/**
 * Zeigt den Link zur eben gespielten Partie.
 * @param {{game: {id: string}, deck: {id: string, version?: number}, units: string[], level: string, seed: number, result: {score: number, ms: number, spec?: object}}} round
 */
export async function share(round) {
    outgoing = {
        v: 1,
        game: round.game.id,
        deck: round.deck.id,
        ver: round.deck.version ?? 0,
        units: round.units,
        level: round.level,
        seed: round.seed,
        ...(round.result.spec ? { spec: round.result.spec } : {}),
        score: round.result.score,
        ms: round.result.ms,
        alias: await ownAlias()
    };

    renderLink();
    const card = document.getElementById('game-share');
    card.hidden = false;
    card.scrollIntoView({ block: 'nearest' });
}

/**
 * Kündigt auf der Startseite an, dass eine Herausforderung wartet.
 * @param {import('../games/challenge.js').Challenge | null} challenge
 */
export function announce(challenge) {
    const box = document.getElementById('start-challenge');
    box.hidden = !challenge;
    if (challenge) box.textContent = `${challenge.alias} hat dich herausgefordert – gib deinen Namen ein, dann geht es los.`;
}

/**
 * Zeigt eine eingehende Herausforderung.
 * @param {import('../games/challenge.js').Challenge} challenge
 * @param {{gameLabel: string, deck: import('../storage/index.js').Deck | null, playable: boolean, problem: string}} info
 * @param {{accept: () => void, decline: () => void}} handlers
 */
export function showIncoming(challenge, info, handlers) {
    document.getElementById('challenge-text').textContent =
        `${challenge.alias}: ${challenge.score} Punkte in ${formatTime(challenge.ms)}`;

    // "Unité 2 – Drôle de famille: Lernziel 1, Lernziel 2" – die Unit nur einmal.
    const byGroup = new Map();
    for (const unit of info.deck?.units.filter(entry => challenge.units.includes(entry.id)) ?? []) {
        const group = info.deck.groups?.find(entry => entry.id === unit.group)?.title ?? '';
        byGroup.set(group, [...(byGroup.get(group) ?? []), unit.title]);
    }
    const lessons = [...byGroup]
        .map(([group, titles]) => (group ? `${group}: ${titles.join(', ')}` : titles.join(', ')))
        .join(' · ');
    document.getElementById('challenge-detail').textContent =
        [info.gameLabel, info.deck?.title, lessons, `Niveau ${LEVEL_LABELS[challenge.level]}`].filter(Boolean).join(' · ');

    const warning = document.getElementById('challenge-warning');
    warning.hidden = !info.problem;
    warning.textContent = info.problem;

    const accept = document.getElementById('challenge-accept');
    accept.hidden = !info.playable;
    accept.onclick = handlers.accept;
    document.getElementById('challenge-decline').onclick = handlers.decline;

    screens.show('screen-challenge');
}
