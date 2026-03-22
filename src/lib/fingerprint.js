import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise = null
let cachedVisitorId = null

function getFpPromise() {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load()
  }
  return fpPromise
}

/**
 * Ritorna un visitorId stabile per questo browser.
 * Il risultato viene cachato in memoria per la sessione corrente.
 */
export async function getFingerprint() {
  if (cachedVisitorId) return cachedVisitorId

  try {
    const fp = await getFpPromise()
    const result = await fp.get()
    cachedVisitorId = result.visitorId
    return cachedVisitorId
  } catch {
    // Fallback: genera un ID temporaneo per questa sessione
    const fallback = 'fallback_' + Math.random().toString(36).slice(2)
    cachedVisitorId = fallback
    return fallback
  }
}
