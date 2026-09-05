/**
 * A `jotai` sync storage backed by `sessionStorage`, degrading to an in-memory map when
 * `sessionStorage` is unavailable or throws (private windows, storage disabled, quota).
 * History then lasts the page's lifetime instead of the tab's — acceptable, never a crash.
 *
 * Shape matches `jotai/utils`' `SyncStorage<T>` structurally (getItem / setItem /
 * removeItem) without importing the type, which lives at an unstable subpath.
 */
export function createSessionStorage<T>() {
  const memory = new Map<string, string>();

  const read = (key: string): string | null => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  };

  const write = (key: string, value: string): void => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  };

  const remove = (key: string): void => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  };

  return {
    getItem: (key: string, initialValue: T): T => {
      const raw = read(key);
      if (raw === null) return initialValue;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return initialValue;
      }
    },
    setItem: (key: string, value: T): void => write(key, JSON.stringify(value)),
    removeItem: (key: string): void => remove(key),
  };
}
