'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type SongStatus = 'confident' | 'known' | 'learning' | 'wishlist' | string

interface SongRow {
  id: string
  status: SongStatus
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [songs, setSongs] = useState<SongRow[]>([])

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoadingSession(false)
    }

    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoadingSession(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

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
      <div className="page flex items-center justify-center min-h-screen">
        <main className="card p-8 w-full max-w-3xl text-center">
          <div className="mx-auto max-w-lg">
          <h1 className="text-3xl font-semibold tracking-tight">
            Stop guessing what you know.
          </h1>
          <div className="mx-auto max-w-xl mt-4">
            <p className="muted leading-relaxed">
              Gruves is a music brain you can actually use — keep your repertoire organized and
              your practice performance-ready.
            </p>
          </div>
          <div className="mx-auto max-w-2xl mt-5 pt-4 border-t border-[var(--border)] text-left">
            <p className="label mb-3">What you get</p>
            <ul className="muted space-y-3">
                <li className="flex items-start gap-2 text-sm md:whitespace-nowrap">
                  <svg viewBox="0 0 24 24" className="icon mt-0.5" aria-hidden="true">
                    <path
                      d="M5 12l4 4 10-10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                </svg>
                <span>One song = one home for notes, links, PDFs, and recordings</span>
              </li>
              <li className="flex items-start gap-2 text-sm md:whitespace-nowrap">
                <svg viewBox="0 0 24 24" className="icon mt-0.5" aria-hidden="true">
                    <path
                      d="M5 12l4 4 10-10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                </svg>
                <span>A board that keeps you honest: Confident • Learning • Wishlist</span>
              </li>
              <li className="flex items-start gap-2 text-sm md:whitespace-nowrap">
                <svg viewBox="0 0 24 24" className="icon mt-0.5" aria-hidden="true">
                    <path
                      d="M5 12l4 4 10-10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                </svg>
                <span>Setlists built in minutes for rehearsal or gigs</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-7">
          <a className="button-primary w-40 text-center" href="/auth?mode=signup">
            Create account
          </a>
          <a className="button-ghost w-40 text-center" href="/auth?mode=signin">
            Sign in
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
          <p className="label">Confidence %</p>
          <p className="text-5xl font-semibold tracking-tight">{confidencePct}%</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="card p-3">
            <p className="label">Total Songs</p>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </div>
          <div className="card p-3">
            <p className="label">Confident (known)</p>
            <p className="text-2xl font-semibold">{confidentCount}</p>
          </div>
          <div className="card p-3">
            <p className="label">Learning</p>
            <p className="text-2xl font-semibold">{learningCount}</p>
          </div>
          <div className="card p-3">
            <p className="label">Wishlist</p>
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
          <Link className="button-ghost w-40 text-center" href="/songs?add=1">
            Add Song
          </Link>
          <Link className="button-ghost w-40 text-center" href="/setlists">
            Setlists
          </Link>
        </div>
      </div>
    </div>
  )
}
