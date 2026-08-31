// IndexedDB-Zugriff. Kennt nur Datensätze, keine Anwendungslogik.

const DB_NAME = 'vokabeltrainer';
const DB_VERSION = 1;

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null;

/**
 * Öffnet die Datenbank und legt beim ersten Start die Stores an.
 * @returns {Promise<IDBDatabase>}
 */
export function openDb() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains('decks')) {
                db.createObjectStore('decks', { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains('attempts')) {
                // Jede einzelne Antwort wird hier protokolliert. Das ist die
                // Grundlage für Lernfortschritt, Fehlerwort-Wiederholung und
                // Spaced Repetition – deshalb wird von Anfang an mitgeschrieben.
                const attempts = db.createObjectStore('attempts', { keyPath: 'id' });
                attempts.createIndex('byItem', 'itemId');
                attempts.createIndex('byDeck', 'deckId');
                attempts.createIndex('byUser', 'userId');
                attempts.createIndex('byTime', 'ts');
            }

            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

/**
 * Führt eine Transaktion aus und liefert das Ergebnis der Anfrage.
 * @template T
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest<T>} work
 * @returns {Promise<T>}
 */
function run(storeName, mode, work) {
    return openDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = work(tx.objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    }));
}

export const put = (store, value) => run(store, 'readwrite', s => s.put(value));
export const get = (store, key) => run(store, 'readonly', s => s.get(key));
export const getAll = store => run(store, 'readonly', s => s.getAll());
export const remove = (store, key) => run(store, 'readwrite', s => s.delete(key));
export const count = store => run(store, 'readonly', s => s.count());

/**
 * Liest alle Datensätze eines Index zu einem Wert.
 * @param {string} store
 * @param {string} indexName
 * @param {IDBValidKey} value
 */
export function getAllByIndex(store, indexName, value) {
    return run(store, 'readonly', s => s.index(indexName).getAll(value));
}
