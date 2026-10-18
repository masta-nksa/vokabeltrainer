// Stand während einer Runde: Fortschrittsbalken oben, Zähler unten.

/** @param {import('../state.js').Session} session */
export function render(session) {
    const total = session.items.length;
    const done = Math.min(session.index, total);

    const bar = document.getElementById('quiz-progress');
    if (bar) {
        bar.setAttribute('aria-valuemax', String(total));
        bar.setAttribute('aria-valuenow', String(done));
        document.getElementById('quiz-progress-fill').style.width =
            total > 0 ? `${(done / total) * 100}%` : '0';
        document.getElementById('quiz-count').textContent = `${done}/${total}`;
    }

    const element = document.getElementById('scoreboard');
    if (!element) return;
    element.textContent =
        `${session.correct} richtig · ${session.wrong} falsch · ${total - done} offen`;
    element.hidden = false;
}

export function clear() {
    const element = document.getElementById('scoreboard');
    if (!element) return;
    element.textContent = '';
    element.hidden = true;
}
