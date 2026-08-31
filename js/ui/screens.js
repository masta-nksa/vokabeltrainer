// Screen-Wechsel. Genau ein Bereich ist sichtbar.

/** @param {string} id */
export function show(id) {
    for (const screen of document.querySelectorAll('.screen')) {
        screen.hidden = screen.id !== id;
    }
    window.scrollTo(0, 0);
}

export function current() {
    const visible = [...document.querySelectorAll('.screen')].find(screen => !screen.hidden);
    return visible?.id ?? null;
}
