// Punktestand während einer Runde.

/** @param {import('../state.js').Session} session */
export function render(session) {
    const element = document.getElementById('scoreboard');
    if (!element) return;

    const remaining = session.items.length - session.index;
    element.textContent =
        `richtig ${session.correct} · falsch ${session.wrong} · noch ${remaining}`;
    element.hidden = false;
}

export function clear() {
    const element = document.getElementById('scoreboard');
    if (!element) return;
    element.textContent = '';
    element.hidden = true;
}
