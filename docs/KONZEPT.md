# Konzept v2 – Selbstlernmodul Wortschatz & Grammatik

Stand 10. Oktober 2026. Ausgangspunkt war die Durchsicht von *dis donc!*
Unité 2 (Buchseiten 44–73) und die Frage, wie die App wachsen kann: neue
Units, Login, KI-Agent, weitere Sprachen, Minispiele.

## Leitidee

Die App ist ein **Selbstlernmodul für Wortschatz und Grammatik**. Aus jeder
Unit wird nur übernommen, was dem Spracherwerb im engeren Sinn dient. Lesetexte,
Plakat, Steckbrief, Lied und Sprachfamilien bleiben im Buch.

Sie ist ein **freiwilliges Angebot neben dem Unterricht**, nicht ein Werkzeug
für die ganze Klasse. Wer sie nutzt, tut es für sich. Daraus folgt: vorerst
keine Klassenverwaltung, keine Zuweisungen, keine Auswertung einzelner SuS
durch die Lehrperson. Alles muss ohne Anleitung im Unterricht verständlich
sein. Klassen kommen vielleicht später; das Modell hält dafür Platz frei
(Abschnitt 7, «Später: Klassen»).

Vier Dinge machen den Unterschied zu einer Wortliste:

1. **Fehler werden einzeln gespeichert**, nicht nur «richtig/falsch». Daraus
   entsteht ein Schwächenprofil, das bestimmt, was als Nächstes geübt wird.
2. **Grammatik-Übungen werden aus dem Wortschatz erzeugt**, wo es geht. Wer
   bei einem Wort Genus und Zahl kennt, kann daraus Übungen zu Artikel und
   mon/ma/mes erzeugen, ohne jede Aufgabe einzeln zu schreiben.
3. **Minispiele** nutzen denselben Wortschatz und speisen dasselbe
   Fehlerprotokoll. Ein Spiel ist eine andere Oberfläche für dieselbe
   Sprachübung, kein Extra daneben.
4. **Drei Niveaus – Basis, Erweitert, Expert –** gelten für jede Aufgabe und
   jedes Spiel, mit einem einzigen Schalter.

### Was aus Unité 2 übernommen wird

| Übernommen | Inhalt |
|---|---|
| Wortschatz | Vocabulaire Lernziel 1–3, Vocabulaire plus als eigene Lektionen «Lernziel N plus» (Entscheid 18.10.2026, vorher Niveau Erweitert), Randvokabeln wie le chapeau, le pantalon, les chaussures (in «Lernziel 1 plus») |
| Grammatik | Possessivbegleiter *mon/ma/mes* · *être* 3. Person *est/sont* · *s'appeler* *s'appelle/s'appellent* · *c'est / ce sont* · *voici/voilà* · Genus und Artikel *le/la/l'/les* |
| Satzmuster | «X est la sœur de Y», «C'est ma mère. Elle s'appelle …» – als Lücken- und Satzbau-Übungen |

| Nicht übernommen | Warum |
|---|---|
| Chaplin-Text, Fragen dazu | Leseverstehen, Text lizenziert |
| Plakat, Präsentation, Steckbrief | Produktion, offene Aufgaben; Steckbrief fragt Personendaten ab |
| Sprachfamilien, Flaggen, Lied, Spiele im Kreis | kein Wortschatz- oder Grammatik-Training |
| Familie Lionel, Illustrationen | Figuren und Bilder des Lehrmittels sind nicht frei |

Aussprache (ch/j, Virelangue) kommt später über `speech/assess.js`. Die
betroffenen Wörter bekommen schon jetzt einen Tag (`sound:ʃ`, `sound:ʒ`).

## 1. Inhaltsmodell

```
Course (Lehrmittel + Sprache)          fr-disdonc-1, en-doubledecker-3
 └─ Unit                               u2 «La famille»
     ├─ Section (Lernziel | Voci-Test) u2.lz1, u2.lz2, u2.lz3, u2.plus
     │   └─ Item (Wort / Ausdruck)
     └─ GrammarPoint                   fr.possessif, fr.etre-3p, …
         ├─ explanation (eigener Text)
         ├─ drills (handgeschriebene Aufgaben)
         └─ generators (Aufgaben aus Item-Daten)
```

«Section» ersetzt das heutige Doppelleben von «Unit» als Lernziel (Französisch)
bzw. als Voci-Test (Englisch). Die heutige Namenskonvention `3_2-t1` → `3_2`
für die Zuordnung von Übungen entfällt, weil die Hierarchie das ausdrückt.

### Item

```jsonc
{
  "id": "grand-mere",                // stabil, aus dem Lemma, nie wiederverwendet
  "source": "die Grossmutter",
  "target": "la grand-mère",         // wie bisher: was gezeigt/abgefragt wird
  "lemma": "grand-mère",             // ohne Artikel – für Kreuzworträtsel, Pendu
  "pos": "noun",                     // noun | verb | adj | phrase | …
  "gender": "f",                     // m | f – bei l'/les nicht aus dem Artikel ablesbar
  "number": "sg",                    // sg | pl  (les parents: pl)
  "image": "👵",
  "level": "basis",                  // basis | erweitert | expert, siehe Abschnitt 2
  "tags": ["wf:famille"],
  "concept": "grandmother",          // optional, verknüpft Sprachen
  "aliases": ["lernziel-2-007"]      // frühere IDs, damit alter Lernstand passt
}
```

Alle neuen Felder sind optional. Ein Item mit nur `source`/`target` funktioniert
weiter, es nimmt nur an den Spielen und Generatoren nicht teil, die das Feld
brauchen (kein `lemma` → kein Kreuzworträtsel, kein `gender` → kein
Genus-Spiel).

