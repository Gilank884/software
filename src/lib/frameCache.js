const PREFIX = 'pb_frames_'

// Otomatis clear cache jika halaman di-reload (Ctrl+R / Cmd+Shift+R)
// Ini berjalan sekali saat modul pertama kali di-import
;(function clearOnReload() {
  try {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav?.type === 'reload') {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
      keys.forEach(k => localStorage.removeItem(k))
      if (keys.length > 0) {
        console.log(`[FrameCache] Cache dihapus karena reload (${keys.length} key)`)
      }
    }
  } catch (_) {}
})()

function buildKey(user) {
  if (user?.availableFrames?.length > 0) {
    return PREFIX + [...user.availableFrames].sort().join('_')
  }
  if (user?.id) return PREFIX + user.id
  return PREFIX + 'default'
}

export function getFrameCache(user) {
  try {
    const raw = localStorage.getItem(buildKey(user))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setFrameCache(user, data) {
  try {
    localStorage.setItem(buildKey(user), JSON.stringify(data))
  } catch (e) {
    // localStorage penuh atau tidak tersedia — tidak fatal
    console.warn('[FrameCache] Tidak bisa simpan ke localStorage:', e)
  }
}

export function clearFrameCache(user) {
  try {
    if (user) {
      localStorage.removeItem(buildKey(user))
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k))
    }
  } catch (_) {}
}
