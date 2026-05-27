import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSettings, useT, type Theme, type Language } from '../contexts/SettingsContext'
import type { User } from '@supabase/supabase-js'

const THEME_VALUES: { value: Theme; icon: string; labelKey: 'settings.light' | 'settings.dark' | 'settings.system'; descKey: 'settings.lightDesc' | 'settings.darkDesc' | 'settings.systemDesc' }[] = [
  { value: 'light',  icon: 'light_mode', labelKey: 'settings.light',  descKey: 'settings.lightDesc' },
  { value: 'dark',   icon: 'dark_mode',  labelKey: 'settings.dark',   descKey: 'settings.darkDesc' },
  { value: 'system', icon: 'computer',   labelKey: 'settings.system', descKey: 'settings.systemDesc' },
]

const LANGUAGES: { value: Language; flag: string; native: string; labelKey: string }[] = [
  { value: 'en', flag: '🇺🇸', native: 'English',    labelKey: 'English' },
  { value: 'vi', flag: '🇻🇳', native: 'Tiếng Việt', labelKey: 'Vietnamese' },
  { value: 'fr', flag: '🇫🇷', native: 'Français',   labelKey: 'French' },
  { value: 'zh', flag: '🇨🇳', native: '中文',        labelKey: 'Chinese' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">{children}</p>
}

function SectionTitle({ icon, iconBg, title }: { icon: string; iconBg: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`size-10 rounded-xl ${iconBg} flex items-center justify-center text-white shadow-sm`}>
        <span className="material-symbols-outlined text-sm">{icon}</span>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
    </div>
  )
}

const inputCls = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400'

