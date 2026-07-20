// Persistent local recordings via IndexedDB. Stores the recorded video Blob
// plus lightweight metadata, so recordings survive reloads.

const DB = 'iptv-recordings'
const STORE = 'recordings'

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const out = fn(store)
        t.oncomplete = () => resolve(out?._result !== undefined ? out._result : out)
        t.onerror = () => reject(t.error)
      })
  )
}

export async function saveRecording(rec) {
  await tx('readwrite', (s) => s.put(rec))
  return rec
}

// List metadata only (omit the blob to keep it light).
export async function listRecordings() {
  return tx('readonly', (s) => {
    const box = {}
    s.getAll().onsuccess = (e) => (box._result = e.target.result || [])
    return box
  }).then((list) =>
    (list || [])
      .map(({ blob, ...meta }) => meta)
      .sort((a, b) => b.ts - a.ts)
  )
}

export async function getRecording(id) {
  return tx('readonly', (s) => {
    const box = {}
    s.get(id).onsuccess = (e) => (box._result = e.target.result)
    return box
  })
}

export async function deleteRecording(id) {
  return tx('readwrite', (s) => s.delete(id))
}
