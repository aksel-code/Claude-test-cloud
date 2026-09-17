import { useCallback, useEffect, useState } from 'react'
import { useSettings } from '@/store/settings'
import { useLibrary } from '@/store/library'
import { useAsync } from '@/hooks'
import { Icon } from './ui/Icon'
import { Segmented, Toggle, Field } from './ui/Controls'
import { Confirm, Sheet } from './ui/Sheet'
import { toast } from './ui/Toast'
import { storageReport, wipeAll, type StorageReport } from '@/lib/db'
import { formatBytes, releaseObjectUrls } from '@/lib/image'
import {
  biometricAvailable, clearLock, enrolBiometric, getLockConfig, lockAvailable,
  removeBiometric, setPasscode,
} from '@/lib/lock'
import { prefersReducedMotion } from '@/lib/motion'
import type { ThemeSetting } from '@/lib/types'

export default function SettingsScreen() {
  const settings = useSettings()
  const patch = useSettings((s) => s.patch)

  const load = useCallback(() => storageReport(), [])
  const { value: storage, reload } = useAsync<StorageReport | null>(load, [], null)

  const [lockSheet, setLockSheet] = useState(false)
  const [hasLock, setHasLock] = useState(false)
  const [hasBiometric, setHasBiometric] = useState(false)
  const [biometricPossible, setBiometricPossible] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const secure = lockAvailable()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const refreshLock = useCallback(async () => {
    const config = await getLockConfig()
    setHasLock(config.passcodeHash !== null)
    setHasBiometric(config.credentialId !== null)
  }, [])

  useEffect(() => {
    void refreshLock()
    void biometricAvailable().then(setBiometricPossible)
  }, [refreshLock])

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-16">
      <h1 className="font-display text-3xl text-ink mb-8">Settings</h1>

      <Section title="Look">
        <div className="flex items-center justify-between py-3 gap-4">
          <div>
            <p className="font-medium text-ink">Theme</p>
            <p className="text-sm text-ink-soft">Dark mode is a warm desk lamp, not a black screen.</p>
          </div>
          <Segmented<ThemeSetting>
            label="Theme"
            value={settings.theme}
            onChange={(theme) => patch({ theme })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Auto' },
            ]}
          />
        </div>

        <Toggle
          label="Reduce motion"
          description={settings.reduceMotion === null
            ? `Following your system setting (currently ${prefersReducedMotion() ? 'reduced' : 'full motion'}).`
            : 'Set here, overriding your system setting.'}
          checked={settings.reduceMotion ?? prefersReducedMotion()}
          onChange={(value) => patch({ reduceMotion: value })}
        />
        {settings.reduceMotion !== null && (
          <button type="button" className="btn-ghost -ml-3 text-sm" onClick={() => patch({ reduceMotion: null })}>
            Follow my system setting again
          </button>
        )}
      </Section>

      <Section title="Editor">
        <Toggle
          label="Snap to guides"
          description="Nudges elements into line with the page and with each other."
          checked={settings.snapEnabled}
          onChange={(snapEnabled) => patch({ snapEnabled })}
        />
        <Toggle
          label="Show guide lines"
          description="Draws the dashed lines while you drag."
          checked={settings.showSnapGuides}
          onChange={(showSnapGuides) => patch({ showSnapGuides })}
        />
        <Toggle
          label="Haptics"
          description="A small tap when something lands. Android only."
          checked={settings.hapticsEnabled}
          onChange={(hapticsEnabled) => patch({ hapticsEnabled })}
        />
      </Section>

      <Section title="Daily page">
        <Toggle
          label="Writing prompts"
          description="Offers a rotating prompt card when you start today's page."
          checked={settings.promptsEnabled}
          onChange={(promptsEnabled) => patch({ promptsEnabled })}
        />
        <Toggle
          label="Weather"
          description="Stamps the weather on today's page. Needs your location, and is the only time Pagebound talks to the internet."
          checked={settings.weatherEnabled}
          onChange={(weatherEnabled) => patch({ weatherEnabled })}
        />
        {settings.bestStreak > 1 && (
          <p className="text-sm text-ink-soft py-3">
            Longest run of consecutive days: <strong className="text-ink tabular-nums">{settings.bestStreak}</strong>.
            {' '}Days off are not counted against you.
          </p>
        )}
      </Section>

      <Section title="Privacy">
        <div className="flex items-start justify-between gap-4 py-3">
          <div className="flex-1">
            <p className="font-medium text-ink">App lock</p>
            <p className="text-sm text-ink-soft mt-0.5 leading-snug">
              {!secure
                ? 'Unavailable over an insecure connection.'
                : hasLock
                  ? `On${hasBiometric ? ', with biometrics' : ''}. Asked for when you open the app.`
                  : 'Off. Anyone who opens the app can read your journals.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-outline shrink-0"
            onClick={() => setLockSheet(true)}
            disabled={!secure}
          >
            {hasLock ? 'Change' : 'Set up'}
          </button>
        </div>

        {!secure && (
          <p className="text-sm text-ink-soft leading-relaxed rounded-xl bg-sunk p-3.5 mt-1">
            Browsers only expose the cryptography this needs over a secure
            connection. You&rsquo;re on <code className="text-ink">{origin}</code>. Open
            Pagebound over <strong className="text-ink">https</strong>, or at{' '}
            <strong className="text-ink">http://localhost</strong>, and the lock
            becomes available. Everything else on this page works as normal.
          </p>
        )}

        <div className="rounded-xl bg-sunk p-4 mt-2 text-sm text-ink-soft leading-relaxed">
          <p className="font-medium text-ink mb-1.5 flex items-center gap-2">
            <Icon name="key" size={16} />
            Where your journals live
          </p>
          <p className="mb-2">
            Everything &mdash; pages, photos, settings &mdash; is stored in this browser&rsquo;s
            own database (IndexedDB) on this device. There is no account, no server and
            no sync. Nothing you write is sent anywhere.
          </p>
          <p className="mb-2">
            The app lock is a lock on the <em>screen</em>, not encryption. Your pages are
            stored unencrypted, so someone with access to this device and browser
            profile could read them with developer tools regardless of the passcode.
          </p>
          <p>
            Because there&rsquo;s no copy elsewhere: clearing this site&rsquo;s data, or
            uninstalling the browser, deletes your journals permanently. Export what
            you&rsquo;d be sad to lose.
          </p>
        </div>
      </Section>

      <Section title="Storage">
        {storage && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 text-sm">
            <Stat label="Journals" value={String(storage.journals)} />
            <Stat label="Pages" value={String(storage.pages)} />
            <Stat label="Photos" value={String(storage.photos)} />
            <Stat label="Photo data" value={formatBytes(storage.photoBytes)} />
            {storage.quotaUsed !== null && (
              <Stat label="Used by this app" value={formatBytes(storage.quotaUsed)} />
            )}
            {storage.quotaTotal !== null && (
              <Stat label="Browser allowance" value={formatBytes(storage.quotaTotal)} />
            )}
          </dl>
        )}
        <p className="text-sm text-ink-soft py-2">
          {storage?.persisted
            ? 'This browser has marked your data as persistent, so it will not be cleared automatically.'
            : 'Your browser may clear this data if the device runs low on space. Installing Pagebound to your home screen makes that much less likely.'}
        </p>

        <button
          type="button"
          onClick={() => setConfirmWipe(true)}
          className="btn-ghost -ml-3 text-terracotta-deep hover:bg-terracotta/10 mt-2"
        >
          <Icon name="trash" size={18} />
          Delete everything on this device
        </button>
      </Section>

      <p className="text-xs text-ink-faint text-center mt-10">
        Pagebound &middot; works offline &middot; your pages stay yours
      </p>

      <LockSheet
        open={lockSheet}
        onClose={() => { setLockSheet(false); void refreshLock() }}
        hasLock={hasLock}
        hasBiometric={hasBiometric}
        biometricPossible={biometricPossible}
      />

      <Confirm
        open={confirmWipe}
        title="Delete everything?"
        body="This removes every journal, page and photo from this device. There is no backup and no undo. If you want to keep anything, export it first."
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirmWipe(false)}
        onConfirm={async () => {
          await wipeAll()
          releaseObjectUrls()
          setConfirmWipe(false)
          await useLibrary.getState().refresh()
          reload()
          toast('All data deleted.')
        }}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="font-display text-xl text-ink mb-1 pb-2 border-b border-rule">{title}</h2>
      <div className="divide-y divide-rule/60">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-faint text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-ink font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function LockSheet({
  open, onClose, hasLock, hasBiometric, biometricPossible,
}: { open: boolean; onClose: () => void; hasLock: boolean; hasBiometric: boolean; biometricPossible: boolean }) {
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (code.length < 4) { setError('Use at least four characters.'); return }
    if (code !== confirm) { setError('Those don’t match.'); return }
    setBusy(true)
    await setPasscode(code)
    setBusy(false)
    setCode(''); setConfirm(''); setError(null)
    toast('App lock is on.', { tone: 'good', icon: 'check' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="App lock"
      subtitle="Asked for when you open Pagebound."
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={save} disabled={busy || !code}>
            {hasLock ? 'Change passcode' : 'Turn on lock'}
          </button>
        </div>
      }
    >
      <form onSubmit={(event) => { event.preventDefault(); void save() }}>
      {/* A hidden username gives password managers something to attach the
          passcode to; without it Chrome declines to offer to save it. */}
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
      <div className="rounded-xl bg-mustard/15 border border-mustard/40 p-3.5 mb-5 text-sm text-ink leading-relaxed">
        <strong className="block mb-1">There is no way to reset this.</strong>
        If you forget the passcode, the only way back in is to clear the app&rsquo;s data,
        which deletes your journals. Pick something you will remember.
      </div>

      <Field label="Passcode">
        <input
          className="field"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          value={code}
          onChange={(event) => { setCode(event.target.value); setError(null) }}
          placeholder="At least 4 characters"
        />
      </Field>

      <Field label="Again">
        <input
          className="field"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => { setConfirm(event.target.value); setError(null) }}
        />
      </Field>

      {error && <p role="alert" className="text-sm text-terracotta-deep -mt-2 mb-4">{error}</p>}
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>

      {biometricPossible && (
        <div className="border-t border-rule pt-4 mt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-ink flex items-center gap-2">
                <Icon name="fingerprint" size={17} />
                Biometrics
              </p>
              <p className="text-sm text-ink-soft mt-0.5 leading-snug">
                {hasBiometric
                  ? 'Enrolled on this device. Your passcode still works as a fallback.'
                  : 'Use Face ID, Touch ID or Windows Hello instead of typing.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-outline shrink-0"
              onClick={async () => {
                if (hasBiometric) {
                  await removeBiometric()
                  toast('Biometrics removed.')
                } else {
                  const ok = await enrolBiometric()
                  toast(ok ? 'Biometrics enrolled.' : 'Enrolment was cancelled.', { tone: ok ? 'good' : 'neutral' })
                }
                onClose()
              }}
            >
              {hasBiometric ? 'Remove' : 'Enrol'}
            </button>
          </div>
        </div>
      )}

      {hasLock && (
        <button
          type="button"
          className="btn-ghost text-terracotta-deep hover:bg-terracotta/10 mt-5 -ml-3"
          onClick={async () => {
            await clearLock()
            toast('App lock turned off.')
            onClose()
          }}
        >
          <Icon name="unlock" size={18} />
          Turn off the lock
        </button>
      )}
    </Sheet>
  )
}
