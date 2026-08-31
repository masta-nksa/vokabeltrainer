// Alle verfügbaren Lernmodi an einem Ort.
//
// Ein vierter Modus "speaking" kommt hier dazu, sobald die Ausspracheprüfung
// angeschlossen ist.

import * as terms from './terms.js';
import * as spelling from './spelling.js';
import * as writing from './writing.js';

export const modes = { terms, spelling, writing };

export function getMode(id) {
    const mode = modes[id];
    if (!mode) throw new Error(`Unbekannter Modus: ${id}`);
    return mode;
}
