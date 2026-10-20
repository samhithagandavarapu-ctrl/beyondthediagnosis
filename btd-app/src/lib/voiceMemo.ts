// "Record my voice": one recording, up to a minute, to play for the doctor.
// It's kept in this browser's own database (IndexedDB) so it's still there
// at the visit — never uploaded, never put on a draft, never in the account.

const DB_NAME = "voiced-my-voice";
const STORE = "recordings";
const KEY = "for-my-doctor";

export const MAX_SECONDS = 60;

export type VoiceMemo = { blob: Blob; seconds: number; createdAt: string };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export const memoStorageSupported = () => typeof indexedDB !== "undefined";

export async function loadMemo(): Promise<VoiceMemo | null> {
  if (!memoStorageSupported()) return null;
  try {
    return (await run<VoiceMemo | undefined>("readonly", (s) => s.get(KEY))) ?? null;
  } catch {
    return null;
  }
}

export async function saveMemo(memo: VoiceMemo): Promise<boolean> {
  if (!memoStorageSupported()) return false;
  try {
    await run("readwrite", (s) => s.put(memo, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function deleteMemo(): Promise<void> {
  if (!memoStorageSupported()) return;
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    // Nothing to delete, or storage is blocked: either way it's gone.
  }
}
