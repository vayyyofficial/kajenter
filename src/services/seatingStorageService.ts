/**
 * CLASS ROLLING - Storage Service
 * Abstraction layer for browser localStorage with memory fallback and error protection.
 */

const STORAGE_PREFIX = 'classrolling_v1_';
const LEGACY_PREFIXES = ['ruangkelas_v1_', 'seatflow_v1_'];

class MemoryStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

let backendStorage: Storage | MemoryStorage;
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    backendStorage = window.localStorage;
  } else {
    backendStorage = new MemoryStorage();
  }
} catch {
  backendStorage = new MemoryStorage();
}

export const seatingStorageService = {
  get<T = any>(key: string, defaultValue: T | null = null): T | null {
    try {
      let serialized = backendStorage.getItem(STORAGE_PREFIX + key);

      // Seamless migration from legacy prefixes if not found
      if (serialized === null || serialized === undefined) {
        for (const legacyPrefix of LEGACY_PREFIXES) {
          const legacy = backendStorage.getItem(legacyPrefix + key);
          if (legacy !== null && legacy !== undefined) {
            backendStorage.setItem(STORAGE_PREFIX + key, legacy);
            serialized = legacy;
            break;
          }
        }
      }

      if (serialized === null || serialized === undefined) {
        return defaultValue;
      }
      return JSON.parse(serialized);
    } catch (err) {
      console.warn(`[seatingStorageService] Error reading key "${key}":`, err);
      return defaultValue;
    }
  },

  set(key: string, value: any): boolean {
    try {
      const serialized = JSON.stringify(value);
      backendStorage.setItem(STORAGE_PREFIX + key, serialized);
      return true;
    } catch (err) {
      console.error(`[seatingStorageService] Error writing key "${key}":`, err);
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      backendStorage.removeItem(STORAGE_PREFIX + key);
      LEGACY_PREFIXES.forEach((lp) => backendStorage.removeItem(lp + key));
      return true;
    } catch (err) {
      console.error(`[seatingStorageService] Error removing key "${key}":`, err);
      return false;
    }
  },

  clear(): boolean {
    try {
      if (typeof window !== 'undefined' && backendStorage === window.localStorage) {
        Object.keys(window.localStorage).forEach((k) => {
          if (
            k.startsWith(STORAGE_PREFIX) ||
            LEGACY_PREFIXES.some((lp) => k.startsWith(lp))
          ) {
            window.localStorage.removeItem(k);
          }
        });
      } else {
        backendStorage.clear();
      }
      return true;
    } catch (err) {
      console.error('[seatingStorageService] Error clearing storage:', err);
      return false;
    }
  },
};
