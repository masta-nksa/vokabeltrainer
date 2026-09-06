// Alle verfügbaren Lernmodi an einem Ort.
//
// Ein Modus "speaking" kommt hier dazu, sobald die Ausspracheprüfung
// angeschlossen ist.

import * as terms from './terms.js';
import * as spelling from './spelling.js';
import * as writing from './writing.js';
import * as exercise from './exercise.js';

// terms/spelling/writing sind die Wortschatz-Modi, die in der Auswahl als
// Knöpfe stehen. "exercise" wird nicht so gewählt, sondern über ein Übungsset
// gestartet (quiz.startExercise) – es taucht darum nicht in dieser Reihenfolge
// auf, ist aber über getMode erreichbar.
export const modes = { terms, spelling, writing, exercise };

export function getMode(id) {
    const mode = modes[id];
    if (!mode) throw new Error(`Unbekannter Modus: ${id}`);
    return mode;
}
