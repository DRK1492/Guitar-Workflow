'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'

interface Song {
  id: string
  title: string
  artist: string
  status: string
  isPending?: boolean
  song_genres?: SongGenre[]
}

interface Genre {
  id: string
  name: string
}

interface Setlist {
  id: string
  name: string
}

interface SongGenre {
  genre_id: string
  genres: {
    name: string
  } | null
}

export default function SongsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [status, setStatus] = useState('')
  const [genres, setGenres] = useState<Genre[]>([])
  const [newGenreName, setNewGenreName] = useState('')
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [genreLimitError, setGenreLimitError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGenreId, setFilterGenreId] = useState('all')
  const [filterArtist, setFilterArtist] = useState('all')
  const [formError, setFormError] = useState('')
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [newSetlistName, setNewSetlistName] = useState('')
  const [setlistError, setSetlistError] = useState('')
  const [draggingSongId, setDraggingSongId] = useState<string | null>(null)
  const [dragOverSetlistId, setDragOverSetlistId] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [openMenuSongId, setOpenMenuSongId] = useState<string | null>(null)
  const [undoDelete, setUndoDelete] = useState<{
    song: Song
    index: number
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('gt_onboarded') !== '1'
  })
  const [showAddSongModal, setShowAddSongModal] = useState(false)

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch songs for current user
  useEffect(() => {
    const fetchSongs = async () => {
      if (!session) return
      const { data, error } = await supabase
        .from('songs')
        .select('*, song_genres(genre_id, genres(name))')
        .eq('user_id', session.user.id)
      if (error) console.log(error)
      else setSongs(data as Song[])
      setLoading(false)
    }
    fetchSongs()
  }, [session])

  useEffect(() => {
    const fetchGenres = async () => {
      if (!session) return
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })
      if (error) console.log(error)
      else setGenres(data as Genre[])
    }
    fetchGenres()
  }, [session])

  useEffect(() => {
    const fetchSetlists = async () => {
      if (!session) return
      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })
      if (error) console.log(error)
      else setSetlists(data as Setlist[])
    }
    fetchSetlists()
  }, [session])

  useEffect(() => {
    return () => {
      if (undoDelete?.timeoutId) clearTimeout(undoDelete.timeoutId)
    }
  }, [undoDelete])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.menu-container')) return
      setOpenMenuSongId(null)
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setFormError('')
    setShowAddSongModal(true)

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('add')
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }, [searchParams, pathname, router])

  const dismissOnboarding = () => {
    window.localStorage.setItem('gt_onboarded', '1')
    setShowOnboarding(false)
  }

  const handleAddSetlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !newSetlistName.trim()) return
    setSetlistError('')
    const { data, error } = await supabase
      .from('setlists')
      .insert([{ user_id: session.user.id, name: newSetlistName.trim() }])
      .select()
      .single()
    if (error) {
      console.log('Error adding setlist:', error)
      setSetlistError('Could not add setlist. Try a different name.')
      return
    }
    if (data) {
      setSetlists(prev => [...prev, data as Setlist].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSetlistName('')
    }
  }

  const handleAddGenre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || !newGenreName.trim()) return
    setFormError('')
    const { data, error } = await supabase
      .from('genres')
      .insert([{ user_id: session.user.id, name: newGenreName.trim() }])
      .select()
      .single()
    if (error) {
      console.log('Error adding genre:', error)
      setFormError('Could not add genre. Try a different name.')
      return
    }
    if (data) {
      setGenres(prev => [...prev, data as Genre].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedGenreIds(prev => {
        if (prev.includes((data as Genre).id)) return prev
        if (prev.length >= 3) {
          setGenreLimitError('Maximum 3 genres allowed.')
          return prev
        }
        setGenreLimitError('')
        return [...prev, (data as Genre).id]
      })
      setNewGenreName('')
    }
  }

  const toggleGenre = (genreId: string) => {
    setSelectedGenreIds(prev => {
      if (prev.includes(genreId)) {
        setGenreLimitError('')
        return prev.filter(id => id !== genreId)
      }
      if (prev.length >= 3) {
        setGenreLimitError('Maximum 3 genres allowed.')
        return prev
      }
      setGenreLimitError('')
      return [...prev, genreId]
    })
  }

  const handleDragStart = (songId: string) => {
    setDraggingSongId(songId)
  }

  const handleDragEnd = () => {
    setDraggingSongId(null)
    setDragOverSetlistId(null)
  }

  const handleDropOnSetlist = async (setlistId: string) => {
    if (!session?.user?.id || !draggingSongId) return
    const { data: lastItem } = await supabase
      .from('setlist_songs')
      .select('position')
      .eq('setlist_id', setlistId)
      .eq('user_id', session.user.id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = (lastItem?.[0]?.position ?? -1) + 1
    const { error } = await supabase.from('setlist_songs').insert({
      setlist_id: setlistId,
      song_id: draggingSongId,
      user_id: session.user.id,
      position: nextPosition
    })
    if (error) {
      console.log('Error adding songs to setlist:', error)
      return
    }
    setDraggingSongId(null)
    setDragOverSetlistId(null)
  }

  const updateSongStatus = async (
    songId: string,
    nextStatus: 'confident' | 'learning' | 'wishlist'
  ) => {
    setSongs(prev => prev.map(song => (song.id === songId ? { ...song, status: nextStatus } : song)))
    const { error } = await supabase.from('songs').update({ status: nextStatus }).eq('id', songId)
    if (error) {
      console.log('Error updating song status:', error)
    }
  }

  // Add new song (Optimistic Update)
  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return false
    setFormError('')
    if (!status) {
      setFormError('Please choose a status.')
      return false
    }

    const normalizedTitle = title.trim().toLowerCase()
    const normalizedArtist = artist.trim().toLowerCase()
    const genreIdsForNewSong = [...selectedGenreIds]
    const duplicate = songs.find(song => {
      const songTitle = song.title?.trim().toLowerCase()
      const songArtist = (song.artist || '').trim().toLowerCase()
      return songTitle === normalizedTitle && songArtist === normalizedArtist
    })
    if (duplicate) {
      const confirmAdd = window.confirm(
        'A song with this title and artist already exists. Add another anyway?'
      )
      if (!confirmAdd) {
        setFormError('Duplicate song detected. Not added.')
        return false
      }
    }

    // Optimistic UI update
    const tempSong: Song = {
      id: crypto.randomUUID(),
      title,
      artist,
      status,
      isPending: true
    }
    setSongs(prev => [...prev, tempSong])

    const { data, error } = await supabase
      .from('songs')
      .insert([
        {
          user_id: session.user.id,
          title,
          artist,
          status
        }
      ])
      .select()
      .single()

    let hasInsertError = false
    if (error) {
      console.log('Error adding song:', error)
      setFormError('Could not add song. Please try again.')
      hasInsertError = true
      // rollback optimistic update
      setSongs(prev => prev.filter(song => song.id !== tempSong.id))
    }

    if (data) {
      setSongs(prev => prev.map(song => (song.id === tempSong.id ? (data as Song) : song)))
    }

    let hasGenreError = false
    if (data && genreIdsForNewSong.length > 0) {
      const { error: genreError } = await supabase.from('song_genres').insert(
        genreIdsForNewSong.map(genreId => ({
          song_id: (data as Song).id,
          genre_id: genreId,
          user_id: session.user.id
        }))
      )
      if (genreError) {
        console.log('Error adding song genres:', genreError)
        setFormError('Song added, but genres failed to save.')
        hasGenreError = true
      } else {
        // Keep newly-added tile in sync without requiring a refetch.
        const hydratedGenres: SongGenre[] = genreIdsForNewSong.map(genreId => ({
          genre_id: genreId,
          genres: {
            name: genres.find(g => g.id === genreId)?.name ?? 'Unknown'
          }
        }))
        setSongs(prev =>
          prev.map(song =>
            song.id === (data as Song).id ? { ...song, song_genres: hydratedGenres } : song
          )
        )
      }
    }

    setTitle('')
    setArtist('')
    setStatus('')
    setSelectedGenreIds([])
    setGenreLimitError('')
    return Boolean(data) && !hasInsertError && !hasGenreError
  }

  const finalizeDelete = async (id: string) => {
    if (!session) return
    const { data: files, error: filesError } = await supabase
      .from('song_files')
      .select('storage_path, file_url')
      .eq('song_id', id)
      .eq('user_id', session.user.id)

    if (filesError) console.log('Error fetching files for deletion:', filesError)

    if (files && files.length > 0) {
      const paths = files
        .map(file => file.storage_path ?? (file.file_url?.match(/\/song-pdfs\/(.+)$/)?.[1] ?? null))
        .filter((path): path is string => Boolean(path))
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('song-pdfs').remove(paths)
        if (storageError) console.log('Error deleting storage files:', storageError)
      }
    }

    const { data: audioFiles, error: audioFilesError } = await supabase
      .from('song_recordings')
      .select('storage_path, file_url')
      .eq('song_id', id)
      .eq('user_id', session.user.id)

    if (audioFilesError) console.log('Error fetching recordings for deletion:', audioFilesError)

    if (audioFiles && audioFiles.length > 0) {
      const paths = audioFiles
        .map(file => file.storage_path ?? (file.file_url?.match(/\/song-audio\/(.+)$/)?.[1] ?? null))
        .filter((path): path is string => Boolean(path))
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('song-audio').remove(paths)
        if (storageError) console.log('Error deleting recording files:', storageError)
      }
    }

    const { error } = await supabase.from('songs').delete().eq('id', id)
    if (error) console.log(error)
  }

  // Delete song with undo
  const handleDelete = async (id: string) => {
    if (!session) return
    const confirmDelete = window.confirm('Delete this song and all its files?')
    if (!confirmDelete) return

    if (undoDelete) {
      clearTimeout(undoDelete.timeoutId)
      await finalizeDelete(undoDelete.song.id)
      setUndoDelete(null)
    }

    const songIndex = songs.findIndex(song => song.id === id)
    const songToDelete = songs[songIndex]
    if (!songToDelete) return

    setSongs(prev => prev.filter(song => song.id !== id))

    const timeoutId = setTimeout(async () => {
      await finalizeDelete(id)
      setUndoDelete(null)
    }, 5000)

    setUndoDelete({ song: songToDelete, index: songIndex, timeoutId })
  }

  const handleUndoDelete = () => {
    if (!undoDelete) return
    clearTimeout(undoDelete.timeoutId)
    setSongs(prev => {
      const next = [...prev]
      next.splice(undoDelete.index, 0, undoDelete.song)
      return next
    })
    setUndoDelete(null)
  }

  // Navigate to song detail page
  const goToSong = (id: string) => {
    router.push(`/songs/${id}`)
  }

  const artistOptions = Array.from(
    new Set(
      songs
        .map(song => (song.artist || '').trim())
        .filter(name => name.length > 0)
        .map(name => name.toLowerCase())
    )
  )
    .map(lower => songs.find(s => s.artist?.toLowerCase() === lower)?.artist || lower)
    .sort((a, b) => a.localeCompare(b))

  const filteredSongs = songs.filter(song => {
    if (filterStatus !== 'all' && song.status !== filterStatus) return false
    if (filterGenreId !== 'all') {
      const genreMatch = (song.song_genres || []).some(g => g.genre_id === filterGenreId)
      if (!genreMatch) return false
    }
    if (filterArtist !== 'all') {
      const artistMatch = (song.artist || '').trim().toLowerCase() === filterArtist.toLowerCase()
      if (!artistMatch) return false
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      const titleMatch = song.title?.toLowerCase().includes(q)
      const artistMatch = song.artist?.toLowerCase().includes(q)
      if (!titleMatch && !artistMatch) return false
    }
    return true
  })

  const songsByStatus = {
    confident: filteredSongs.filter(song => song.status === 'confident'),
    learning: filteredSongs.filter(song => song.status === 'learning'),
    wishlist: filteredSongs.filter(song => song.status === 'wishlist')
  }

  return (
    <div className="page">
      {session && showOnboarding && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="label mb-2">Welcome</p>
                <h2 className="text-2xl font-semibold mb-2">Your library starts here</h2>
                <p className="muted">
                  Add a few songs, tag them with genres, and build your first setlist.
                </p>
              </div>
              <button type="button" className="button-ghost modal-close" onClick={dismissOnboarding}>
                Close
              </button>
            </div>
            <div className="grid gap-3">
              <div className="card-strong p-4">
                <p className="label mb-1">1. Add a song</p>
                <p className="text-sm muted">Use the form on this page to add your first song.</p>
              </div>
              <div className="card-strong p-4">
                <p className="label mb-1">2. Tag it</p>
                <p className="text-sm muted">Create a genre and assign it for quick filtering.</p>
              </div>
              <div className="card-strong p-4">
                <p className="label mb-1">3. Build a setlist</p>
                <p className="text-sm muted">Create a setlist and drag songs onto it.</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="button-primary" onClick={dismissOnboarding}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="page-header">
        <h1 className="text-3xl font-semibold tracking-tight">Your Song Board</h1>
        <button
          type="button"
          className="button-primary button-cta"
          onClick={() => {
            setFormError('')
            setShowAddSongModal(true)
          }}
        >
          Add Song
        </button>
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search title or artist..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input md:col-span-2"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input md:col-span-1"
          >
            <option value="all">All statuses</option>
            <option value="confident">Confident</option>
            <option value="learning">Learning</option>
            <option value="wishlist">Wishlist</option>
          </select>
          <select
            value={filterGenreId}
            onChange={e => setFilterGenreId(e.target.value)}
            className="input md:col-span-1"
          >
            <option value="all">All genres</option>
            {genres.map(genre => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <select
            value={filterArtist}
            onChange={e => setFilterArtist(e.target.value)}
            className="input md:col-span-1"
          >
            <option value="all">All artists</option>
            {artistOptions.map(artist => (
              <option key={artist} value={artist}>
                {artist}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setFilterStatus('all')
              setFilterGenreId('all')
              setFilterArtist('all')
            }}
            className="text-sm button-subtle"
          >
            Clear filters
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : songs.length === 0 ? (
        <div className="card p-6 text-center">
          <h2 className="text-xl font-semibold">Start by adding your first song</h2>
          <p className="muted mt-2">
            Try something like “Wish You Were Here” — Pink Floyd.
          </p>
          <div className="mt-4 mx-auto max-w-sm border border-dashed border-[var(--border)] rounded-lg p-4 text-left">
            <p className="label mb-2">Sample</p>
            <p className="font-semibold">Wish You Were Here</p>
            <p className="muted">Pink Floyd</p>
            <span className="badge mt-2">Learning</span>
          </div>
        </div>
      ) : filteredSongs.length > 0 ? (
        <div className="songs-board">
          {[
            {
              key: 'confident',
              title: 'Confident',
              songs: songsByStatus.confident,
              emptyCopy: 'Nothing here yet.'
            },
            {
              key: 'learning',
              title: 'Learning',
              songs: songsByStatus.learning,
              emptyCopy: 'Add something you’re working on.'
            },
            {
              key: 'wishlist',
              title: 'Wishlist',
              songs: songsByStatus.wishlist,
              emptyCopy: 'Capture songs you want to learn.'
            }
          ].map(column => (
            <section key={column.key} className="songs-col">
              <h2 className="songs-col-header">
                {column.title} ({column.songs.length})
              </h2>
              <div className="songs-col-body">
                {column.songs.length === 0 ? (
                  <div className="border border-dashed border-[var(--border)] rounded px-3 py-4 text-sm muted">
                    {column.emptyCopy}
                  </div>
                ) : (
                  column.songs.map(song => (
                    <article
                      key={song.id}
                      draggable
                      onDragStart={() => handleDragStart(song.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => goToSong(song.id)}
                      className="row row-clickable p-2 song-tile overflow-visible"
                    >
                      <div className="flex items-start justify-between gap-3 song-tile-top">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base truncate">{song.title}</h3>
                          <p className="text-sm muted">{song.artist || 'Unknown Artist'}</p>
                        </div>
                        <div className="menu-container">
                          <button
                            type="button"
                            className="button-ghost menu-trigger"
                            draggable={false}
                            onMouseDown={event => event.stopPropagation()}
                            onClick={event => {
                              event.stopPropagation()
                              setOpenMenuSongId(prev => (prev === song.id ? null : song.id))
                            }}
                            aria-label="Song menu"
                          >
                            •••
                          </button>
                          {openMenuSongId === song.id && (
                            <div
                              className="menu songs-tile-menu"
                              onClick={event => event.stopPropagation()}
                            >
                              {song.status !== 'confident' && (
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={async event => {
                                    event.stopPropagation()
                                    await updateSongStatus(song.id, 'confident')
                                    setOpenMenuSongId(null)
                                  }}
                                >
                                  Move to Confident
                                </button>
                              )}
                              {song.status !== 'learning' && (
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={async event => {
                                    event.stopPropagation()
                                    await updateSongStatus(song.id, 'learning')
                                    setOpenMenuSongId(null)
                                  }}
                                >
                                  Move to Learning
                                </button>
                              )}
                              {song.status !== 'wishlist' && (
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={async event => {
                                    event.stopPropagation()
                                    await updateSongStatus(song.id, 'wishlist')
                                    setOpenMenuSongId(null)
                                  }}
                                >
                                  Move to Wishlist
                                </button>
                              )}
                              <button
                                type="button"
                                className="menu-item menu-danger"
                                onClick={event => {
                                  event.stopPropagation()
                                  void handleDelete(song.id)
                                  setOpenMenuSongId(null)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {(song.song_genres || []).length > 0 ? (
                        <div className="song-genres-slot">
                          {(song.song_genres || []).slice(0, 3).map(g => (
                            <span key={g.genre_id} className="genre-pill">
                              {g.genres?.name ?? 'Unknown'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="song-genres-slot invisible" aria-hidden="true" />
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-center muted mt-4">No songs match your filters.</p>
      )}

      {showAddSongModal && (
        <div className="modal-backdrop" onClick={() => setShowAddSongModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold">Add a New Song</h2>
              <button
                type="button"
                className="button-ghost"
                onClick={() => setShowAddSongModal(false)}
              >
                Close
              </button>
            </div>
            <form
              onSubmit={async e => {
                const success = await handleAddSong(e)
                if (success) setShowAddSongModal(false)
              }}
              className="flex flex-col gap-3"
            >
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <input
                type="text"
                placeholder="Song Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="input"
              />
              <input
                type="text"
                placeholder="Artist (optional)"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                className="input"
              />
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                required
                className="input"
              >
                <option value="" disabled>Select status</option>
                <option value="confident">Confident</option>
                <option value="learning">Learning</option>
                <option value="wishlist">Wishlist</option>
              </select>
              <div className="border border-[var(--border)] rounded px-3 py-2">
                <p className="label mb-2">Genres (multi-select)</p>
                {genres.length === 0 ? (
                  <p className="text-sm muted">No genres yet. Add one below.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {genres.map(genre => (
                      <label key={genre.id} className="flex items-center gap-2 text-sm muted">
                        <input
                          type="checkbox"
                          checked={selectedGenreIds.includes(genre.id)}
                          onChange={() => toggleGenre(genre.id)}
                        />
                        {genre.name}
                      </label>
                    ))}
                  </div>
                )}
                {genreLimitError && <p className="text-xs text-red-600 mt-2">{genreLimitError}</p>}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a genre (e.g. Jazz)"
                  value={newGenreName}
                  onChange={e => setNewGenreName(e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddGenre}
                  className="button-ghost"
                >
                  Add Genre
                </button>
              </div>
              <button
                type="submit"
                className="button-primary mt-2"
              >
                Add Song
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Setlists */}
      <div className="section-title mt-10">
        <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
          <path
            d="M7 6h10M7 12h10M7 18h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <h2 className="text-2xl font-semibold">Setlists</h2>
      </div>
      <div className="section-divider" />
      <div className="card p-5">
        <p className="text-sm muted mb-3">Drag a song onto a setlist to add it.</p>
        <form onSubmit={handleAddSetlist} className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="New setlist name"
            value={newSetlistName}
            onChange={e => setNewSetlistName(e.target.value)}
            className="input flex-1"
          />
          <button
            type="submit"
            className="button-ghost"
          >
            Add Setlist
          </button>
        </form>
        {setlistError && <p className="text-sm text-red-600 mb-2">{setlistError}</p>}
        {setlists.length === 0 ? (
          <p className="text-sm muted">No setlists yet.</p>
        ) : (
          <ul className="space-y-2">
            {setlists.map(setlist => (
              <li
                key={setlist.id}
                onDragOver={e => e.preventDefault()}
                onDragEnter={() => setDragOverSetlistId(setlist.id)}
                onDragLeave={() => setDragOverSetlistId(null)}
                onDrop={() => handleDropOnSetlist(setlist.id)}
                onClick={() => router.push(`/setlists/${setlist.id}`)}
                className={`row row-clickable flex justify-between items-center ${dragOverSetlistId === setlist.id ? 'row-selected' : ''}`}
              >
                <span>{setlist.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {undoDelete && (
        <div className="fixed bottom-4 right-4 card-strong px-4 py-3 shadow-lg flex items-center gap-3">
          <span className="text-sm">Song deleted.</span>
          <button
            onClick={handleUndoDelete}
            className="text-sm font-semibold button-link"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
