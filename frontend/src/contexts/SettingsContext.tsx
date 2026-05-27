import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createT } from '../lib/i18n'

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'vi' | 'fr' | 'zh'

interface Settings {
  theme: Theme
  language: Language
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  t: ReturnType<typeof createT>
}

const defaultT = createT('en')

const SettingsContext = createContext<Settings>({
  theme: 'system',
  language: 'en',
  setTheme: () => {},
  setLanguage: () => {},
  t: defaultT,
})

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system'
  )
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem('language') as Language) ?? 'en'
  )

  const applyTheme = (t: Theme) => {
    const resolved = resolveTheme(t)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }

  useEffect(() => {
    applyTheme(theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (theme === 'system') applyTheme('system') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
  }

  const setLanguage = (l: Language) => {
    setLanguageState(l)
    localStorage.setItem('language', l)
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t = useMemo(() => createT(language), [language])

  return (
    <SettingsContext.Provider value={{ theme, language, setTheme, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
export const useT = () => useContext(SettingsContext).t