function StatusBanner({ msg }: { msg: { type: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null
  const ok = msg.type === 'ok'
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
      ok
        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/30'
        : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/30'
    }`}>
      <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
        ok ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-red-100 dark:bg-red-900/40'
      }`}>
        <span className={`material-symbols-outlined text-sm ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {ok ? 'check_circle' : 'error'}
        </span>
      </div>
      <p className={ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
        {msg.text}
      </p>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { theme, language, setTheme, setLanguage } = useSettings()
  const t = useT()

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        setDisplayName(data.user.user_metadata?.full_name || data.user.user_metadata?.name || '')
      }
      setLoadingUser(false)
    })
  }, [])

  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const flash = (
    setter: (m: { type: 'ok' | 'err'; text: string } | null) => void,
    type: 'ok' | 'err',
    text: string,
  ) => {
    setter({ type, text })
    setTimeout(() => setter(null), 4000)
  }

  const handleSaveProfile = async () => {
    setProfileSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } })
    setProfileSaving(false)
    if (error) flash(setProfileMsg, 'err', error.message)
    else flash(setProfileMsg, 'ok', 'Display name updated successfully.')
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      flash(setPasswordMsg, 'err', 'Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      flash(setPasswordMsg, 'err', 'Passwords do not match.')
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) flash(setPasswordMsg, 'err', error.message)
    else {
      flash(setPasswordMsg, 'ok', 'Password changed successfully.')
      setNewPassword(''); setConfirmPassword('')
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail.includes('@')) {
      flash(setEmailMsg, 'err', 'Please enter a valid email address.')
      return
    }
    setEmailSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setEmailSaving(false)
    if (error) flash(setEmailMsg, 'err', error.message)
    else flash(setEmailMsg, 'ok', 'Confirmation link sent to ' + newEmail + '. Please verify.')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <>
      {/* ── Sticky header ── */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">settings</span>
          <h2 className="text-xl font-bold tracking-tight">{t('settings.title')}</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
          {t('settings.version')}
        </span>
      </header>

      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary px-8 py-10">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white translate-x-24 -translate-y-24" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white -translate-x-12 translate-y-12" />
        </div>
        <div className="relative max-w-3xl mx-auto flex items-center gap-6">
          <div className="size-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-black text-white">{initials}</span>
          </div>
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{t('settings.heroLabel')}</p>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
              {loadingUser ? '...' : displayName || 'Your Account'}
            </h1>
            <p className="text-white/70 text-sm mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-12">

        {/* ── 1. Appearance ── */}
        <section>
          <SectionLabel>{t('settings.prefLabel')}</SectionLabel>
          <SectionTitle icon="palette" iconBg="bg-primary" title={t('settings.appearance')} />
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('settings.themeLabel')}</p>
            <div className="grid grid-cols-3 gap-3">
              {THEME_VALUES.map(th => (
                <button
                  key={th.value}
                  onClick={() => setTheme(th.value)}
                  className={`flex flex-col items-center gap-2 py-5 px-3 rounded-xl border-2 transition-all ${
                    theme === th.value
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary/30'
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${theme === th.value ? 'text-primary' : 'text-slate-400'}`}>
                    {th.icon}
                  </span>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${theme === th.value ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                      {t(th.labelKey)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{t(th.descKey)}</p>
                  </div>
                  {theme === th.value && (
                    <span className="size-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[12px]">check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. Language ── */}
        <section>
          <SectionLabel>{t('settings.locLabel')}</SectionLabel>
          <SectionTitle icon="language" iconBg="bg-violet-500" title={t('settings.language')} />
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('settings.langLabel')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LANGUAGES.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 transition-all ${
                    language === l.value
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-violet-300'
                  }`}
                >
                  <span className="text-2xl">{l.flag}</span>
                  <div className="text-center">
                    <p className={`text-xs font-bold ${language === l.value ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {l.native}
                    </p>
                    <p className="text-[10px] text-slate-400">{l.labelKey}</p>
                  </div>
                  {language === l.value && (
                    <span className="size-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[10px]">check</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">info</span>
              {t('settings.langNote')}
            </p>
          </div>
        </section>

        {/* ── 3. Profile ── */}
        <section>
          <SectionLabel>{t('settings.accLabel')}</SectionLabel>
          <SectionTitle icon="person" iconBg="bg-emerald-500" title={t('settings.profile')} />
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center gap-5 p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl font-black text-primary">{initials}</span>
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{displayName || 'No name set'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.displayName')}</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={t('settings.namePh')}
                  className={inputCls}
                />
              </div>
              <StatusBanner msg={profileMsg} />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                >
                  {profileSaving
                    ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> {t('action.saving')}</>
                    : <><span className="material-symbols-outlined text-sm">save</span> {t('settings.saveProfile')}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. Security ── */}
        <section>
          <SectionLabel>{t('settings.security')}</SectionLabel>
          <SectionTitle icon="lock" iconBg="bg-amber-500" title={t('settings.security')} />
          <div className="space-y-4">

            {/* Change Email */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100 mb-0.5">{t('settings.changeEmail')}</p>
                <p className="text-xs text-slate-400">A confirmation link will be sent to the new address.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.newEmail')}</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder={user?.email || 'new@example.com'}
                  className={inputCls}
                />
              </div>
              <StatusBanner msg={emailMsg} />
              <div className="flex justify-end">
                <button
                  onClick={handleChangeEmail}
                  disabled={emailSaving || !newEmail}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors disabled:opacity-40 shadow-sm shadow-amber-500/20"
                >
                  {emailSaving
                    ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Sending...</>
                    : <><span className="material-symbols-outlined text-sm">mail</span> {t('settings.sendLink')}</>
                  }
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mb-0.5">{t('settings.changePw')}</p>
                  <p className="text-xs text-slate-400">Minimum 8 characters.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswords(v => !v)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">{showPasswords ? 'visibility_off' : 'visibility'}</span>
                  {showPasswords ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.newPw')}</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={inputCls}
                  />
                  {newPassword && <PasswordStrength password={newPassword} />}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('settings.confirmPw')}</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className={inputCls}
                    />
                    {confirmPassword && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm ${
                        confirmPassword === newPassword ? 'text-emerald-500' : 'text-red-400'
                      }`}>
                        {confirmPassword === newPassword ? 'check_circle' : 'cancel'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <StatusBanner msg={passwordMsg} />
              <div className="flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={passwordSaving || !newPassword || !confirmPassword}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-colors disabled:opacity-40 shadow-sm shadow-primary/20"
                >
                  {passwordSaving
                    ? <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Updating...</>
                    : <><span className="material-symbols-outlined text-sm">lock_reset</span> {t('settings.updatePw')}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Account ── */}
        <section>
          <SectionLabel>Account Actions</SectionLabel>
          <SectionTitle icon="manage_accounts" iconBg="bg-slate-500" title={t('settings.accountMgmt')} />
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{t('settings.signOut')}</p>
                <p className="text-xs text-slate-400 mt-0.5">Sign out of your account on this device.</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-sm hover:border-red-300 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                {t('settings.signOut')}
              </button>
            </div>
            <div className="flex items-center justify-between p-6">
              <div>
                <p className="font-bold text-sm text-red-600 dark:text-red-400">{t('settings.deleteAcct')}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t('settings.deleteDesc')}</p>
              </div>
              <button
                onClick={() => alert('Please contact support to delete your account.')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-red-200 dark:border-red-900/40 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete_forever</span>
                Delete
              </button>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-slate-400 pb-4">
          {t('settings.footer')}
        </p>

      </div>
    </>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const config = [
    { label: 'Weak',   color: 'bg-red-500' },
    { label: 'Fair',   color: 'bg-orange-400' },
    { label: 'Good',   color: 'bg-amber-400' },
    { label: 'Strong', color: 'bg-emerald-500' },
  ][score - 1] ?? { label: 'Weak', color: 'bg-red-500' }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= score ? config.color : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      <p className="text-xs text-slate-400">Strength: <span className={`font-semibold ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-amber-500' : 'text-emerald-500'}`}>{config.label}</span></p>
    </div>
  )
}
