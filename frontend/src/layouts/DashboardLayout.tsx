import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import type { User } from '@supabase/supabase-js'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate('/login', { replace: true })
      } else {
        setUser(data.user)
      }
    })
  }, [navigate])

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
      <Sidebar />
      <main className="ml-64 print:ml-0 flex-1 min-h-screen">
        <Outlet context={{ user }} />
      </main>
    </div>
  )
}
