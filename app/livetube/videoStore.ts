// ----------------------------------------------------------------------------
// 녹화한 방송 영상을 이 브라우저 안(IndexedDB)에 저장한다.
// 영상은 크기가 커서 localStorage 에는 담을 수 없다. 새로고침해도 남는다.
// ----------------------------------------------------------------------------

export interface SavedVideo {
  id: string;
  at: number;
  title: string;
  categoryEmoji: string;
  durationMs: number;
  peakViewers: number;
  likes: number;
  newSubs: number;
  video: Blob;
}

const DB_NAME = "livetube";
const STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      // 트랜잭션이 끝나야 확실히 저장된 것이다.
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveVideo(video: SavedVideo): Promise<void> {
  await run("readwrite", (store) => store.put(video));
}

export async function listVideos(): Promise<SavedVideo[]> {
  const all = await run<SavedVideo[]>("readonly", (store) => store.getAll() as IDBRequest<SavedVideo[]>);
  return all.sort((a, b) => b.at - a.at);
}

export async function deleteVideo(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}
