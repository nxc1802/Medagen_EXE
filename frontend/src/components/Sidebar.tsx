import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useT } from '../contexts/SettingsContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const t = useT()

  const navItems = [
    { to: '/dashboard',      icon: 'add_circle',     label: t('nav.newDiagnosis') },
    { to: '/history',        icon: 'history',        label: t('nav.history') },
    { to: '/care-plan',      icon: 'account_circle', label: t('nav.carePlan') },
    { to: '/health-profile', icon: 'health_metrics', label: t('nav.healthProfile') },
  ]

  const bottomItems = [
    { to: '/help',     icon: 'help',     label: t('nav.help') },
    { to: '/settings', icon: 'settings', label: t('nav.settings') },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <aside className="print:hidden w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col fixed h-full z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary rounded-lg p-2 text-white">
          <span className="material-symbols-outlined text-2xl">health_metrics</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-none">MedaGen</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('nav.subtitle')}</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {bottomItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </aside>
  )
}