**Stabile IDs.** Heute vergibt die App Übungs-IDs aus der Position
(`<setId>-01`), und beim Neuimport von DoubleDecker Unit 1 wurden die Wort-IDs
ersetzt. Sobald Lernstand pro Person zählt, verliert so jemand seine
Geschichte. Regel ab v2: ID steht im Inhalt, wird aus dem Lemma gebildet, nie
für anderen Inhalt wiederverwendet, frühere IDs wandern in `aliases`.

### GrammarPoint

```jsonc
{
  "id": "fr.possessif",
  "title": "mon, ma, mes",
  "explanation": "Vor einem männlichen Wort steht mon, vor einem weiblichen ma, vor der Mehrzahl mes.",
  "examples": ["mon père", "ma mère", "mes parents"],
  "generators": [
    { "type": "possessive", "from": { "tags": ["wf:famille"] } }
  ],
  "drills": [
    { "id": "poss-01", "type": "gap", "text": "Voici ___ cousine.", "answer": "ma" }
  ]
}
```

**Generatoren** erzeugen Aufgaben aus Item-Feldern. Für Unité 2:

| Generator | braucht | Beispiel |
|---|---|---|
| `article` | `gender`, `number`, `lemma` | ___ grand-mère → *la* |
| `possessive` | `gender`, `number` | ___ cousins → *mes* |
| `form` | Verbtabelle im GrammarPoint | Lionel et Pascal ___ frères → *sont* |
| `order` | Satz als Item (`pos: phrase`) | ma / C'est / mère → *C'est ma mère* |

Damit wächst jede neue Unit mit Wortliste plus Feldern automatisch um
Grammatik-Übungen. Handgeschriebene `drills` bleiben für alles, was sich nicht
erzeugen lässt.

## 2. Niveaus: Basis, Erweitert, Expert

Ein Schalter in der Auswahl, gilt für alle Aufgaben und Spiele und bleibt pro
Person gespeichert. Er ersetzt das heutige einfach/mittel/schwer (alte
Einstellung wird übernommen: `easy` → `basis`, `medium` → `erweitert`,
`hard` → `expert`).

Ein einziger Schalter statt getrennter Regler für «Wortumfang» und
«Schwierigkeit» – für die Unterstufe ist eine Wahl verständlicher als zwei.
Das Niveau wirkt auf zwei Ebenen:

### Welche Wörter

Jedes Item trägt ein `level`. Wo das Lehrmittel eine Einteilung hat, wird sie
übernommen:

| Niveau | Wortumfang | Herkunft bei *dis donc!* |
|---|---|---|
| Basis | Grundwortschatz | «Vocabulaire» |
| Erweitert | + erweiterter Wortschatz | – (seit 18.10.2026 stehen «Vocabulaire plus» und Randvokabeln in eigenen Lektionen, auf jedem Niveau wählbar) |
| Expert | + Wendungen und Sätze, Wiederholung aus früheren Units | Satz-Items (`pos: phrase`), ältere Sections |

Ein Niveau schliesst die darunterliegenden ein. Decks ohne Einteilung
(DoubleDecker, Young World) haben überall `basis` – dort wirkt das Niveau nur
auf die Aufgabenform. Beim Import (`/voci-unit`, `curate.html`) wird `level`
eine eigene Spalte.

### Wie schwer die Aufgabe ist

| Aufgabe | Basis | Erweitert | Expert |
|---|---|---|---|
| *terms* | 4 Optionen, unähnliche Ablenker | 6 Optionen, ähnliche Ablenker | 8 Optionen, Verwechslungspaare bevorzugt |
| *spelling* | 4 Optionen, offensichtliche Fehler | 6 Optionen, alle Fehlerarten | 8 Optionen, kombinierte Fehler |
| *writing* | Artikel vorgegeben (*la ___*), fehlende Akzente toleriert mit Hinweis | Artikel selbst schreiben, Akzente zählen | wie Erweitert, ohne Hinweis nach dem ersten Fehler |
| Grammatik-Drills | Auswahl per Knopf (*mon / ma / mes*) | Lücke tippen | Form umbilden oder ganzen Ausdruck schreiben (*ma tante* → *mes tantes*) |
| Kreuzworträtsel | 6–8 Wörter, erster Buchstabe steht, Akzente tolerant, Emoji-Hinweis | 10 Wörter, keine Buchstaben vorgegeben, Akzente zählen | 12–14 Wörter, nur deutscher Hinweis, Zeit zählt |
| Genus-Sortierer | *le / la* | + *l'* und *les* (Genus muss man wissen) | *mon / ma / mes*, höheres Tempo |
| Speed-Runde | 90 s, Auswahl | 60 s, Auswahl | 45 s, tippen |
| Pendu | 8 Fehlversuche | 6 | 4, Akzente zählen |
| Satzbau | 3–4 Kärtchen | + Satzzeichen | + ein überzähliges Kärtchen |
| Memory | 6 Paare mit Emoji | 8 Paare | 10 Paare, nur Wörter |

Die Werte sind Startwerte und stehen in einer Tabelle im Code (wie heute
`DIFFICULTY` in `spelling.js` und `optionCount()` in `util.js`), damit sie
sich nach den ersten Erfahrungen leicht anpassen lassen.

### Niveau im Lernstand

- Jedes Event speichert das Niveau, auf dem geübt wurde.
- Ein Wort steigt im Leitner-Fach nur auf, wenn es mindestens auf *Erweitert*
  richtig war; auf *Basis* gilt es als «erkannt», nicht als «sicher».
- Hat jemand auf einem Niveau über mehrere Runden fast alles auf Anhieb
  richtig, **schlägt** die App das nächste Niveau vor. Sie wechselt nie von
  selbst.
