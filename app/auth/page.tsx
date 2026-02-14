'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

export default function AuthPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const initialMode = useMemo(() => {
    const modeParam = searchParams.get('mode')
    return modeParam === 'signup' ? 'signup' : 'signin'
  }, [searchParams])
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    checkSession()

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (!email.trim() || !password.trim()) {
      setMessage('Please enter an email and password.')
      return
    }
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        }
      })
      if (error) {
        setMessage(`Error: ${error.message}`)
      } else if (data.user) {
        setMessage('✅ Account created. You can now sign in.')
        setMode('signin')
      }
      return
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage(`✅ Logged in as ${data.user?.email ?? email}`)
      router.push('/')
    }
  }
  return (
    <div className="page">
      <div className="card p-6 max-w-md mx-auto">
        <p className="label mb-2">Access</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-4">
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </h1>
      {!session ? (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="input w-full mb-4"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="input w-full mb-4"
          />
          <button type="submit" className="button-primary">
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          <button
            type="button"
            className="button-ghost mt-3 w-full"
            onClick={() => {
              setMode(prev => (prev === 'signup' ? 'signin' : 'signup'))
              setMessage('')
            }}
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create account'}
          </button>
        </form>
      ) : (
        <div>
          <p>✅ Logged in as {session.user.email}</p>
          <p className="muted mt-2">You can now navigate to your songs page.</p>
        </div>
      )}
      {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  )
}
