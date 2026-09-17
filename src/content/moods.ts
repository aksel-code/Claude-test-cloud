import type { MoodId } from '@/lib/types'

/**
 * Five moods, illustrated rather than scored. Deliberately no numeric scale in
 * the UI — "how was today" is not a metric. `weight` exists only to give the
 * mood-over-time chart a stable vertical order.
 */
export interface MoodSpec {
  id: MoodId
  label: string
  /** Plain-language description used for the mood chart's accessible summary. */
  blurb: string
  color: string
  /** Deeper variant, safe behind white text. */
  deep: string
  weight: number
}

/**
 * Chart marks use a different step from the stickers.
 *
 * The brand palette is muted on purpose, and muted colours do not work as a
 * five-way categorical encoding: validated against the cream surface, calm and
 * meh sit only ~5-7 Delta E apart, which is hard to separate even with full
 * colour vision. Rather than loudening the whole product to suit one chart, the
 * mood view stops using colour as the identity channel — every mood gets its
 * own permanently-labelled row, so colour is reinforcement and position is the
 * encoding. These steps are then chosen purely for contrast against the
 * surface (all clear 3:1 in both themes).
 */
export function moodChartColor(mood: MoodSpec, dark: boolean): string {
  return dark ? mood.color : CHART_DEEP[mood.id]
}

const CHART_DEEP: Record<MoodId, string> = {
  bright: '#B07A10',
  calm: '#5A7257',
  meh: '#6E6355',
  heavy: '#4A6986',
  stormy: '#A44C32',
}

export const MOODS: MoodSpec[] = [
  { id: 'bright',  label: 'Bright',  blurb: 'a good one',        color: '#D9A441', deep: '#8C6414', weight: 5 },
  { id: 'calm',    label: 'Calm',    blurb: 'steady and quiet',  color: '#8FA58A', deep: '#5A7257', weight: 4 },
  { id: 'meh',     label: 'Meh',     blurb: 'somewhere in between', color: '#B9AE9B', deep: '#6E6355', weight: 3 },
  { id: 'heavy',   label: 'Heavy',   blurb: 'a hard day',        color: '#7D98B3', deep: '#4A6986', weight: 2 },
  { id: 'stormy',  label: 'Stormy',  blurb: 'a lot at once',     color: '#C8674A', deep: '#A44C32', weight: 1 },
]

const byId = new Map(MOODS.map((m) => [m.id, m]))
export function getMood(id: MoodId | null | undefined): MoodSpec | null {
  return id ? byId.get(id) ?? null : null
}