- Challenges werden immer auf einem festen Niveau gespielt und nur mit
  Partien desselben Niveaus verglichen.

## 3. Fehlerspeicher und Schwächenprofil

Das ist der Kern von v2. Heute speichert `logAttempt` pro Wort nur `correct`
und `tries` – **was** falsch eingegeben wurde, geht verloren.

### Event (erweitert das heutige Attempt)

```jsonc
{
  "id": "…", "userId": "local", "ts": 1791450000000,
  "deckId": "fr-disdonc-1", "contentVersion": 5,
  "itemId": "grand-mere",            // oder Drill-/Generator-ID
  "grammarId": "fr.possessif",       // falls Grammatik-Aufgabe
  "skill": "produce",                // recognize | spell | produce | apply
  "source": "quiz",                  // quiz | drill | game | challenge | battle
  "level": "erweitert",              // Niveau, auf dem geübt wurde
  "game": null,                      // z. B. "crossword"
  "correct": false,                  // auf Anhieb gewusst
  "tries": 1,
  "errors": [
    { "given": "la grand-mere", "type": "accent" }
  ],
  "durationMs": 6400
}
```

Ein Datensatz pro Aufgabe wie bisher; `errors` hält jeden Fehlversuch mit der
tatsächlichen Eingabe und seiner Klasse. Bestehende Datensätze bleiben gültig,
es kommen nur Felder dazu.

### Fehlerklassen

Regelbasiert, abhängig vom Sprachprofil. Für Französisch:

| Klasse | erkannt an | Beispiel |
|---|---|---|
| `accent` | gleich nach `stripDiacritics` | *grand-mere* statt *grand-mère* |
| `gender` | nur Artikel/Begleiter im Genus vertauscht | *le tante*, *mon mère* |
| `number` | nur Zahl falsch | *ma parents*, *il sont* |
| `elision` | *le acteur* statt *l'acteur* | |
| `letters` | Editierdistanz 1–2 (Auslassung, Verdopplung, Dreher) | *frére*, *cousinne* |
| `confusion` | Eingabe = anderes Wort der Lektion | *oncle* statt *tante* → Paar wird gemerkt |
| `unknown` | alles andere | |

Im Modus *spelling* ist die Klasse sogar exakt bekannt, weil jede falsche
Option mit einer bekannten Operation (`misspellings` in `util.js`) erzeugt
wurde – die Option trägt ihre Operation einfach mit. Im Modus *terms* ist jeder
Fehlklick eine `confusion` mit genau benanntem Partnerwort.

### Lernstand (berechnet, nicht gepflegt)

Aus den Events wird pro Item und Fertigkeit ein Stand abgeleitet:

- **Fach 0–5** nach Leitner (das Lehrmittel erklärt die Lernkartei selbst,
  S. 56) mit Fälligkeitsdatum.
- **Stufenfolge** pro Wort: erkennen (*terms*) → richtig schreiben
  (*spelling*) → selbst schreiben (*writing*). Ein Wort gilt als sicher, wenn es
  an zwei verschiedenen Tagen frei geschrieben richtig war.
- **Schwächenprofil** quer über alle Wörter: häufigste Fehlerklassen
  («Akzente», «Genus le/la»), Verwechslungspaare (*oncle/tante*), schwache
  Grammatikpunkte.

Der Stand ist eine Projektion: jederzeit aus den Events neu berechenbar. Das
macht spätere Sync- und Regeländerungen ungefährlich.

### Wie die App die Schwächen nutzt

1. **Gemischte Runde «Für dich»**: etwa 60 % fällige und schwache Wörter, 30 %
   neue, 10 % sichere zur Bestätigung.
2. **Gezielte Hilfe**: Bei gehäuften `gender`-Fehlern erscheinen Genus-Farben
   und der Hinweis zum GrammarPoint; bei `accent` bevorzugt der Modus
   *spelling* Akzent-Varianten.
3. **Verwechslungspaare** werden absichtlich zusammen als Ablenker gezeigt,
   bis die Unterscheidung sitzt.
4. **Ansicht «Meine Stolpersteine»** für die SuS selbst: die fünf häufigsten
   Fehlerarten mit Beispiel und Knopf «gezielt üben».

## 4. Minispiele

Jedes Spiel ist ein Modul wie die Modi in `js/modes/`: es bekommt eine
Wortmenge und einen Zufallsgenerator, baut daraus eine Partie, prüft Eingaben
mit derselben Prüfung wie das Quiz und schreibt Events (`source: "game"`).
Spiele nutzen also das Fehlerprofil und füttern es.

| Spiel | Sprachlicher Kern | braucht |
|---|---|---|
| **Kreuzworträtsel** | Hinweis deutsch (+ Emoji), französisches Wort mit sichtbarer Buchstabenzahl ins Gitter schreiben | `lemma` |
| **Genus-Sortierer** | Wörter fallen herunter, nach *le* / *la* (oder *mon/ma/mes*) wischen | `gender`, `number` |
| **Speed-Runde** | 60 Sekunden, so viele Übersetzungen wie möglich (*terms*) | – |
| **Pendu** | Galgenmännchen mit deutschem Hinweis | `lemma` |
| **Satzbau** | Wortkärtchen in die richtige Reihenfolge | Satz-Items |
| **Memory** | Paare deutsch–französisch aufdecken | – |

**Reihenfolge:** Kreuzworträtsel zuerst (ausdrücklich gewünscht), dann
Genus-Sortierer (die einzige Grammatik als Spiel), dann Speed-Runde.

### Kreuzworträtsel im Detail

- Wortzahl je nach Niveau (Abschnitt 2), aus der gewählten Section, bevorzugt schwache (im Übungsmodus;
  in einer Challenge entscheidet der Seed, siehe unten).
