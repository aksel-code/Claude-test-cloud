import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../ui/Sheet'
import { Icon } from '../ui/Icon'
import { toast } from '../ui/Toast'
import { useLibrary } from '@/store/library'
import { useSettings } from '@/store/settings'
import { MOODS } from '@/content/moods'
import { promptForIndex } from '@/content/prompts'
import { currentWeather, type Weather } from '@/lib/weather'
import { createNote, createSticker, createText } from '@/lib/elements'
import { formatLong, todayKey, weekdayName } from '@/lib/date'
import { PAGE_H, PAGE_W } from '@/lib/constants'
import { haptic } from '@/lib/motion'
import type { MoodId, PageElement } from '@/lib/types'

/**
 * "Today" — the fastest route from opening the app to writing something.
 *
 * Everything past the journal choice is optional and pre-answered. The page is
 * pre-stamped with the date so the blank page is never entirely blank, which is
 * the single biggest reason a journal entry doesn't get written.
 */
export function TodaySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const journals = useLibrary((s) => s.journals)
  const createPage = useLibrary((s) => s.createPage)
  const createJournal = useLibrary((s) => s.createJournal)

  const weatherEnabled = useSettings((s) => s.weatherEnabled)
  const promptsEnabled = useSettings((s) => s.promptsEnabled)
  const promptIndex = useSettings((s) => s.lastPromptIndex)
  const nextPrompt = useSettings((s) => s.nextPrompt)

  const [journalId, setJournalId] = useState<string>('')
  const [mood, setMood] = useState<MoodId | null>(null)
  const [usePrompt, setUsePrompt] = useState(true)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [busy, setBusy] = useState(false)

  const date = todayKey()
  const prompt = useMemo(() => promptForIndex(promptIndex), [promptIndex])

  useEffect(() => {
    if (!open) return
    setJournalId((current) => current || journals[0]?.id || '')
    setMood(null)
    setUsePrompt(promptsEnabled)
    setWeather(null)
  }, [open, journals, promptsEnabled])

  useEffect(() => {
    if (!open || !weatherEnabled) return
    setLoadingWeather(true)
    void currentWeather().then((result) => {
      setWeather(result)
      setLoadingWeather(false)
    })
  }, [open, weatherEnabled])

  async function begin() {
    setBusy(true)
    try {
      let targetId = journalId
      if (!targetId) {
        const journal = await createJournal({ title: 'My journal' })
        targetId = journal.id
      }

      const elements: PageElement[] = []

      // Date stamp: weekday large, full date beneath, top-left like a diary.
      elements.push(createText(weekdayName(date), {
        x: 300, y: 190, font: 'homemade', fontSize: 62, color: '#2B2A28',
      }))
      elements.push(createText(formatLong(date), {
        x: 296, y: 268, font: 'inter', fontSize: 30, color: '#7C7469',
        letterSpacing: 2,
      }))

      if (weather) {
        elements.push(createText(`${weather.label} · ${weather.temperatureC}°C`, {
          x: 790, y: 196, font: 'patrick', fontSize: 34, color: '#5A544C', align: 'right',
        }))
        if (weather.sticker) {
          elements.push(createSticker('nature', weather.sticker, { x: 930, y: 196, size: 120 }))
        }
      }

      if (mood) {
        elements.push(createSticker('moods', mood, { x: PAGE_W - 180, y: 330, size: 150 }))
      }

      if (usePrompt && promptsEnabled) {
        elements.push(createNote('index', {
          x: PAGE_W / 2, y: PAGE_H * 0.58, text: prompt,
        }))
        nextPrompt()
      }

      const page = await createPage(targetId, { date, mood, elements })
      haptic('place')
      onClose()
      navigate(`/page/${page.id}`)
    } catch (error) {
      console.error(error)
      toast('Could not start today’s page.', { tone: 'warn' })
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={weekdayName(date)}
      subtitle={formatLong(date)}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-quiet" onClick={onClose}>Not now</button>
          <button type="button" className="btn-primary" onClick={begin} disabled={busy}>
            {busy ? 'Opening…' : 'Start writing'}
          </button>
        </div>
      }
    >
      {journals.length > 1 && (
        <div className="mb-5">
          <span className="label">Journal</span>
          <div className="flex flex-wrap gap-1.5">
            {journals.map((journal) => (
              <button
                key={journal.id}
                type="button"
                aria-pressed={journal.id === journalId}
                onClick={() => setJournalId(journal.id)}
                className={`tap px-3.5 rounded-full text-sm font-medium transition-colors
                  ${journal.id === journalId ? 'bg-ink text-page' : 'bg-sunk text-ink-soft hover:text-ink'}`}
              >
                {journal.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <span className="label">How was it? (optional)</span>
        <div role="radiogroup" aria-label="Mood" className="flex gap-2 flex-wrap">
          {MOODS.map((option) => {
            const active = option.id === mood
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMood(active ? null : option.id)}
                className={`tap flex-col gap-1 px-3 py-2 rounded-xl border transition-all duration-150 ease-spring
                  ${active ? 'border-ink bg-sunk scale-105' : 'border-rule hover:border-ink-faint'}`}
              >
                <span className="w-8 h-8 rounded-full" style={{ background: option.color }} />
                <span className="text-xs text-ink-soft">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {weatherEnabled && (
        <p className="text-sm text-ink-soft mb-5 flex items-center gap-2">
          <Icon name="weather" size={17} />
          {loadingWeather
            ? 'Checking the weather…'
            : weather
              ? `${weather.label}, ${weather.temperatureC}°C — it'll go on the page.`
              : 'Weather unavailable right now.'}
        </p>
      )}

      {promptsEnabled && (
        <div className={`rounded-xl border p-4 transition-colors ${usePrompt ? 'border-rule bg-surface' : 'border-rule/60 opacity-60'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-1">
                Today&rsquo;s prompt
              </p>
              <p className="font-display text-lg text-ink leading-snug">{prompt}</p>
            </div>
            <button
              type="button"
              onClick={() => setUsePrompt(!usePrompt)}
              className="tap rounded-lg text-ink-faint hover:text-ink"
            >
              <Icon name={usePrompt ? 'close' : 'plus'} size={18}
                title={usePrompt ? 'Leave the prompt off' : 'Add the prompt'} />
            </button>
          </div>
          <button type="button" className="btn-ghost mt-2 -ml-2 text-sm" onClick={nextPrompt}>
            <Icon name="redo" size={15} />
            Another one
          </button>
        </div>
      )}
    </Sheet>
  )
}
