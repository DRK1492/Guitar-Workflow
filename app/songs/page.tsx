'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import AddSongModal from '../components/songs-page/AddSongModal'
import OnboardingModal from '../components/songs-page/OnboardingModal'
import SongsContent from '../components/songs-page/SongsContent'
import SongsToolbar from '../components/songs-page/SongsToolbar'
import type { Genre, Song, SongGenre, SortPreference } from '../components/songs-page/types'
import UndoDeleteToast from '../components/songs-page/UndoDeleteToast'
import { useSupabaseSession } from '../components/SessionProvider'
import { seedDemoSong } from '../actions/seed'

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
  const [openMenuSongId, setOpenMenuSongId] = useState<string | null>(null)
  const [undoDelete, setUndoDelete] = useState<{
    song: Song
    index: number
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)
  // null = profile not yet loaded
  const [hasSeenLibraryIntro, setHasSeenLibraryIntro] = useState<boolean | null>(null)
  const [hasSeenDemoIntro, setHasSeenDemoIntro] = useState<boolean | null>(null)
  // Extra gate for the 500ms delay between popup 1 closing and popup 2 appearing
  const [demoPopupReady, setDemoPopupReady] = useState(false)
  const [showAddSongModal, setShowAddSongModal] = useState(false)
  const [sortPreference, setSortPreference] = useState<SortPreference>('newest')
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const { session } = useSupabaseSession()

  // Fetch songs for current user
  const fetchSongs = useCallback(async () => {
    if (!session) return
    const { data, error } = await supabase
      .from('songs')
      .select('*, song_genres(genre_id, genres(name))')
      .eq('user_id', session.user.id)
    if (error) console.log(error)
    else setSongs(data as Song[])
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  // Seed demo song for new users on first load
  useEffect(() => {
    if (session && songs.length === 0 && !loading) {
      console.log('[PAGE] Seeding demo for new user...')
      void (async () => {
        await seedDemoSong(session.user.id)
        await fetchSongs()
      })()
    }
  }, [session, songs.length, loading, fetchSongs])

  // Fetch onboarding flags from profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('has_seen_library_intro, has_seen_demo_intro')
        .eq('id', session.user.id)
        .single()
      setHasSeenLibraryIntro(data?.has_seen_library_intro ?? false)
      const alreadySeenIntro = data?.has_seen_library_intro ?? false
      setHasSeenDemoIntro(data?.has_seen_demo_intro ?? false)
      // If they've already seen the library intro before this page load,
      // the demo popup can show immediately (no artificial delay needed).
      if (alreadySeenIntro) setDemoPopupReady(true)
    }
    void fetchProfile()
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
    const timeoutId = window.setTimeout(() => {
      setFormError('')
      setShowAddSongModal(true)
    }, 0)

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('add')
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)

    return () => window.clearTimeout(timeoutId)
  }, [searchParams, pathname, router])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gruves_sort_preference')
      if (saved === 'newest' || saved === 'alphabetical' || saved === 'most_viewed') {
        setSortPreference(saved)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('gruves_sort_preference', sortPreference)
    } catch {}
  }, [sortPreference])

  // Derived onboarding state — both popups are suppressed once the user has a real song
  const hasRealSongs = songs.some(s => !s.is_demo)
  const hasDemoSong = songs.some(s => s.is_demo)
  const profileLoaded = hasSeenLibraryIntro !== null && hasSeenDemoIntro !== null

  const showOnboarding =
    !loading && profileLoaded && !hasRealSongs && hasSeenLibraryIntro === false
  const showDemoPopup =
    !loading &&
    profileLoaded &&
    !hasRealSongs &&
    hasDemoSong &&
    hasSeenLibraryIntro === true &&
    hasSeenDemoIntro === false &&
    demoPopupReady

  const dismissOnboarding = async () => {
    setHasSeenLibraryIntro(true)
    if (session) {
      await supabase
        .from('profiles')
        .upsert({ id: session.user.id, has_seen_library_intro: true })
    }
    // Show the demo popup after a short pause so the two modals don't feel simultaneous
    window.setTimeout(() => setDemoPopupReady(true), 500)
  }

  const dismissDemoBanner = async () => {
    setHasSeenDemoIntro(true)
    if (session) {
      await supabase
        .from('profiles')
        .upsert({ id: session.user.id, has_seen_demo_intro: true })
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

  const artistOptions = useMemo(
    () =>
      Array.from(
        new Set(
          songs
            .map(song => (song.artist || '').trim())
            .filter(name => name.length > 0)
            .map(name => name.toLowerCase())
        )
      )
        .map(lower => songs.find(s => s.artist?.toLowerCase() === lower)?.artist || lower)
        .sort((a, b) => a.localeCompare(b)),
    [songs]
  )

  const filteredSongs = useMemo(() => {
    const normalizedArtistFilter = filterArtist.toLowerCase()
    const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase()

    return songs.filter(song => {
      if (filterStatus !== 'all' && song.status !== filterStatus) return false
      if (filterGenreId !== 'all') {
        const genreMatch = (song.song_genres || []).some(g => g.genre_id === filterGenreId)
        if (!genreMatch) return false
      }
      if (filterArtist !== 'all') {
        const artistMatch = (song.artist || '').trim().toLowerCase() === normalizedArtistFilter
        if (!artistMatch) return false
      }
      if (normalizedSearchTerm) {
        const titleMatch = song.title?.toLowerCase().includes(normalizedSearchTerm)
        const artistMatch = song.artist?.toLowerCase().includes(normalizedSearchTerm)
        if (!titleMatch && !artistMatch) return false
      }
      return true
    })
  }, [deferredSearchTerm, filterArtist, filterGenreId, filterStatus, songs])

  const songsByStatus = useMemo(() => {
    const sort = (arr: Song[]) => {
      if (sortPreference === 'newest') {
        return [...arr].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        )
      }
      if (sortPreference === 'alphabetical') {
        return [...arr].sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
        )
      }
      if (sortPreference === 'most_viewed') {
        return [...arr].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      }
      return arr
    }
    return {
      confident: sort(filteredSongs.filter(song => song.status === 'confident')),
      learning: sort(filteredSongs.filter(song => song.status === 'learning')),
      wishlist: sort(filteredSongs.filter(song => song.status === 'wishlist'))
    }
  }, [filteredSongs, sortPreference])

  const statusGroups = useMemo(
    () => [
      {
        key: 'confident' as const,
        title: 'Confident',
        songs: songsByStatus.confident,
        emptyCopy: 'Nothing here yet.',
        statusClass: 'status-confident'
      },
      {
        key: 'learning' as const,
        title: 'Learning',
        songs: songsByStatus.learning,
        emptyCopy: 'Add something you’re working on.',
        statusClass: 'status-learning'
      },
      {
        key: 'wishlist' as const,
        title: 'Wishlist',
        songs: songsByStatus.wishlist,
        emptyCopy: 'Capture songs you want to learn.',
        statusClass: 'status-wishlist'
      }
    ],
    [songsByStatus]
  )

  return (
    <div className="page">
      {session && showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}

      <SongsToolbar
        artistOptions={artistOptions}
        filterArtist={filterArtist}
        filterGenreId={filterGenreId}
        filterStatus={filterStatus}
        genres={genres}
        onAddSong={() => {
          setFormError('')
          setShowAddSongModal(true)
        }}
        onClearFilters={() => {
          setSearchTerm('')
          setFilterStatus('all')
          setFilterGenreId('all')
          setFilterArtist('all')
        }}
        searchTerm={searchTerm}
        setFilterArtist={setFilterArtist}
        setFilterGenreId={setFilterGenreId}
        setFilterStatus={setFilterStatus}
        setSearchTerm={setSearchTerm}
        setSortPreference={setSortPreference}
        sortPreference={sortPreference}
      />

      <SongsContent
        filteredSongs={filteredSongs}
        loading={loading}
        onDelete={songId => {
          void handleDelete(songId)
        }}
        onGoToSong={goToSong}
        onToggleMenu={songId => setOpenMenuSongId(prev => (prev === songId ? null : songId))}
        onUpdateStatus={updateSongStatus}
        openMenuSongId={openMenuSongId}
        setOpenMenuSongId={setOpenMenuSongId}
        songs={songs}
        statusGroups={statusGroups}
        showDemoPopup={showDemoPopup}
        onDismissDemo={dismissDemoBanner}
      />

      {showAddSongModal && (
        <AddSongModal
          artist={artist}
          formError={formError}
          genreLimitError={genreLimitError}
          genres={genres}
          newGenreName={newGenreName}
          onAddGenre={() => {
            void handleAddGenre({ preventDefault() {} } as React.FormEvent)
          }}
          onClose={() => setShowAddSongModal(false)}
          onSubmit={async event => {
            const success = await handleAddSong(event)
            if (success) setShowAddSongModal(false)
          }}
          selectedGenreIds={selectedGenreIds}
          setArtist={setArtist}
          setNewGenreName={setNewGenreName}
          setStatus={setStatus}
          setTitle={setTitle}
          status={status}
          title={title}
          toggleGenre={toggleGenre}
        />
      )}

      {undoDelete && <UndoDeleteToast onUndo={handleUndoDelete} />}
    </div>
  )
}
