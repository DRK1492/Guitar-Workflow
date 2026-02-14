'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import UserMenu from './UserMenu'

export default function AppHeader() {
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!loading && pathname === '/' && !session) {
    return null
  }

  const hideTopNav = pathname === '/' && Boolean(session)

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-brand">
          Gruves
        </Link>
        <div className="app-header-actions">
          {!hideTopNav && (
            <nav className="app-nav">
              <Link href="/songs" className="app-nav-link">
                <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                  <path
                    d="M5 6h14M5 12h14M5 18h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Songs
              </Link>
              <Link href="/setlists" className="app-nav-link">
                <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                  <path
                    d="M7 6h10M7 12h10M7 18h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Setlists
              </Link>
            </nav>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
