const PREFIX = 'pb_frames_'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 jam

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
    const parsed = JSON.parse(raw)
    // Support format lama (array langsung) maupun format baru {frames, cachedAt}
    if (Array.isArray(parsed)) return { frames: parsed, cachedAt: 0 }
    return parsed
  } catch {
    return null
  }
}

export function setFrameCache(user, frames) {
  try {
    localStorage.setItem(buildKey(user), JSON.stringify({
      frames,
      cachedAt: Date.now()
    }))
  } catch (e) {
    console.warn('[FrameCache] Tidak bisa simpan ke localStorage:', e)
  }
}

export function isCacheStale(user) {
  try {
    const cached = getFrameCache(user)
    if (!cached) return true
    return (Date.now() - (cached.cachedAt || 0)) > CACHE_TTL_MS
  } catch {
    return true
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
