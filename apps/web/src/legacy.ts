/**
 * The product used to be called Canvylo. Browser storage and Drive files made under that name are carried over here,
 * so nothing a person saved is lost. This is the only place the old name is still used.
 */

const OLD_PREFIX = "canvylo.";
const NEW_PREFIX = "farsha.";
const OLD_DB = "canvylo";

/** Copy the old localStorage settings (theme, preferences, rulers, shape defaults) to their new keys, once. */
export function migrateLegacyLocalStorage(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(OLD_PREFIX)) continue;
      const next = NEW_PREFIX + key.slice(OLD_PREFIX.length);
      if (localStorage.getItem(next) === null) localStorage.setItem(next, localStorage.getItem(key) ?? "");
      localStorage.removeItem(key);
    }
  } catch {
    // storage blocked: nothing to carry over
  }
}

/** Move everything in the old IndexedDB (working copy, version history) into the new one, then delete the old one. */
export async function migrateLegacyDb(newDb: IDBDatabase, store: string): Promise<void> {
  try {
    const old = await new Promise<IDBDatabase | null>((resolve) => {
      const req = indexedDB.open(OLD_DB);
      let created = false;
      req.onupgradeneeded = () => (created = true); // it did not exist
      req.onsuccess = () => {
        if (created || !req.result.objectStoreNames.contains(store)) {
          req.result.close();
          indexedDB.deleteDatabase(OLD_DB);
          resolve(null);
        } else resolve(req.result);
      };
      req.onerror = () => resolve(null);
    });
    if (!old) return;
    const entries = await new Promise<[IDBValidKey, unknown][]>((resolve, reject) => {
      const out: [IDBValidKey, unknown][] = [];
      const cursor = old.transaction(store, "readonly").objectStore(store).openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          out.push([c.key, c.value]);
          c.continue();
        } else resolve(out);
      };
      cursor.onerror = () => reject(cursor.error);
    });
    old.close();
    await new Promise<void>((resolve, reject) => {
      const tx = newDb.transaction(store, "readwrite");
      const s = tx.objectStore(store);
      for (const [k, v] of entries) s.get(k).onsuccess = (e) => (e.target as IDBRequest).result === undefined && s.put(v, k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    indexedDB.deleteDatabase(OLD_DB);
  } catch {
    // keep the old database; try again next time
  }
}

/** Drive files made before the rename carry this marker; files made now carry the new one. */
export const OLD_DRIVE_MARK = "canvylo";