- Nur Items mit einem Lemma ohne Leerzeichen. Bindestriche (*grand-mère*) sind
  vorgegebene Felder.
- Hinweis: deutsches Wort, Emoji falls vorhanden, Genus als (m)/(f).
- Akzente: Ein Buchstabe ohne Akzent ist auf *Basis* richtig, auf *Erweitert*
  und *Expert* nicht. Eine Akzentleiste (é è ê à ç ô …) über der Tastatur
  liefert das Sprachprofil.
- Jedes fertig eingetragene Wort wird als Event geloggt, Fehlversuche mit
  Eingabe und Klasse.
- Aufbau des Gitters: gieriges Platzieren mit Kreuzungen, dichtestes von ein
  paar Versuchen gewinnt. Mit festem Seed kommt immer dasselbe Gitter heraus.

## 5. Challenges, Freunde und Battles

Eine Challenge ist **dieselbe Partie für zwei oder mehr Personen**. Das geht
ohne Server, wenn eine Partie vollständig durch ihre Parameter bestimmt ist:

```jsonc
// im URL-Fragment: …/#c=<base64url>
{ "v": 1, "game": "crossword", "deck": "fr-disdonc-1", "ver": 5,
  "sections": ["u2.lz2"], "level": "erweitert", "seed": 48213,
  "score": 920, "ms": 74000, "alias": "Renard 7" }
```

**Stufe A – sofort möglich, ohne Server.**
Partie spielen → «Herausfordern» → Link oder QR-Code an Freundinnen und
Freunde schicken (Chat, Teams). Wer den Link öffnet, spielt dasselbe Gitter und sieht danach
den Vergleich. Die Daten stehen im `#`-Fragment, das nie an einen Server
geht. Statt Namen gibt es zufällige Spitznamen (*Renard 7*). Ein Link lässt
sich fälschen – für ein Spiel unter Freunden ist das in Ordnung.

Technisch braucht das nur einen Zufallsgenerator mit Seed (z. B. mulberry32)
statt `Math.random()` bei der Partie-Erzeugung und eine Warnung, wenn die
Deck-Version im Link nicht mehr zum Stand passt.

**Stufe B – mit Login: Freunde, Eingang, Live-Battle.**

Alles Folgende braucht ein Konto (Abschnitt 7) und eine Verbindung. Üben
bleibt offline möglich; nur Freunde und Battles sind online-Funktionen.

#### Freunde per Code

- Jedes Konto hat einen **Freundescode** (`FUCHS-4821`), zu finden unter
  «Freunde». Code der Freundin eintippen oder ihren QR scannen → Anfrage →
  sie bestätigt → befreundet.
- **Keine Suche nach Namen**, keine Vorschläge, keine öffentlichen Profile.
  Wer befreundet ist, hat den Code persönlich bekommen. So kommen keine
  Fremden dazu.
- Freunde sehen voneinander nur: Spitzname, Online-Status, Ergebnisse
  gemeinsamer Challenges. **Nie** den Lernstand oder die Fehler.
- Freund entfernen und blockieren jederzeit, ohne dass die andere Person
  benachrichtigt wird. Freundescode lässt sich neu erzeugen, der alte gilt
  dann nicht mehr.

#### Wer ist gerade online

Die Freundesliste zeigt pro Person einen von drei Zuständen:

| Zustand | Anzeige | Bedeutung |
|---|---|---|
| offline | grau | App nicht offen |
| am Lernen | grün | App offen |
| bereit zum Battle | grün mit ⚔️ | hat «Battle-bereit» eingeschaltet |

- Der Zustand verschwindet von selbst: Die App meldet sich regelmässig, und
  wer 90 Sekunden nichts meldet, gilt als offline. Im Prototyp kann die
  Anzeige also bis zu anderthalb Minuten nachhinken (Abschnitt 7).
- Schalter **«unsichtbar»**: man erscheint offline und bekommt keine
  Live-Einladungen, nur Challenges im Eingang.
- Was jemand gerade übt, wird nicht angezeigt – nur *dass* er online ist.

#### Eingang «Herausforderungen»

Ein Glocken-Symbol mit Zähler in der Kopfzeile. Darin:

- **Neue Challenges**: Freundin hat ein Kreuzworträtsel gespielt und
  fordert dich heraus → «Annehmen» startet dieselbe Partie (gleicher Seed,
  gleiches Niveau).
- **Ergebnisse**: Wer hat gewonnen, mit Zeit und Fehlerzahl, «Revanche».
- **Verpasste Battle-Einladungen** werden zu normalen Challenges: man spielt
  später und vergleicht dann.
- Offene Challenges verfallen nach 7 Tagen, damit der Eingang nicht vollläuft.

Die Challenge-Links aus Stufe A gehen weiter – wer ein Konto hat und einen
Link öffnet, sieht die Challenge danach auch im Eingang.

#### Live-Battle

Wenn zwei Freunde gleichzeitig online sind:

1. In der Freundesliste bei einer grünen Person **«Battle»** → Spiel, Unit
   und Niveau wählen (Vorschlag: was man zuletzt geübt hat).
2. Die Freundin bekommt die Einladung sofort als Hinweis in der App, 60
   Sekunden Zeit zum Annehmen. Lehnt sie ab oder reagiert nicht, wird daraus
   eine Challenge im Eingang.
3. Beide sehen einen Countdown 3-2-1 und spielen **dieselbe Partie
   gleichzeitig**: gleiche Fragen in gleicher Reihenfolge (gemeinsamer Seed).
4. Während des Spiels sieht man den **Fortschritt der anderen Person live** –
   ein Balken mit gelösten Aufgaben und Punkten, nicht ihre Antworten.
5. Ende: Ergebnis beider, die Wörter, die einer von beiden falsch hatte,
   zum Nachlernen, Knopf «Revanche».

