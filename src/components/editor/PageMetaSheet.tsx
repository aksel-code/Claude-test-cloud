import { useEffect, useState } from 'react'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Controls'
import { Icon } from '../ui/Icon'
import { useEditor } from '@/store/editor'
import { MOODS } from '@/content/moods'
import { allTags } from '@/store/library'
import { TAGS_SUGGESTED } from '@/lib/constants'
import { formatLong, weekdayName } from '@/lib/date'
import type { MoodId } from '@/lib/types'

/** Title, mood and tags for the current page. */
export function PageMetaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const title = useEditor((s) => s.title)
  const setTitle = useEditor((s) => s.setTitle)
  const mood = useEditor((s) => s.mood)
  const setMood = useEditor((s) => s.setMood)
  const tags = useEditor((s) => s.tags)
  const setTags = useEditor((s) => s.setTags)
  const date = useEditor((s) => s.date)

  const [draft, setDraft] = useState('')
  const [known, setKnown] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    void allTags().then((list) => setKnown(list.map((t) => t.tag)))
  }, [open])

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, '').toLowerCase().slice(0, 24)
    if (!tag || tags.includes(tag)) { setDraft(''); return }
    setTags([...tags, tag])
    setDraft('')
  }

  const suggestions = [...new Set([...known, ...TAGS_SUGGESTED])]
    .filter((tag) => !tags.includes(tag))
    .slice(0, 12)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="About this page"
      subtitle={`${weekdayName(date)}, ${formatLong(date)}`}
      footer={<div className="flex justify-end"><button type="button" className="btn-primary" onClick={onClose}>Done</button></div>}
    >
      <Field label="Title" hint="Optional. Shown in the library and in search.">
        <input
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={weekdayName(date)}
          maxLength={80}
        />
      </Field>

      <div className="mb-5">
        <span className="label">Mood</span>
        <div role="radiogroup" aria-label="Mood" className="flex gap-2 flex-wrap">
          {MOODS.map((option) => {
            const active = option.id === mood
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMood(active ? null : (option.id as MoodId))}
                className={`tap flex-col gap-1 px-3 py-2 rounded-xl border transition-all duration-150 ease-spring
                  ${active
                    ? 'border-ink bg-sunk scale-105'
                    : 'border-rule hover:border-ink-faint'}`}
              >
                <span className="w-7 h-7 rounded-full" style={{ background: option.color }} />
                <span className="text-xs text-ink-soft">{option.label}</span>
              </button>
            )
          })}
        </div>
        {mood && (
          <button type="button" className="btn-ghost mt-1.5 text-sm" onClick={() => setMood(null)}>
            Clear mood
          </button>
        )}
      </div>

      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-sunk text-sm">
              #{tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="tap !min-w-[28px] !min-h-[28px] rounded-full text-ink-faint hover:text-terracotta-deep"
              >
                <Icon name="close" size={14} title={`Remove tag ${tag}`} />
              </button>
            </span>
          ))}
        </div>
        <input
          className="field"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              addTag(draft)
            }
            if (event.key === 'Backspace' && !draft && tags.length) {
              setTags(tags.slice(0, -1))
            }
          }}
          onBlur={() => draft && addTag(draft)}
          placeholder="travel, family…"
          aria-label="Add a tag"
        />
      </Field>

      {suggestions.length > 0 && (
        <div>
          <span className="label">Suggestions</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="px-2.5 py-1.5 rounded-full border border-rule text-sm text-ink-soft
                  hover:border-ink-faint hover:text-ink transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  )
}
