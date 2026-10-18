// Rahmen für alle Spiele: Bildschirm, Protokoll, Ergebnis. Ein Spiel ist ein
// Modul mit `available` und `start` (siehe Typ Game) – es bekommt eine
// Wortmenge und eine Bühne, meldet jede Antwort über `log` und das Ende über
// `finish`. Spiele sind damit eine andere Oberfläche für dieselbe
// Sprachübung: ihre Antworten landen im selben Protokoll wie die des Quiz.

import { state } from '../state.js';
import * as storage from '../storage/index.js';
import * as screens from '../ui/screens.js';
import * as reward from '../ui/reward.js';
import { targetForms } from '../data/decks.js';
import { randomSeed } from './rng.js';
import * as crossword from './crossword.js';
import * as sorter from './sorter.js';
import * as speed from './speed.js';

/**
 * @typedef {Object} GameContext
 * @property {import('../storage/index.js').Deck} deck
 * @property {import('../storage/index.js').Item[]} items  Die gewählten Wörter
 * @property {import('../learning/levels.js').Level} level
 * @property {number} seed       Startwert: gleiche Partie bei gleichem Wert
 * @property {object | null} spec  Vorgaben einer Challenge (z.B. die Wörter)
 * @property {HTMLElement} stage   Hier baut das Spiel seine Oberfläche
 * @property {(text: string) => void} status  Zeile über der Bühne
 * @property {import('../learning/insight.js').Insight | null} insight
 * @property {(attempt: object) => void} log  Eine Antwort protokollieren
 * @property {(result: GameResult) => void} finish
 *
 * @typedef {Object} GameResult
 * @property {number} score
 * @property {number} ms         Spieldauer
 * @property {string} detail     Ein Satz zum Ergebnis
 * @property {import('../storage/index.js').Item[]} missed  Was nicht auf Anhieb sass
 * @property {object} [spec]     Was eine Challenge braucht, um die Partie zu wiederholen
 *
 * @typedef {Object} Game
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {(deck: object, items: object[], level: string) => boolean} available
 * @property {(context: GameContext) => {stop: () => void}} start
 */

/** @type {Game[]} */
const GAMES = [crossword, sorter, speed];

/** @type {{game: Game, deck: object, items: object[], level: string, seed: number, handle: {stop: () => void}, challenge: object | null, result: GameResult | null} | null} */
let current = null;

/** @type {{onLeave: () => void, onStart: () => void, onChallenge: (round: object) => void} | null} */
let hooks = null;

/**
 * @param {{onLeave: () => void, onStart: () => void, onChallenge: (round: object) => void}} config
 *   `onStart` bei jedem Spielbeginn, `onChallenge` wenn jemand die eben
 *   gespielte Partie verschicken will.
 */
export function init(config) {
    hooks = config;

    document.getElementById('game-home').addEventListener('click', leave);
    document.getElementById('game-result-home').addEventListener('click', leave);

    document.getElementById('game-again').addEventListener('click', () => {
        if (current) play(current.game.id, current.deck, current.items, { level: current.level, units: current.units });
    });

    document.getElementById('game-challenge').addEventListener('click', () => {
        if (current?.result) hooks.onChallenge(current);
    });
}

/** Die Spiele, die mit dieser Auswahl auf diesem Niveau gehen. */
export function availableGames(deck, items, level) {
    return GAMES.filter(game => game.available(deck, items, level));
}

export function getGame(id) {
    return GAMES.find(game => game.id === id) ?? null;
}

function leave() {
    current?.handle.stop();
    current = null;
    hooks?.onLeave();
}

/**
 * Startet eine Partie.
 * @param {string} gameId
 * @param {import('../storage/index.js').Deck} deck
 * @param {import('../storage/index.js').Item[]} items
 * @param {{seed?: number, spec?: object, level?: string, units?: string[], challenge?: object}} [options]
 *   `units`: die Lektionen, aus denen die Wörter stammen (für den
 *   Challenge-Link). Mit `challenge` (Punkte und Zeit der Gegenseite) wird am
 *   Ende verglichen.
 */
export function play(gameId, deck, items, { seed = randomSeed(), spec = null, level = state.level, units = [], challenge = null } = {}) {
    const game = getGame(gameId);
    if (!game) return;

    current?.handle.stop();

    const stage = document.getElementById('game-stage');
    const statusLine = document.getElementById('game-status');
    stage.replaceChildren();
    statusLine.textContent = '';

    document.getElementById('game-title').textContent = game.label;
    document.getElementById('game-subtitle').textContent = challenge
        ? `Herausforderung von ${challenge.alias}`
        : game.description;

    reward.reset();
    hooks?.onStart();
    screens.show('screen-game');

    const round = { game, deck, items, level, seed, units, challenge, result: null, handle: { stop() {} } };
    current = round;

    round.handle = game.start({
        deck, items, level, seed, spec, stage,
        insight: state.insight,
        status: text => { statusLine.textContent = text; },
        log(attempt) {
            if (attempt.correct) reward.better();
            else reward.worse();

            storage.logAttempt({
                deckId: deck.id,
                contentVersion: deck.version ?? 0,
                mode: game.id,
                game: game.id,
                source: challenge ? 'challenge' : 'game',
                level,
                errors: [],
                ...attempt
            }).catch(error => console.warn('Versuch konnte nicht gespeichert werden:', error));
        },
        finish(result) {
            // Ein abgebrochenes Spiel meldet sich nicht mehr.
            if (current !== round) return;
            round.result = result;
            showResult(round);
        }
    });
}

export function formatTime(ms) {
    const seconds = Math.round(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function showResult(round) {
    const { result, deck, challenge } = round;

    document.getElementById('game-result-score').textContent = `${result.score} Punkte`;
    document.getElementById('game-result-detail').textContent = `${result.detail} · Zeit ${formatTime(result.ms)}`;

    const compare = document.getElementById('game-result-compare');
    compare.hidden = !challenge;
    if (challenge) {
        // Mehr Punkte gewinnen; bei Gleichstand die kürzere Zeit.
        const won = result.score > challenge.score || (result.score === challenge.score && result.ms < challenge.ms);
        const tie = result.score === challenge.score && result.ms === challenge.ms;
        compare.replaceChildren();
        const verdict = document.createElement('h2');
        verdict.textContent = tie ? 'Unentschieden!' : won ? 'Gewonnen!' : `${challenge.alias} war besser.`;
        const line = document.createElement('p');
        line.textContent = `${challenge.alias}: ${challenge.score} Punkte in ${formatTime(challenge.ms)} · `
            + `du: ${result.score} Punkte in ${formatTime(result.ms)}`;
        compare.append(verdict, line);
    }

    const list = document.getElementById('game-result-list');
    list.replaceChildren();
    for (const item of result.missed) {
        const row = document.createElement('li');
        const target = document.createElement('strong');
        target.textContent = targetForms(item).join(', ');
        target.lang = deck.targetLang;
        const source = document.createElement('span');
        source.textContent = item.source;
        source.lang = deck.sourceLang;
        row.append(target, source);
        list.append(row);
    }
    document.getElementById('game-result-missed-box').hidden = result.missed.length === 0;
    if (result.missed.length === 0) reward.reveal();

    // Verschicken lässt sich nur, was sich aus Lektionen wieder aufbauen lässt.
    document.getElementById('game-challenge').hidden = round.units.length === 0;

    screens.show('screen-game-result');
}