Geeignete Spiele für Live-Battles – kurze, gleichzeitige Partien:

| Battle | Ablauf | Sieg |
|---|---|---|
| **Wort-Duell** | 10 Fragen *terms* oder *writing*, gleiche Reihenfolge | mehr richtig; bei Gleichstand schneller |
| **Kreuzwort-Rennen** | dasselbe Gitter | zuerst fertig, Fehler geben Zeitstrafe |
| **Genus-Duell** | dieselben Wörter fallen bei beiden | mehr richtig sortiert |

Battle-Antworten werden wie jede Übung als Events gespeichert
(`source: "battle"`) und fliessen ins eigene Fehlerprofil – Battles sind also
auch Lernen.

#### Schutz

- **Kein Chat, keine freien Texte** zwischen SuS. Nur feste Reaktionen nach
  einem Battle (👍, 😮, «Revanche?»). Freitext würde Moderation verlangen und
  öffnet die Tür für Mobbing.
- Einladungen begrenzt: höchstens eine offene Live-Einladung pro Person, ein
  paar Challenges pro Freund und Tag – kein Zuspammen.
- Blockierte Personen können weder einladen noch den Online-Status sehen.

#### Challenge der Woche

Ein Rätsel pro Unit und Niveau für alle, die die App nutzen; Bestenliste mit
Spitznamen (Geltungsbereich `global`, siehe Klassen-Vorkehrungen).

**Pädagogische Leitplanken**
- Standard ist «gegen die eigene Bestzeit». In Bestenlisten erscheint nur,
  wer das selbst einschaltet.
- Gezeigt werden die ersten Plätze und der eigene Platz, nie eine
  vollständige Rangliste mit letztem Platz.
- Punkte zählen Genauigkeit vor Tempo: ein Fehler kostet mehr, als
  Schnelligkeit einbringt. So lohnt sich Raten nicht.

## 6. Weitere Sprachen: Sprachprofil

Was sprachabhängig ist, steht in `data/languages/<code>.json`, nicht im Code:

```jsonc
{
  "code": "fr", "name": "Französisch",
  "tts": "fr-FR", "assess": "fr-FR",
  "specialChars": ["é","è","ê","ë","à","â","ç","î","ï","ô","û","ù","œ"],
  "normalize": { "apostrophes": true, "ligatures": { "oe": "œ" } },
  "features": { "gender": ["m","f"], "articles": { "m": "le", "f": "la", "pl": "les", "elided": "l'" },
                "possessive": { "m": "mon", "f": "ma", "pl": "mes" } }
}
```

- Spiele und Generatoren fragen `features` ab: Englisch hat kein Genus, also
  erscheint dort kein Genus-Sortierer – ohne Sonderfall im Code.
- Die Fehlerklassen `gender`, `number`, `elision` werden aus `features`
  abgeleitet.
