'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music, ListMusic } from 'lucide-react'
import UserMenu from './UserMenu'
import { useSupabaseSession } from './SessionProvider'

export default function AppHeader() {
  const pathname = usePathname()
  const { loading, session } = useSupabaseSession()

  if (!loading && pathname === '/' && !session) {
    return null
  }

  const hideTopNav = pathname === '/' && Boolean(session)

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href="/" className="app-brand">
          Grooves
        </Link>
        <div className="app-header-actions">
          {!hideTopNav && (
            <nav className="app-nav">
              <Link href="/songs" className="app-nav-link">
                <Music size={16} />
                Songs
              </Link>
              <Link href="/setlists" className="app-nav-link">
                <ListMusic size={16} />
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
