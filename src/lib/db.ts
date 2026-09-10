import { openDB, type IDBPDatabase } from "idb";
import type { StateStorage } from "zustand/middleware";

const DB_NAME = "bechat_db";
const DB_VERSION = 1;
const STORE_NAME = "kv_store";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Adapter Asynchronous Storage untuk middleware `persist` Zustand yang berbasis IndexedDB.
 * Mendukung migrasi otomatis dari `localStorage` jika data lama ditemukan.
 */
export const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB();
      const val = await db.get(STORE_NAME, name);
      if (val !== undefined && val !== null) {
        return typeof val === "string" ? val : JSON.stringify(val);
      }

      // Migrasi otomatis dari localStorage jika di IndexedDB belum ada
      if (typeof window !== "undefined" && window.localStorage) {
        const legacyKey = name.includes("settings")
          ? "bechat.settings.v1"
          : name.includes("sessions")
            ? "bechat.sessions.v1"
            : name;
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          try {
            // Bungkus dalam format Zustand persist state wrapper jika data lama berformat raw
            const parsed = JSON.parse(legacy);
            const wrapped = JSON.stringify({ state: parsed, version: 0 });
            await db.put(STORE_NAME, wrapped, name);
            return wrapped;
          } catch {
            await db.put(STORE_NAME, legacy, name);
            return legacy;
          }
        }
      }
      return null;
    } catch (error) {
      console.warn(`IndexedDB getItem('${name}') error:`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, value, name);
    } catch (error) {
      console.error(`IndexedDB setItem('${name}') error:`, error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, name);
    } catch (error) {
      console.error(`IndexedDB removeItem('${name}') error:`, error);
    }
  },
};
