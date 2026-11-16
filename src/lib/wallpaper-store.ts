const DB_NAME = "tj-nav"
const STORE = "wallpaper"
/** The single-slot key the first version used; read once and migrated. */
const LEGACY_KEY = "custom"

export type StoredWallpaper = {
  id: string
  blob: Blob
  addedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

function newId() {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** Values used to be a bare Blob; anything without `blob` is one of those. */
function normalize(id: string, value: unknown): StoredWallpaper | null {
  if (value instanceof Blob) return { id, blob: value, addedAt: 0 }
  if (!value || typeof value !== "object") return null
  const { blob, addedAt } = value as { blob?: unknown; addedAt?: unknown }
  if (!(blob instanceof Blob)) return null
  return { id, blob, addedAt: typeof addedAt === "number" ? addedAt : 0 }
}

/** Newest first — that is the order the gallery shows them in. */
export async function listCustomWallpapers(): Promise<StoredWallpaper[]> {
  try {
    const db = await openDb()
    try {
      const [keys, values] = await new Promise<[IDBValidKey[], unknown[]]>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readonly")
        const store = transaction.objectStore(STORE)
        const keyRequest = store.getAllKeys()
        const valueRequest = store.getAll()
        transaction.oncomplete = () => resolve([keyRequest.result, valueRequest.result])
        transaction.onerror = () => reject(transaction.error)
      })
      return keys
        .map((key, index) => normalize(String(key), values[index]))
        .filter((entry): entry is StoredWallpaper => entry !== null)
        .sort((a, b) => b.addedAt - a.addedAt)
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

export async function saveCustomWallpaper(file: File): Promise<StoredWallpaper> {
  const blob = await shrink(file)
  const entry: StoredWallpaper = { id: newId(), blob, addedAt: Date.now() }
  await withStore<IDBValidKey>("readwrite", (store) => store.put(entry, entry.id))
  // The old single slot has been superseded; leaving it would show a ghost copy.
  await withStore<undefined>("readwrite", (store) => store.delete(LEGACY_KEY) as IDBRequest<undefined>).catch(
    () => undefined,
  )
  return entry
}

export async function deleteCustomWallpaper(id: string): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(id) as IDBRequest<undefined>).catch(
    () => undefined,
  )
}

const MAX_EDGE = 2560

/** Re-encodes large uploads so a 12 MP photo does not sit in storage at 8 MB. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const needsResize = scale < 1 || file.size > 1_200_000
    if (!needsResize) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")
    if (!context) {
      bitmap.close()
      return file
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const encoded = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.9)
    })
    return encoded ?? file
  } catch {
    // HEIC and friends cannot be decoded here; hand the original back and let
    // the browser try to paint it.
    return file
  }
}
