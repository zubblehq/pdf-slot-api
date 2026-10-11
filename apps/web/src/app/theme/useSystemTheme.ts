import { useEffect, useState } from 'react'

/**
 * Follows the operating system's light/dark preference, as a class on
 * `<html>`.
 *
 * Standalone only. Inside elli-ui this is replaced by their theme switcher
 * (`next-themes`, four themes, the class set on `<html>` the same way), which
 * is why this writes a class rather than inlining colours: the mechanism is
 * theirs, only the source of the decision differs.
 *
 * Returns the resolved theme so a component that cannot read CSS -- sonner's
 * toaster takes its theme as a prop -- can be told.
 */
export function useSystemTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
  )

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => setTheme(query.matches ? 'dark' : 'light')
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return theme
}
