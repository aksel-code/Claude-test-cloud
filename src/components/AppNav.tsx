import { NavLink } from 'react-router-dom'
import { Icon, type IconName } from './ui/Icon'
import { useSettings } from '@/store/settings'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Library', icon: 'book' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

/**
 * Bottom tab bar on phones, a quiet rail on desktop. Deliberately only four
 * destinations — the library is the app, everything else is a way back into it.
 */
export function AppNav() {
  const streak = useSettings((s) => s.streak)

  return (
    <>
      {/* Mobile: fixed bottom bar, above the home indicator. */}
      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-page/92 backdrop-blur-md
          border-t border-rule safe-b"
      >
        <ul className="flex">
          {ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `tap w-full flex-col gap-0.5 py-2 text-[11px] font-medium rounded-lg
                   ${isActive ? 'text-terracotta-deep' : 'text-ink-faint'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} size={22} strokeWidth={isActive ? 2 : 1.7} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop: a narrow rail that never competes with the page content. */}
      <nav
        aria-label="Main"
        className="hidden md:flex flex-col w-[76px] shrink-0 border-r border-rule
          bg-surface/50 py-5 items-center gap-1 sticky top-0 h-dvh"
      >
        <div className="mb-4 w-10 h-10 grid place-items-center" aria-hidden="true">
          <svg viewBox="0 0 512 512" className="w-9 h-9">
            <rect x="30" y="30" width="452" height="452" rx="104" fill="#E8DFCD" opacity=".55"/>
            <rect x="130" y="118" width="236" height="300" rx="6" fill="#E8DFCD" transform="rotate(-7 248 268)" />
            <rect x="144" y="108" width="236" height="300" rx="6" fill="#FFFDF8" transform="rotate(3.5 262 258)" />
            <rect x="106" y="118" width="180" height="44" fill="#8FA58A" opacity=".85" transform="rotate(-24 196 140)" />
            <rect x="343" y="109" width="46" height="210" fill="#C8674A" transform="rotate(3.5 366 214)" />
          </svg>
        </div>

        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={item.label}
            className={({ isActive }) =>
              `tap flex-col gap-1 w-14 py-2 rounded-xl text-[10px] font-medium transition-colors
               ${isActive
                 ? 'bg-sunk text-terracotta-deep'
                 : 'text-ink-faint hover:text-ink hover:bg-sunk/60'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={22} strokeWidth={isActive ? 2 : 1.7} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {streak > 1 && (
          <div
            className="mt-auto flex flex-col items-center gap-0.5 text-mustard-deep"
            title={`${streak} days in a row`}
          >
            <Icon name="flame" size={20} />
            <span className="text-xs font-semibold tabular-nums">{streak}</span>
          </div>
        )}
      </nav>
    </>
  )
}
