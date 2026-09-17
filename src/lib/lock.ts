import { loadLock, saveLock } from './db'
import type { LockConfig } from './types'

/**
 * App lock.
 *
 * WHAT THIS IS: a gate on the user interface. It stops someone who picks up an
 * unlocked phone from reading a journal.
 *
 * WHAT THIS IS NOT: encryption. Pages and photos are stored in IndexedDB in the
 * clear, and anyone with access to the browser profile and a devtools window
 * can read them whether or not a passcode is set. Encrypting at rest would mean
 * deriving a key from the passcode and re-encrypting every blob — a real
 * feature, but one that changes the recovery story completely (forget the
 * passcode, lose the journal), so it isn't something to do by halves or to
 * imply falsely.
 *
 * The Privacy section of Settings says this in plain language. Overstating it
 * would be worse than not having it.
 */

const PBKDF2_ITERATIONS = 250_000

/**
 * SubtleCrypto is gated to secure contexts, so `crypto.subtle` is *undefined*
 * over plain HTTP on a LAN address — which is exactly how someone tests a PWA
 * on their phone (`vite --host`, then http://192.168.x.x:5173). Without this
 * guard, setting a passcode throws a TypeError and the UI hangs on "busy".
 *
 * http://localhost and https:// are both secure contexts, so this only bites
 * on the LAN-IP path, and the fix is a tunnel or a static deploy rather than
 * anything in the app. Settings explains that rather than hiding the feature.
 */
export function lockAvailable(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0))
}

async function derive(passcode: string, salt: Uint8Array): Promise<string> {
  if (!lockAvailable()) {
    throw new Error(
      'The app lock needs a secure connection. Open Pagebound over https, or at '
      + 'http://localhost, and try again.',
    )
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // BufferSource typing differs across TS DOM versions; the bytes are the same.
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return toBase64(bits)
}

export async function getLockConfig(): Promise<LockConfig> {
  return (await loadLock()) ?? { passcodeHash: null, salt: null, credentialId: null }
}

export async function isLockEnabled(): Promise<boolean> {
  const config = await getLockConfig()
  return config.passcodeHash !== null
}

export async function setPasscode(passcode: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(passcode, salt)
  const existing = await getLockConfig()
  await saveLock({ ...existing, passcodeHash: hash, salt: toBase64(salt.buffer) })
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const config = await getLockConfig()
  if (!config.passcodeHash || !config.salt) return true
  // Fail closed: if the passcode can't be checked, it isn't satisfied.
  if (!lockAvailable()) return false
  const hash = await derive(passcode, fromBase64(config.salt))
  return timingSafeEqual(hash, config.passcodeHash)
}

/** Constant-time-ish string compare. Cheap, and there's no reason not to. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function clearLock(): Promise<void> {
  await saveLock({ passcodeHash: null, salt: null, credentialId: null })
}

/* --------------------------------------------------------------- biometric */

export function biometricSupported(): boolean {
  return typeof window !== 'undefined'
    && 'PublicKeyCredential' in window
    && typeof navigator.credentials?.create === 'function'
}

export async function biometricAvailable(): Promise<boolean> {
  if (!biometricSupported()) return false
  try {
    return await (window as unknown as {
      PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean> }
    }).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Enrols the device's own authenticator (Face ID, Touch ID, Windows Hello).
 *
 * The credential is never verified against a server — there isn't one — so this
 * proves "the person holding this device can satisfy its authenticator", not
 * "this is a specific account". For a local screen lock that is exactly the
 * right amount of assurance.
 */
export async function enrolBiometric(): Promise<boolean> {
  if (!(await biometricAvailable())) return false
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Pagebound', id: window.location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: 'pagebound-local',
          displayName: 'Pagebound',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null

    if (!credential) return false
    const existing = await getLockConfig()
    await saveLock({ ...existing, credentialId: toBase64(credential.rawId) })
    return true
  } catch (error) {
    console.warn('[pagebound] biometric enrolment declined', error)
    return false
  }
}

export async function verifyBiometric(): Promise<boolean> {
  const config = await getLockConfig()
  if (!config.credentialId) return false
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{
          type: 'public-key',
          id: fromBase64(config.credentialId) as unknown as BufferSource,
        }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return assertion !== null
  } catch {
    return false
  }
}

export async function removeBiometric(): Promise<void> {
  const existing = await getLockConfig()
  await saveLock({ ...existing, credentialId: null })
}
