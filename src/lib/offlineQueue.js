import { supabase } from './supabaseClient'

const DB_NAME = 'photobooth_offline'
const STORE = 'pending_uploads'
const VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'sessionId' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function queueAdd(payload) {
  const db = await openDB()
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...payload, queuedAt: Date.now() })
    tx.oncomplete = res
    tx.onerror = () => rej(tx.error)
  })
  console.log('[OfflineQueue] Tersimpan lokal:', payload.sessionId)
}

export async function queueGetAll() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function queueRemove(sessionId) {
  const db = await openDB()
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(sessionId)
    tx.oncomplete = res
    tx.onerror = () => rej(tx.error)
  })
}

export async function queueCount() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

function isNetworkError(err) {
  if (!navigator.onLine) return true
  const msg = err?.message?.toLowerCase() || ''
  return (
    err instanceof TypeError ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('networkerror') ||
    msg.includes('fetch')
  )
}

async function uploadItem(item) {
  const { sessionId, userId, frameId, deviceId, deviceName, eventId, compositeBlob, rawPhotoDataUrls } = item

  // 1. Upload composite
  const compositeFileName = `captures/${userId}/${Date.now()}_composite.png`
  const { error: compErr } = await supabase.storage.from('frames').upload(compositeFileName, compositeBlob)
  if (compErr) throw compErr
  const { data: { publicUrl: compositeUrl } } = supabase.storage.from('frames').getPublicUrl(compositeFileName)

  // 2. Upload raw photos
  const rawPhotoUrls = []
  for (let i = 0; i < rawPhotoDataUrls.length; i++) {
    if (!rawPhotoDataUrls[i]) continue
    try {
      const res = await fetch(rawPhotoDataUrls[i])
      const blob = await res.blob()
      const rawFileName = `captures/${userId}/${sessionId}_raw_${i}.jpg`
      const { error: rawErr } = await supabase.storage.from('frames').upload(rawFileName, blob)
      if (!rawErr) {
        const { data: { publicUrl } } = supabase.storage.from('frames').getPublicUrl(rawFileName)
        rawPhotoUrls.push(publicUrl)
      }
    } catch (_) {}
  }

  // 3. Insert to database
  const { error: insertError } = await supabase.from('captures').insert({
    user_id: userId,
    frame_id: frameId,
    image_url: compositeUrl,
    raw_photos: rawPhotoUrls,
    session_id: sessionId,
    device_id: deviceId,
    device_name: deviceName,
    event_id: eventId
  })
  if (insertError) throw insertError

  return compositeUrl
}

// Sync semua item yang pending — dipanggil saat jaringan kembali
export async function syncQueue(onProgress) {
  if (!navigator.onLine) return { synced: 0, failed: 0 }

  const items = await queueGetAll()
  if (items.length === 0) return { synced: 0, failed: 0 }

  console.log(`[OfflineQueue] Menyinkronkan ${items.length} sesi pending...`)

  let synced = 0
  let failed = 0

  for (const item of items) {
    try {
      onProgress?.(`Mengirim sesi ${synced + 1}/${items.length}...`)
      await uploadItem(item)
      await queueRemove(item.sessionId)
      synced++
      console.log('[OfflineQueue] Berhasil sinkron:', item.sessionId)
    } catch (err) {
      if (isNetworkError(err)) break // Jaringan putus lagi, berhenti
      console.error('[OfflineQueue] Gagal sinkron:', item.sessionId, err)
      failed++
    }
  }

  return { synced, failed }
}

export { isNetworkError }