- **Apostroph-Fehler heute:** `normalize()` in `util.js` setzt `'` und `’`
  nicht gleich. iPads und Macs tippen standardmässig `’`, also wird *c’est*
  im Modus *writing* abgelehnt. Betrifft schon Unité 1 und erst recht Unité 2
  (*l'acteur, s'appelle, c'est*). Das sollte vor dem Import von Unité 2
  behoben werden – unabhängig vom übrigen Konzept.

Oberflächensprache (Deutsch) bleibt getrennt von Ausgangs- und Zielsprache.

## 7. Login, Sync, KI

Stand 10. Oktober 2026: Der nächste Ausbau ist ein **Prototyp ohne laufende
Kosten**. Was dafür nicht gratis geht, bleibt vorerst weg.

### Login mit Zugangskarte (unabhängig von der Schul-IT)

Kein Microsoft-Login: Dafür müsste die Schul-IT die App im Schulkonto
freigeben. Stattdessen ein eigener, einfacher Login nach dem Vorbild von
*Anton* – Spitzname plus Zugangskarte mit Code.

**Ablauf für SuS**

1. **Ohne Konto loslegen.** Wie heute: alles läuft lokal, nichts wird
   verlangt. Wer nur auf einem Gerät übt, braucht nie ein Konto.
2. **«Fortschritt sichern».** Spitzname wählen (kein voller Name). Die App
   legt das Konto an und zeigt die **Zugangskarte**: einen Code aus 16 Zeichen
   in vier Gruppen (`KATZ-7Q4M-X2PL-9RTW`), dazu derselbe Code als QR-Code und
   als Link. Karte drucken, als Bild speichern oder abfotografieren. Der
   bisherige Lernstand wandert ins Konto.
3. **Auf einem anderen Gerät** den QR-Code mit der normalen Kamera scannen –
   er enthält einen Link (`…/#login=<code>`), der direkt angemeldet öffnet.
   Oder den Code eintippen. Das Gerät bleibt danach angemeldet.

**Wiederherstellung ohne Lehrperson.** Weil niemand eine Klassenliste führt,
muss jede Person selbst wieder hineinkommen können:

- Die Karte lässt sich auf jedem angemeldeten Gerät jederzeit wieder anzeigen
  («Meine Zugangskarte»). Solange ein Gerät angemeldet ist, ist nichts
  verloren.
- **«Neue Karte ausstellen»** macht die alte ungültig und meldet alle anderen
  Geräte ab – das ist zugleich das Mittel gegen eine abfotografierte Karte.
- Beim Sichern bietet die App die Karte als Bild zum Speichern und als
  Druckvorlage an (A8 wie die Karteikarten, `js/ui/print.js`).
- Ohne Karte und ohne angemeldetes Gerät ist das Konto verloren. Das sagt die
  App beim Sichern klar. Der Lernstand auf dem Gerät selbst bleibt.

Eine Wiederherstellung per E-Mail gibt es im Prototyp nicht (siehe «Was der
Prototyp weglässt»).

**Sicherheit**

- Der Code ist Kennung und Passwort in einem: 6 Zeichen benennen das Konto,
  10 sind das Geheimnis (rund 50 Bit). Firebase speichert davon nur einen
  Hash und bremst Durchprobieren von selbst. Für Lernstände und Spielstände
  reicht das; mehr steht im Konto nicht.
- Im Link steht der Code im `#`-Teil. Der geht nie an einen Server und in
  kein Server-Log; die App entfernt ihn nach dem Anmelden sofort aus der
  Adresszeile.
- Auf einem angemeldeten Gerät liegt der Code im Browserspeicher, damit die
  Karte wieder angezeigt werden kann. Wer das Gerät hat, hat also auch die
  Karte – wie bei jeder App, die angemeldet bleibt.
- Restrisiko: Wer eine Karte abfotografiert, kann sich anmelden – wie bei
  Anton. Vertretbar, weil im Konto nur Spitzname und Lernstand stehen.

### Prototyp ohne laufende Kosten

Ziel: Konto, Abgleich zwischen Geräten, Freunde, Herausforderungen und
Live-Battle – ohne Kreditkarte und ohne eigenes Serverprogramm.

**Die Bausteine**

| Aufgabe | Dienst | Kosten |
|---|---|---|
| Anmelden | Firebase Authentication, Gratis-Tarif «Spark» | 0 |
| Lernstand, Freunde, Battles | Cloud Firestore in Zürich (`europe-west6`), Spark | 0 |
| Die Seite selbst ausliefern | GitHub Pages wie bisher – oder Cloudflare Pages, sobald das Repo privat sein soll | 0 |

Ein Serverprogramm (bei Firebase «Cloud Functions») gibt es im Gratis-Tarif
nicht. Was es sonst täte, übernehmen hier die **Sicherheitsregeln** der
Datenbank: Sie legen fest, wer welchen Datensatz lesen und schreiben darf,
und laufen bei Google, nicht im Browser.

**Grenzen des Gratis-Tarifs** (Stand Oktober 2026, laut Preisseite; können
sich ändern)

| Was | Grenze | Was das für uns heisst |
|---|---|---|
| Aktive Konten pro Monat | 50'000 | kein Thema |
| Datenbank: Schreibvorgänge | 20'000 pro Tag | Antworten **gebündelt** speichern, nicht einzeln |
| Datenbank: Lesevorgänge | 50'000 pro Tag | der Online-Status ist der grösste Verbraucher |
| Datenbank: Speicher | 1 GiB | reicht für Jahre |
| Neue Konten | 100 pro Stunde und Internetanschluss | nur relevant, wenn sehr viele gleichzeitig vom Schulnetz aus ein Konto anlegen |
| Anmelde-Mails (Link) | 5 pro Tag | unbrauchbar – darum keine E-Mail-Anmeldung |
| Passwort-zurücksetzen-Mails | 150 pro Tag | Weg für eine spätere E-Mail-Wiederherstellung |

Wird eine Grenze erreicht, **kostet das nichts**: Die Datenbank nimmt bis zum
nächsten Tag nichts mehr an. Weil die App alles zuerst lokal speichert, übt
man weiter, und der Abgleich holt später auf. Nur Freunde und Battles
pausieren.

**Wie es mit den Grenzen zusammenpasst**

- **Konto erst beim Sichern.** Wer nur lokal übt, erzeugt weder ein Konto
  noch einen Datenbankzugriff.
- **Eine Runde, ein Schreibvorgang.** Die Antworten einer Runde gehen als ein
  Bündel in die Datenbank (rund 15 Antworten). 50 Lernende mit 20 Runden am
  Tag sind 1'000 Schreibvorgänge.
- **Online-Status als Lebenszeichen.** Die App meldet alle 60 Sekunden «bin
  da», solange sie offen ist und jemand Freunde hat. Wer 90 Sekunden nichts
  meldet, gilt als offline. Das ist etwas träger als eine echte
  Live-Verbindung, kostet aber nichts und bleibt in derselben Datenbank in
  Zürich. 30 Lernende, je eine Stunde online: 1'800 Schreibvorgänge.
- **Live-Battle** schreibt pro Antwort einmal: ein Wort-Duell mit 10 Fragen
  sind 20 Schreibvorgänge. Die Anzeige beim Gegenüber folgt in Bruchteilen
  einer Sekunde.
- **Challenge der Woche ohne Server.** Der Startwert ergibt sich aus
  Kalenderwoche, Unit und Niveau – alle rechnen dasselbe Rätsel aus.

Reicht der Online-Status so nicht (zu träge, zu viele Lesevorgänge), ist die
*Realtime Database* von Firebase der nächste Schritt: ebenfalls gratis, mit
echtem «Verbindung weg = offline», aber höchstens 100 gleichzeitige
Verbindungen und Standort Belgien statt Zürich.

**Technik**

- Anmelden über Firebase mit Kennung und Passwort, erzeugt im Browser: Aus
  den ersten 6 Zeichen des Codes wird eine technische Adresse
  (`<kennung>@karte.invalid`), die restlichen 10 sind das Passwort. An diese
  Adresse geht nie eine Mail. Als Erstes im Prototyp prüfen, ob Firebase die
  Endung `.invalid` annimmt; sonst `<kennung>@<projekt>.firebaseapp.com`.
- «Neue Karte» setzt ein neues Passwort; Firebase meldet damit alle anderen
  Geräte ab.
- Die Firebase-Bibliothek wird als Modul direkt von Google geladen – die App
  bleibt ohne Build-Schritt.
- Die Zugangsdaten des Firebase-Projekts stehen im Code und sind **kein
  Geheimnis**; sie sagen nur, welches Projekt gemeint ist. Schutz bieten
  allein die Sicherheitsregeln. Die gehören deshalb ins Repo und werden
  getestet.
- Der QR-Code auf der Karte braucht eine kleine Bibliothek (eine Datei,
  freie Lizenz). Ohne sie funktioniert die Karte mit Code und Link.
- Firebase-Konten selbst liegen nicht in der Schweiz; dort stehen darum nur
  die technische Adresse und der Passwort-Hash. Spitzname, Lernstand und
  Freunde liegen in Firestore in Zürich. Der Standort der Datenbank wird beim
  Anlegen gewählt und lässt sich danach nicht mehr ändern.

**Datenablage (Firestore, Zürich)**

```
users/{uid}                    Spitzname, Freundescode, roles, Einstellungen
users/{uid}/batches/{id}       Antworten einer Runde als Bündel (Abgleich)
users/{uid}/friends/{uid2}     befreundet | blockiert, Spitzname
users/{uid}/requests/{uid2}    offene Freundschaftsanfrage
users/{uid}/inbox/{id}         Herausforderungen und Battle-Einladungen
friendCodes/{code}             Freundescode → Konto
presence/{uid}                 lernt | battle-bereit, letztes Lebenszeichen
battles/{id}                   Spieler, Startwert, Fortschritt je Spieler
weekly/{woche}/scores/{uid}    Challenge der Woche
```

Die Regeln sorgen dafür, dass jede Person nur ihre eigenen Daten schreibt,
den Status nur von Freunden liest, nur an Freunde Herausforderungen schickt
und nur in eigene Battles schreibt. Punkte meldet der Browser selbst – wer
will, kann sie fälschen. Für Spiele unter Freunden ist das in Ordnung.

**Was der Prototyp weglässt**

| Funktion | Warum nicht jetzt | Weg dorthin |
|---|---|---|
| Wiederherstellung per E-Mail | Anmelde-Mails sind auf 5 pro Tag begrenzt | über Passwort-zurücksetzen-Mails (150 pro Tag), wenn sich zeigt, dass Karten verloren gehen |
| «Meine Geräte» mit Einzel-Abmeldung | Firebase zeigt dem Browser keine Geräteliste | «Neue Karte» meldet alle anderen ab – das genügt |
| Anonyme Gesamtstatistik für die Lehrperson | bräuchte ein Serverprogramm, das zusammenzählt | jede Runde zählt in einen gemeinsamen Zähler hoch; nach dem Prototyp |
| Ausspracheprüfung, KI-Agent | brauchen ein Serverprogramm für die Schlüssel, und die Dienste selbst kosten pro Aufruf | Cloudflare Worker als Vermittler (gratis); die Aufrufe bleiben kostenpflichtig |
| Ehrlicher Online-Status in Echtzeit | Lebenszeichen alle 60 Sekunden genügt vorerst | Realtime Database |

**Was du dafür tun musst** (einmalig, rund 15 Minuten, ohne Kreditkarte)

1. Mit einem Google-Konto ein Firebase-Projekt anlegen.
2. Firestore einschalten und als Standort **europe-west6 (Zürich)** wählen.
3. Unter Authentication die Anmeldung «E-Mail/Passwort» einschalten.
4. Die Adresse der App als erlaubte Domain eintragen.
5. Mir die Web-Konfiguration des Projekts geben (kein Geheimnis).

### Weitere Vorbereitung

- **Lernstand übernehmen:** `userId` steht schon in jedem Event. Beim Sichern
  wird `local` auf die echte Kennung umgeschrieben; der Stand vor dem Login
  bleibt.
- **Sync:** Events werden nur angehängt und tragen eine UUID. Sync heisst:
  noch nicht hochgeladene Antworten als Bündel schicken, auf einem neuen
  Gerät alle Bündel holen. Keine Konflikte, offline geht weiter. Der
  Lernstand wird auf jedem Gerät aus den Events berechnet.
- **Lehrperson:** keine Sicht auf einzelne SuS. Möglich und nützlich ist eine
  **anonyme Gesamtstatistik** über alle Nutzenden: welche Wörter und
  Fehlerklassen am meisten Mühe machen – als Rückmeldung für den Unterricht.
  Nicht im Prototyp.
- **Testtermine** bleiben wie heute im Inhalt (Titel bzw. Feld der Section),
  da es keine Klassen gibt, an die man sie hängen könnte.
- **KI-Agent:** liest das Schwächenprofil und arbeitet mit denselben
  Bausteinen. Naheliegend: «Erklär mir, warum hier *ma* und nicht *mon*» auf
  Basis des GrammarPoint; zusätzliche Drills zu den eigenen Fehlerklassen
  (mit `origin: "ai"`, von der Lehrperson geprüft, bevor sie allen angeboten
  werden). Anfragen nur über einen eigenen Proxy, keine Personendaten ans
  Modell. Nicht im Prototyp: Der Vermittler liesse sich gratis betreiben,
  die KI-Aufrufe selbst kosten pro Nutzung.

### Später: Klassen (vorgesehen, nicht umgesetzt)

Falls die App eines Tages doch mit einer ganzen Klasse genutzt wird, kommt
eine Klassenebene **dazu** – das Einzelkonto bleibt, wie es ist.

**Was dann möglich wird**

- Lehrperson legt eine Klasse an und bekommt einen **Klassencode**; SuS treten
  mit dem Code bei (oder verlassen die Klasse wieder).
- Alternativ trägt die Lehrperson Spitznamen ein und **druckt alle
  Zugangskarten auf einmal** (A8 wie die Karteikarten).
- Verlorene Karte: Lehrperson stellt in der Klassenliste eine neue aus –
  Wiederherstellung ohne E-Mail.
- **Zuweisung** von Sections mit Testtermin an die Klasse.
- **Klassenansicht**: Schwächenprofil der Klasse (Fehlerklassen, schwierige
  Wörter); Einzelansicht nur mit Spitznamen.
- **Klassen-Challenge** und Bestenliste der Klasse, von der Lehrperson
  eingeschaltet.

**Was das Modell schon jetzt dafür freihält**

| Vorkehrung | warum |
|---|---|
| Events tragen nur `userId`, keine Klassen-ID | Die Mitgliedschaft ist eine eigene Beziehung (`membership: userId × classId × seit/bis`). Tritt jemand später einer Klasse bei, zählt der bisherige Lernstand automatisch dazu; ein Klassenwechsel verfälscht nichts. |
| Konto mit Feld `roles` (vorerst nur `learner`) | `teacher` kommt dazu, ohne das Konto umzubauen. |
| Testtermin als Feld der Section, nicht nur im Titel | Eine spätere Zuweisung überschreibt ihn pro Klasse; ohne Klasse gilt der Wert aus dem Inhalt. |
| Bestenlisten mit `scope` (`friends`, `global`) | `class` ist ein weiterer Wert, keine neue Funktion. |
| Kartendruck baut auf `js/ui/print.js` | Einzelkarte jetzt, Klassensatz später mit demselben Layout. |
| Zugangskarte unabhängig von der Klasse | Eine Karte bleibt gültig, auch wenn jemand die Klasse verlässt. |

Nichts davon wird jetzt gebaut. Es geht nur darum, keine Entscheidung zu
treffen, die das später verbaut.

## 8. Umsetzung in Schritten

Jeder Schritt ist für sich nutzbar und veröffentlichbar. Die Schritte 2–8
entstanden auf dem Branch `v2` und sind seit dem 18.10.2026 auf `main` und
damit live.

1. ~~**Apostroph-Normalisierung** in `normalize()`~~ – erledigt, auf `main`
   (81462d3).
2. ~~**Niveau-Schalter Basis / Erweitert / Expert**~~ – erledigt.
   Alte Einstellung wird übernommen; Startwerte als `LEVELS` je Modus.
3. ~~**Fehlerspeicher**~~ – erledigt: `errors[]`, `skill`, `source`,
   `level`, `durationMs`, `contentVersion` im Event; Klassifizierer
   `js/learning/errors.js`; *spelling*-Optionen tragen ihre Operation mit;
   IndexedDB Version 3 mit Index `byUserItem`. Selbsttest
   `node tools/test-learning.mjs`.
4. ~~**Inhaltsmodell v2**~~ – erledigt. Umgesetzt schonender als oben
   skizziert: `units` bleibt die flache Liste der Lektionen (= Section), jede
   nennt mit `group` ihre Unit; so laufen selbst importierte und ältere Decks
   unverändert weiter. Lemma, Genus und Zahl leitet die App aus dem Artikel
   ab, im Deck steht nur die Ausnahme. Sprachprofil als Modul
   `js/learning/languages.js` statt als JSON-Datei. `fr-unite-1` ist im Kurs
   `fr-disdonc` aufgegangen (Aliase für den Lernstand).
5. ~~**Unité 2 importieren**~~ – erledigt: 60 Einträge in sechs Lektionen
   (36 «Lernziel N», 24 «Lernziel N plus»), Übungen *le/la/l'/les*, *mon/ma/mes*, *est/sont*,
   *s'appelle/s'appellent*, *c'est/ce sont* und «Wer ist wer?» mit Generatoren
   `article`, `possessive`, `kinship`. Die GrammarPoints leben als Übungssets
   mit `grammarId` in `data/exercises/fr-disdonc.json`.
   Am 18.10.2026 gegen die Wortlisten im Buch geprüft (S. 72 «Vocabulaire»,
   S. 73 «Vocabulaire plus»): vollständig, dazu die vier Randvokabeln von S. 44.
6. ~~**Lernstand und «Für dich»-Runde**, Ansicht «Meine Stolpersteine»~~ –
   erledigt, dazu Hinweise nach Fehlerart, Verwechslungspaare als
   Ablenker und der Niveau-Vorschlag nach drei fast fehlerfreien Runden.
7. ~~**Kreuzworträtsel**, **Genus-Sortierer**, **Speed-Runde**~~ – erledigt.
   Im Kreuzworträtsel werden im Übungsmodus unsichere Wörter
   bevorzugt; das Gitter selbst hängt nur am Startwert und an der Wortliste.
8. ~~**Challenge-Links** (Stufe A)~~ – erledigt: Link mit Kopieren
   und Teilen, eingehende Herausforderung mit Vergleich. Noch ohne QR-Code –
   dafür bräuchte es eine QR-Bibliothek im Repo.
9. **Prototyp, Teil 1:** Konto mit Zugangskarte und Abgleich zwischen
   Geräten – Firebase im Gratis-Tarif, ohne Serverprogramm (Abschnitt 7).
   Voraussetzung: das Firebase-Projekt.
10. **Prototyp, Teil 2: Freunde per Code**, Online-Status als Lebenszeichen,
    Eingang «Herausforderungen».
11. **Prototyp, Teil 3: Live-Battle** (Wort-Duell zuerst, dann
    Kreuzwort-Rennen und Genus-Duell), Challenge der Woche.
12. *Nach dem Prototyp, soweit gewünscht:* Wiederherstellung per E-Mail,
    anonyme Gesamtstatistik, Ausspracheprüfung und KI-Agent (die beiden
    letzten kosten pro Aufruf).
13. *Vielleicht später:* Klassen mit Klassencode, Kartendruck, Zuweisung,
    Klassenansicht.
