// Belohnung: Das Heldenbild ist zu Beginn unscharf und wird mit jeder
// richtigen Antwort klarer. Falsche Antworten machen es wieder unschärfer.

const MAX_BLUR = 40;
const STEP_BETTER = 2;
const STEP_WORSE = 6;

let blur = MAX_BLUR;

function image() {
    return document.getElementById('hero-image');
}

function apply() {
    const element = image();
    if (!element) return;
    element.style.filter = blur > 0 ? `blur(${blur}px)` : 'none';
}

export function reset() {
    blur = MAX_BLUR;
    apply();
}

export function better() {
    blur = Math.max(0, blur - STEP_BETTER);
    apply();
}

export function worse() {
    blur = Math.min(MAX_BLUR, blur + STEP_WORSE);
    apply();
}

/** Bild vollständig freigeben, etwa am Ende einer Runde. */
export function reveal() {
    blur = 0;
    apply();
}

/** Anteil des freigespielten Bildes, 0 bis 1. */
export function progress() {
    return 1 - blur / MAX_BLUR;
}
