'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { useSupabaseSession } from './components/SessionProvider'

type SongStatus = 'confident' | 'known' | 'learning' | 'wishlist' | string

interface SongRow {
  id: string
  status: SongStatus
}

export default function Home() {
  const { loading: loadingSession, session } = useSupabaseSession()
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [songs, setSongs] = useState<SongRow[]>([])

  useEffect(() => {
    const fetchSongs = async () => {
      if (!session?.user?.id) {
        setSongs([])
        return
      }

      setLoadingSongs(true)
      const { data, error } = await supabase
        .from('songs')
        .select('id,status')
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error fetching songs:', error)
        setSongs([])
      } else {
        setSongs((data as SongRow[]) || [])
      }
      setLoadingSongs(false)
    }

    fetchSongs()
  }, [session])

  const { totalCount, confidentCount, learningCount, wishlistCount, confidencePct } = useMemo(() => {
    const total = songs.length
    const confident = songs.filter(
      song => song.status === 'known' || song.status === 'confident'
    ).length
    const learning = songs.filter(song => song.status === 'learning').length
    const wishlist = songs.filter(song => song.status === 'wishlist').length
    const pct = total > 0 ? Math.round((confident / total) * 100) : 0

    return {
      totalCount: total,
      confidentCount: confident,
      learningCount: learning,
      wishlistCount: wishlist,
      confidencePct: pct
    }
  }, [songs])

  if (loadingSession) {
    return (
      <div className="page flex items-center justify-center min-h-screen">
        <main className="card p-8 w-full max-w-xl text-center">
          <p className="muted">Loading...</p>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div
        className="relative flex flex-col min-h-screen overflow-hidden"
      >
        {/* Top nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 pt-8 pb-4">
          <span
            className="font-bold tracking-tight select-none"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.6rem',
              color: 'var(--accent)',
              letterSpacing: '-0.02em',
            }}
          >
            Grooves
          </span>
          <a
            href="/auth?mode=signin"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            Sign in
          </a>
        </nav>

        {/* Hero */}
        <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 text-center" style={{ paddingBottom: '6rem' }}>
          <h1
            className="font-bold tracking-tight leading-none mb-6"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(3rem, 8vw, 4.5rem)',
              color: '#fff',
              letterSpacing: '-0.03em',
              maxWidth: '820px',
            }}
          >
            Stop guessing<br />what you no.
          </h1>

          <p
            className="mb-12 leading-relaxed"
            style={{
              color: 'var(--text-muted)',
              fontSize: '1.125rem',
              maxWidth: '480px',
            }}
          >
            Grooves is a music brian you can actaully use — keep your repertwah organised and your practise performance-ready.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14 w-full" style={{ maxWidth: '820px' }}>
            {/* Card 1 — Practice Board */}
            <div
              className="card flex flex-col items-start gap-3 p-6 text-left"
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: '40px', height: '40px', background: 'rgba(245,185,66,0.12)' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: '#fff' }}>Practice Board</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A board that keeps you honest: Confident · Learning · Wishlist
              </p>
            </div>

            {/* Card 2 — Your Song Library */}
            <div
              className="card flex flex-col items-start gap-3 p-6 text-left"
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: '40px', height: '40px', background: 'rgba(245,185,66,0.12)' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: '#fff' }}>Your Song Library</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                One song = one home for notes, links, PDFs, and recordings
              </p>
            </div>

            {/* Card 3 — Setlists */}
            <div
              className="card flex flex-col items-start gap-3 p-6 text-left"
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ width: '40px', height: '40px', background: 'rgba(245,185,66,0.12)' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <circle cx="3" cy="6" r="1" fill="var(--accent)" stroke="none" />
                  <circle cx="3" cy="12" r="1" fill="var(--accent)" stroke="none" />
                  <circle cx="3" cy="18" r="1" fill="var(--accent)" stroke="none" />
                </svg>
              </div>
              <p className="font-semibold text-sm" style={{ color: '#fff' }}>Setlists</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Setlists built in minutes for rehearsal or gigs
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <a
              href="/auth?mode=signup"
              className="inline-flex items-center justify-center font-bold rounded-full transition-all"
              style={{
                background: 'var(--accent)',
                color: '#0b0e11',
                fontSize: '1rem',
                padding: '0.875rem 3rem',
                letterSpacing: '0.01em',
                boxShadow: '0 0 32px rgba(245,185,66,0.25)',
              }}
            >
              Create account
            </a>
            <a
              href="/auth?mode=signin"
              className="text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Already have an account?{' '}
              <span style={{ color: 'var(--accent)' }}>Sign in</span>
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card p-6 mb-6">
        <p className="label mb-2">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Your Snapshot</h1>
        <p className="muted mb-4">Confidence % based on songs marked as known.</p>

        <div className="mb-5">
          <p className="label [[data-mode='light']_&]:text-gray-500">Confidence %</p>
          <p className="text-5xl font-semibold tracking-tight">{confidencePct}%</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="card p-3">
            <p className="label [[data-mode='light']_&]:text-gray-500">Total Songs</p>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </div>
          <div className="card p-3">
            <p className="label [[data-mode='light']_&]:text-gray-500">Confident (known)</p>
            <p className="text-2xl font-semibold">{confidentCount}</p>
          </div>
          <div className="card p-3">
            <p className="label [[data-mode='light']_&]:text-gray-500">Learning</p>
            <p className="text-2xl font-semibold">{learningCount}</p>
          </div>
          <div className="card p-3">
            <p className="label [[data-mode='light']_&]:text-gray-500">Wishlist</p>
            <p className="text-2xl font-semibold">{wishlistCount}</p>
          </div>
        </div>

        {(!loadingSongs && totalCount === 0) && (
          <p className="muted mb-5">
            Add your first songs to start tracking your progress here. As you mark songs known, learning, or wishlist, this snapshot updates automatically.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link className="button-primary w-40 text-center" href="/songs">
            Go To Your Song Board
          </Link>
          <Link className="button-ghost w-40 text-center [[data-mode='light']_&]:border-gray-400" href="/songs?add=1">
            Add Song
          </Link>
          <Link className="button-ghost w-40 text-center [[data-mode='light']_&]:border-gray-400" href="/setlists">
            Setlists
          </Link>
        </div>
      </div>
    </div>
  )
}
