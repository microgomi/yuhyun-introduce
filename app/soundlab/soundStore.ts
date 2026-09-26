// ----------------------------------------------------------------------------
// 감지한 소리를 이 브라우저 안(IndexedDB)에 WAV 파일로 저장한다.
//
// localStorage 는 글자만 담을 수 있고 용량도 작아서 소리 파일에는 맞지 않는다.
// IndexedDB 는 파일(Blob)을 그대로 담고, 새로고침하거나 브라우저를 껐다 켜도 남는다.
// ----------------------------------------------------------------------------

import type { Clip } from "./useRecorder";

export interface SavedSound {
  id: string;
  /** 감지한 시각(ms) */
  at: number;
  durationMs: number;
  /** 0~1 가장 큰 소리 크기 */
  peak: number;
  guessId: string;
  emoji: string;
  label: string;
  /** 0~1 짐작 점수 */
  score: number;
  secondLabel: string;
  wav: Blob;
}

const DB_NAME = "soundlab";
const STORE = "sounds";

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
      // 쓰기는 트랜잭션이 끝나야 디스크에 확실히 남는다. 그래서 요청 성공이 아니라 완료를 기다린다.
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveSound(sound: SavedSound): Promise<void> {
  await run("readwrite", (store) => store.put(sound));
}

export async function listSounds(): Promise<SavedSound[]> {
  const all = await run<SavedSound[]>("readonly", (store) => store.getAll() as IDBRequest<SavedSound[]>);
  return all.sort((a, b) => b.at - a.at);
}

export async function deleteSound(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

export async function clearSounds(): Promise<void> {
  await run("readwrite", (store) => store.clear());
}

/** 16비트 모노 WAV. 어느 기기에서나 재생되고 내려받아 다른 앱에서도 열 수 있다. */
export function toWav({ samples, sampleRate }: Clip): Blob {
  const bytes = 44 + samples.length * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 모노
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}
