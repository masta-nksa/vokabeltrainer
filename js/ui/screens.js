// Screen-Wechsel. Genau ein Bereich ist sichtbar.

/** Bereiche mit Hauptmenü. In einer Runde oder einem Spiel fehlt es. */
const WITH_TABBAR = ['screen-select', 'screen-insight', 'screen-print', 'screen-more'];

/** @param {string} id */
export function show(id) {
    for (const screen of document.querySelectorAll('.screen')) {
        screen.hidden = screen.id !== id;
    }

    const tabbar = document.getElementById('tabbar');
    if (tabbar) {
        tabbar.hidden = !WITH_TABBAR.includes(id);
        document.body.classList.toggle('has-tabbar', !tabbar.hidden);
        for (const tab of tabbar.querySelectorAll('[data-tab]')) {
            if (tab.dataset.tab === id) tab.setAttribute('aria-current', 'page');
            else tab.removeAttribute('aria-current');
        }
    }

    window.scrollTo(0, 0);
}

export function current() {
    const visible = [...document.querySelectorAll('.screen')].find(screen => !screen.hidden);
    return visible?.id ?? null;
}
