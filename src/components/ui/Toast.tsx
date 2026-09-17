import { create } from 'zustand'
import { useEffect } from 'react'
import { Icon, type IconName } from './Icon'

interface ToastItem {
  id: number
  message: string
  icon?: IconName
  tone: 'neutral' | 'good' | 'warn'
  action?: { label: string; run: () => void }
}

interface ToastState {
  items: ToastItem[]
  push: (message: string, opts?: Partial<Omit<ToastItem, 'id' | 'message'>>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToasts = create<ToastState>((set, get) => ({
  items: [],
  push: (message, opts = {}) => {
    const id = nextId++
    set({ items: [...get().items, { id, message, tone: 'neutral', ...opts }] })
    setTimeout(() => get().dismiss(id), opts.action ? 6500 : 3600)
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}))

export function toast(message: string, opts?: Parameters<ToastState['push']>[1]) {
  useToasts.getState().push(message, opts)
}

export function ToastHost() {
  const items = useToasts((s) => s.items)
  const dismiss = useToasts((s) => s.dismiss)

  // Announce politely: a toast is never the only place information lives.
  useEffect(() => {}, [items])

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-6 safe-b pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-center gap-3 max-w-[min(30rem,92vw)]
            pl-4 pr-2 py-2.5 rounded-full shadow-float border animate-fade-up
            ${item.tone === 'good' ? 'bg-sage-deep text-white border-sage-deep'
              : item.tone === 'warn' ? 'bg-terracotta-deep text-white border-terracotta-deep'
              : 'bg-ink text-page border-ink'}`}
        >
          {item.icon && <Icon name={item.icon} size={18} />}
          <span className="text-sm font-medium flex-1 min-w-0">{item.message}</span>
          {item.action && (
            <button
              type="button"
              className="tap px-3 text-sm font-semibold underline underline-offset-2 rounded-full"
              onClick={() => { item.action?.run(); dismiss(item.id) }}
            >
              {item.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="tap rounded-full opacity-70 hover:opacity-100"
          >
            <Icon name="close" size={16} title="Dismiss" />
          </button>
        </div>
      ))}
    </div>
  )
}
