'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const isPublicPath = (pathname: string) => pathname === '/' || pathname.startsWith('/auth')

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      const session = data.session
      const isPublic = isPublicPath(pathname)

      if (!session && !isPublic) {
        router.replace('/')
      } else if (session && pathname.startsWith('/auth')) {
        router.replace('/')
      }

      setChecking(false)
    }

    checkAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAuth()
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [pathname, router])

  if (checking) return null

  return <>{children}</>
}
