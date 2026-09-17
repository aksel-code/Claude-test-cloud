import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../ui/Icon'
import {
  getLockConfig, isLockEnabled, lockAvailable, verifyBiometric, verifyPasscode,
} from '@/lib/lock'

/**
 * Gates the whole app behind a passcode when one is set.
 *
 * Deliberate choices:
 * - Failed attempts add an escalating delay rather than wiping anything. This
 *   is somebody's journal; the failure mode for a forgotten passcode must never
 *   be data loss.
 * - There is no "forgot passcode" reset, because a reset that restored access
 *   would make the lock meaningless. Settings explains this before you set one.
 * - The lock re-arms when the tab has been hidden for more than two minutes,
 *   not on every blur — re-entering a passcode after switching apps for three
 *   seconds is how people end up turning the feature off.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const hiddenSince = useRef<number | null>(null)

  useEffect(() => {
    void isLockEnabled().then((on) => {
      setEnabled(on)
      if (!on) setUnlocked(true)
    })
  }, [])

  useEffect(() => {
    if (!enabled) return
    function onVisibility() {
      if (document.hidden) {
        hiddenSince.current = Date.now()
        return
      }
      const away = hiddenSince.current ? Date.now() - hiddenSince.current : 0
      hiddenSince.current = null
      if (away > 2 * 60 * 1000) setUnlocked(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [enabled])

  if (enabled === null) {
    return <div className="min-h-dvh bg-page" aria-busy="true" />
  }

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />
  }

  return <>{children}</>
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [hasBiometric, setHasBiometric] = useState(false)
  const [checking, setChecking] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getLockConfig().then((config) => setHasBiometric(config.credentialId !== null))
    input.current?.focus()
  }, [])

  const tryBiometric = useCallback(async () => {
    setChecking(true)
    const ok = await verifyBiometric()
    setChecking(false)
    if (ok) onUnlock()
    else setError('That didn’t work. Try your passcode.')
  }, [onUnlock])

  // Offer the authenticator straight away — that's the whole appeal of it.
  useEffect(() => {
    if (!hasBiometric) return
    const id = setTimeout(() => { void tryBiometric() }, 350)
    return () => clearTimeout(id)
  }, [hasBiometric, tryBiometric])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (Date.now() < lockedUntil) return
    setChecking(true)
    const ok = await verifyPasscode(code)
    setChecking(false)

    if (ok) { onUnlock(); return }

    const next = attempts + 1
    setAttempts(next)
    setCode('')
    if (next >= 4) {
      // 5s, 10s, 20s... capped. Slows guessing without ever locking someone out.
      const wait = Math.min(60_000, 5000 * 2 ** (next - 4))
      setLockedUntil(Date.now() + wait)
      setError(`Too many tries. Wait ${Math.round(wait / 1000)} seconds.`)
      setTimeout(() => { setError(null); setLockedUntil(0) }, wait)
    } else {
      setError('Not quite.')
    }
  }

  const waiting = Date.now() < lockedUntil

  return (
    <div className="min-h-dvh grid place-items-center bg-page px-6">
      <div className="w-full max-w-xs text-center animate-fade-up">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-sunk grid place-items-center text-ink-soft">
          <Icon name="lock" size={28} />
        </div>

        <h1 className="font-display text-2xl text-ink mb-1">Pagebound</h1>
        <p className="text-ink-soft text-sm mb-7">Enter your passcode to open your journals.</p>

        <form onSubmit={submit}>
          <input
            type="text"
            name="username"
            value="Pagebound"
            autoComplete="username"
            readOnly
            hidden
            aria-hidden="true"
            tabIndex={-1}
          />
          <label htmlFor="passcode" className="sr-only">Passcode</label>
          <input
            ref={input}
            id="passcode"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={code}
            onChange={(event) => { setCode(event.target.value); setError(null) }}
            disabled={waiting || checking}
            className="field text-center text-2xl tracking-[0.5em] h-14"
            placeholder="••••"
            aria-describedby={error ? 'passcode-error' : undefined}
            aria-invalid={error ? true : undefined}
          />

          {error && (
            <p id="passcode-error" role="alert" className="text-sm text-terracotta-deep mt-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full mt-4"
            disabled={!code || waiting || checking}
          >
            {checking ? 'Checking…' : 'Unlock'}
          </button>
        </form>

        {hasBiometric && (
          <button
            type="button"
            onClick={() => void tryBiometric()}
            className="btn-ghost mt-3 w-full"
            disabled={checking}
          >
            <Icon name="fingerprint" size={19} />
            Use biometrics
          </button>
        )}

        {!lockAvailable() && (
          <p role="alert" className="text-sm text-terracotta-deep mt-6 leading-relaxed">
            This page is served over an insecure connection, so the browser
            won&rsquo;t let Pagebound check your passcode. Open it over https, or
            at http://localhost, to get back in. Your pages are untouched.
          </p>
        )}

        <p className="text-xs text-ink-faint mt-8 leading-relaxed">
          Your pages are stored on this device. There is no way to reset this
          passcode without clearing the app&rsquo;s data.
        </p>
      </div>
    </div>
  )
}
