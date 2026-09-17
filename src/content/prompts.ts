/**
 * Writing prompts. Warm and specific, never a productivity nudge — no
 * "what did you accomplish", no scoring, nothing that implies a day was wasted.
 */
export const PROMPTS: string[] = [
  'What made you smile today?',
  'Describe a sound you heard today.',
  'What did you eat, and was it any good?',
  'Who did you talk to? What stuck with you?',
  'Where did you go, even if it was nowhere?',
  'What is something small you noticed?',
  'What colour was today?',
  'What are you looking forward to this week?',
  'Write down something you overheard.',
  'What did the sky look like?',
  "What's taking up room in your head?",
  'Name three things within arm’s reach.',
  'What did you put off, and is that alright?',
  'Describe today in exactly one sentence.',
  'What would you tell a friend about today?',
  'What is something you learned by accident?',
  'What did your hands do today?',
  'Is there a song stuck in your head?',
  'What do you want to remember about right now?',
  'What felt easier than it used to?',
  'Write a note to yourself in a month.',
  'What smelled good today?',
  'Which part of today would you happily repeat?',
  'What did you almost forget to notice?',
]

/** Rotates deterministically so the prompt changes but never feels random. */
export function promptForIndex(index: number): string {
  return PROMPTS[((index % PROMPTS.length) + PROMPTS.length) % PROMPTS.length]
}
