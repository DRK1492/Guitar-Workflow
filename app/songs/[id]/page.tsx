'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabaseClient'
import NoteContent from '../../components/NoteContent'
import NoteEditor from '../../components/NoteEditor'
import { useToast } from '../../components/ToastProvider'

interface Song {
  id: string
  title: string
  artist: string
  status: string
}

interface Note {
  id: string
  content: string
  created_at: string
  link_id?: string | null
  file_id?: string | null
  recording_id?: string | null
}

interface SongLink {
  id: string
  title: string | null
  url: string
}

interface SongFile {
  id: string
  file_name: string
  file_url: string
  storage_path?: string
}

interface SongRecording {
  id: string
  file_name: string
  file_url: string
  storage_path?: string
}

interface SongGenre {
  genre_id: string
  genres: {
    name: string
  } | null
}

interface Genre {
  id: string
  name: string
}

interface Setlist {
  id: string
  name: string
}

type ViewMode = 'table' | 'grid' | 'tabs'

const getYouTubeEmbedUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.slice(1)
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null
    }
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v')
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null
    }
  } catch {
    return null
  }
  return null
}

const MAX_PDF_SIZE_BYTES = 12 * 1024 * 1024
const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024

export default function SongDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSetlistId = searchParams.get('fromSetlist')
  const { addToast } = useToast()

  const [song, setSong] = useState<Song | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [links, setLinks] = useState<SongLink[]>([])
  const [pdfFiles, setPdfFiles] = useState<SongFile[]>([])
  const [recordings, setRecordings] = useState<SongRecording[]>([])
  const [songGenres, setSongGenres] = useState<SongGenre[]>([])
  const [allGenres, setAllGenres] = useState<Genre[]>([])
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [songSetlistIds, setSongSetlistIds] = useState<string[]>([])

  const [globalViewMode] = useState<ViewMode>('table')

  const [newNote, setNewNote] = useState('')
  const [newNoteLinkId, setNewNoteLinkId] = useState<string>('')
  const [newNotePdfId, setNewNotePdfId] = useState<string>('')
  const [newNoteRecordingId, setNewNoteRecordingId] = useState<string>('')
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [recordingName, setRecordingName] = useState('')
  const [recordingAudioBlob, setRecordingAudioBlob] = useState<Blob | null>(null)
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaChunksRef = useRef<Blob[]>([])
  const [audioUploading, setAudioUploading] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [openRecordingMenuId, setOpenRecordingMenuId] = useState<string | null>(null)
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null)
  const [editingRecordingName, setEditingRecordingName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editStatus, setEditStatus] = useState('learning')
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([])
  const [savingSong, setSavingSong] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [editingNoteLinkId, setEditingNoteLinkId] = useState<string>('')
  const [editingNotePdfId, setEditingNotePdfId] = useState<string>('')
  const [editingNoteRecordingId, setEditingNoteRecordingId] = useState<string>('')
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingLinkTitle, setEditingLinkTitle] = useState('')
  const [editingLinkUrl, setEditingLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const [newSetlistName, setNewSetlistName] = useState('')
  const [setlistError, setSetlistError] = useState('')
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null)
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)
  const [previewAudioId, setPreviewAudioId] = useState<string | null>(null)
  const [previewYoutubeUrl, setPreviewYoutubeUrl] = useState<string | null>(null)
  const [previewYoutubeTitle, setPreviewYoutubeTitle] = useState('')
  const [previewLinkId, setPreviewLinkId] = useState<string | null>(null)
  const [editingPdfId, setEditingPdfId] = useState<string | null>(null)
  const [editingPdfName, setEditingPdfName] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [newGenreName, setNewGenreName] = useState('')
  const [genreError, setGenreError] = useState('')
  const [openLinkMenuId, setOpenLinkMenuId] = useState<string | null>(null)
  const [openPdfMenuId, setOpenPdfMenuId] = useState<string | null>(null)
  const [openNoteMenuId, setOpenNoteMenuId] = useState<string | null>(null)

  const [activeLinkTabId, setActiveLinkTabId] = useState<string | null>(null)
  const [activePdfTabId, setActivePdfTabId] = useState<string | null>(null)
  const [activeNoteTabId, setActiveNoteTabId] = useState<string | null>(null)
  const [activeSetlistTabId, setActiveSetlistTabId] = useState<string | null>(null)

  const [session, setSession] = useState<Session | null>(null)
  const linkClickTimeouts = useRef<Record<string, number>>({})
  const pdfClickTimeouts = useRef<Record<string, number>>({})
  const skipLinkRowClickRef = useRef(false)
  const skipPdfRowClickRef = useRef(false)
  const pdfPreviewRef = useRef<HTMLDivElement | null>(null)
  const youtubePreviewRef = useRef<HTMLDivElement | null>(null)
  const songHeaderCardRef = useRef<HTMLDivElement | null>(null)
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('')

  const effectiveActiveLinkTabId = useMemo(() => {
    if (globalViewMode !== 'tabs') return null
    if (activeLinkTabId && links.some(link => link.id === activeLinkTabId)) return activeLinkTabId
    return links[0]?.id ?? null
  }, [globalViewMode, activeLinkTabId, links])

  const effectiveActivePdfTabId = useMemo(() => {
    if (globalViewMode !== 'tabs') return null
    if (activePdfTabId && pdfFiles.some(file => file.id === activePdfTabId)) return activePdfTabId
    return pdfFiles[0]?.id ?? null
  }, [globalViewMode, activePdfTabId, pdfFiles])

  const effectiveActiveNoteTabId = useMemo(() => {
    if (globalViewMode !== 'tabs') return null
    if (activeNoteTabId && notes.some(note => note.id === activeNoteTabId)) return activeNoteTabId
    return notes[0]?.id ?? null
  }, [globalViewMode, activeNoteTabId, notes])

  const effectiveActiveSetlistTabId = useMemo(() => {
    if (globalViewMode !== 'tabs') return null
    if (activeSetlistTabId && setlists.some(setlist => setlist.id === activeSetlistTabId)) {
      return activeSetlistTabId
    }
    return setlists[0]?.id ?? null
  }, [globalViewMode, activeSetlistTabId, setlists])

  // Load session
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    loadSession()
  }, [])

  // Fetch all data
  useEffect(() => {
    if (!id || !session?.user?.id) return

    const fetchData = async () => {
      setLoadError('')
      // Songs
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()
      if (songError || !songData) {
        setLoadError('Could not load song.')
        return
      }

      // Notes
      const { data: notesData } = await supabase
        .from('song_notes')
        .select('*')
        .eq('song_id', id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      // Links
      const { data: linksData } = await supabase
        .from('song_links')
        .select('*')
        .eq('song_id', id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      // PDFs
      const { data: pdfData } = await supabase
        .from('song_files')
        .select('*')
        .eq('song_id', id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      // Recordings
      const { data: recordingsData } = await supabase
        .from('song_recordings')
        .select('*')
        .eq('song_id', id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      // All Genres (for editing)
      const { data: allGenresData } = await supabase
        .from('genres')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })

      // Setlists
      const { data: setlistsData } = await supabase
        .from('setlists')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name', { ascending: true })

      const { data: songSetlistsData } = await supabase
        .from('setlist_songs')
        .select('setlist_id')
        .eq('song_id', id)
        .eq('user_id', session.user.id)

      // Genres
      const { data: genreData } = await supabase
        .from('song_genres')
        .select('genre_id, genres(name)')
        .eq('song_id', id)
        .eq('user_id', session.user.id)

      setSong(songData)
      setNotes(notesData || [])
      setLinks(linksData || [])
      setPdfFiles(pdfData || [])
      setRecordings(recordingsData || [])
      setSongGenres((genreData as unknown as SongGenre[]) || [])
      setAllGenres((allGenresData as Genre[]) || [])
      setSetlists((setlistsData as Setlist[]) || [])
      setSongSetlistIds(((songSetlistsData as { setlist_id: string }[]) || []).map(s => s.setlist_id))
      setEditTitle(songData.title || '')
      setEditArtist(songData.artist || '')
      setEditStatus(songData.status || 'learning')
      setSelectedGenreIds(((genreData as unknown as SongGenre[]) || []).map(g => g.genre_id))
    }

    fetchData()
  }, [id, session])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.menu-container')) return
      setOpenLinkMenuId(null)
      setOpenPdfMenuId(null)
      setOpenNoteMenuId(null)
      setOpenRecordingMenuId(null)
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  useEffect(() => {
    if (!previewPdfUrl) return
    const timeout = window.setTimeout(() => {
      pdfPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => window.clearTimeout(timeout)
  }, [previewPdfUrl])

  useEffect(() => {
    if (!previewYoutubeUrl) return
    const timeout = window.setTimeout(() => {
      youtubePreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => window.clearTimeout(timeout)
  }, [previewYoutubeUrl])

  const getNoteLabel = (note: Note, index: number) => {
    const text = note.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (!text) return `Note ${index + 1}`
    return text.length > 28 ? `${text.slice(0, 28)}…` : text
  }

  // ---------- Notes ----------
  const handleAddNote = async () => {
    const temp = document.createElement('div')
    temp.innerHTML = newNote
    if (!temp.textContent?.trim() || !session?.user?.id) {
      addToast({ title: 'Note is empty', description: 'Add some text before saving.', variant: 'error' })
      return
    }

    const { data, error } = await supabase
      .from('song_notes')
      .insert({
        song_id: id,
        user_id: session.user.id,
        content: newNote,
        link_id: newNoteLinkId || null,
        file_id: newNotePdfId || null,
        recording_id: newNoteRecordingId || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding note:', error)
      addToast({ title: 'Could not save note', description: 'Please try again.', variant: 'error' })
      return
    }
    if (data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      setNewNoteLinkId('')
      setNewNotePdfId('')
      setNewNoteRecordingId('')
      addToast({ title: 'Note saved', variant: 'success' })
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase.from('song_notes').delete().eq('id', noteId)
    if (error) {
      console.error('Error deleting note:', error)
      addToast({ title: 'Could not delete note', description: 'Please try again.', variant: 'error' })
      return
    }
    setNotes(prev => prev.filter(n => n.id !== noteId))
    addToast({ title: 'Note deleted', variant: 'success' })
  }

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingNoteContent(note.content)
    setEditingNoteLinkId(note.link_id ?? '')
    setEditingNotePdfId(note.file_id ?? '')
    setEditingNoteRecordingId(note.recording_id ?? '')
  }

  const handleUpdateNote = async () => {
    const temp = document.createElement('div')
    temp.innerHTML = editingNoteContent
    if (!editingNoteId || !temp.textContent?.trim() || !session?.user?.id) {
      addToast({ title: 'Note is empty', description: 'Add some text before saving.', variant: 'error' })
      return
    }
    const { data, error } = await supabase
      .from('song_notes')
      .update({
        content: editingNoteContent.trim(),
        link_id: editingNoteLinkId || null,
        file_id: editingNotePdfId || null,
        recording_id: editingNoteRecordingId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingNoteId)
      .eq('user_id', session.user.id)
      .select()
      .single()
    if (error) {
      console.error('Error updating note:', error)
      addToast({ title: 'Could not update note', description: 'Please try again.', variant: 'error' })
      return
    }
    if (data) {
      setNotes(prev => prev.map(n => (n.id === data.id ? (data as Note) : n)))
      setEditingNoteId(null)
      setEditingNoteContent('')
      setEditingNoteLinkId('')
      setEditingNotePdfId('')
      setEditingNoteRecordingId('')
      addToast({ title: 'Note updated', variant: 'success' })
    }
  }

  // ---------- Links ----------
  const handleAddLink = async () => {
    if (!linkUrl.trim() || !session?.user?.id) {
      addToast({ title: 'Link is required', description: 'Paste a valid URL.', variant: 'error' })
      return
    }
    setLinkError('')
    let parsed: URL | null = null
    try {
      parsed = new URL(linkUrl.trim())
    } catch {
      parsed = null
    }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
      setLinkError('Please enter a valid http(s) link.')
      addToast({ title: 'Invalid link', description: 'Use http:// or https://', variant: 'error' })
      return
    }

    const { data, error } = await supabase
      .from('song_links')
      .insert({ song_id: id, user_id: session.user.id, title: linkTitle || null, url: linkUrl })
      .select()
      .single()

    if (error) {
      console.error('Error adding link:', error)
      addToast({ title: 'Could not add link', description: 'Please try again.', variant: 'error' })
      return
    }
    if (data) {
      setLinks(prev => [data, ...prev])
      setLinkTitle('')
      setLinkUrl('')
      addToast({ title: 'Link added', variant: 'success' })
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    const { error } = await supabase.from('song_links').delete().eq('id', linkId)
    if (error) {
      console.error('Error deleting link:', error)
      addToast({ title: 'Could not delete link', description: 'Please try again.', variant: 'error' })
      return
    }
    setLinks(prev => prev.filter(l => l.id !== linkId))
    addToast({ title: 'Link deleted', variant: 'success' })
  }

  const handleEditLink = (link: SongLink) => {
    setEditingLinkId(link.id)
    setEditingLinkTitle(link.title || '')
    setEditingLinkUrl(link.url)
  }

  const handleUpdateLink = async () => {
    if (!editingLinkId || !editingLinkUrl.trim() || !session?.user?.id) {
      addToast({ title: 'Link is required', description: 'Paste a valid URL.', variant: 'error' })
      return
    }
    setLinkError('')
    let parsed: URL | null = null
    try {
      parsed = new URL(editingLinkUrl.trim())
    } catch {
      parsed = null
    }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
      setLinkError('Please enter a valid http(s) link.')
      addToast({ title: 'Invalid link', description: 'Use http:// or https://', variant: 'error' })
      return
    }
    const { error } = await supabase
      .from('song_links')
      .update({ title: editingLinkTitle.trim() || null, url: editingLinkUrl.trim() })
      .eq('id', editingLinkId)
      .eq('user_id', session.user.id)
    if (error) {
      console.error('Error updating link:', error)
      setLinkError('Unable to update link. Please try again.')
      addToast({ title: 'Could not update link', description: 'Please try again.', variant: 'error' })
      return
    }
    setLinks(prev =>
      prev.map(l =>
        l.id === editingLinkId
          ? { ...l, title: editingLinkTitle.trim() || null, url: editingLinkUrl.trim() }
          : l
      )
    )
    setEditingLinkId(null)
    setEditingLinkTitle('')
    setEditingLinkUrl('')
    addToast({ title: 'Link updated', variant: 'success' })
  }

  const handleCancelLinkEdit = () => {
    setEditingLinkId(null)
    setEditingLinkTitle('')
    setEditingLinkUrl('')
    setLinkError('')
    skipLinkRowClickRef.current = true
    window.setTimeout(() => {
      skipLinkRowClickRef.current = false
    }, 0)
  }

  const handleOpenLink = (link: SongLink) => {
    const embedUrl = getYouTubeEmbedUrl(link.url)
    if (embedUrl) {
      setPreviewYoutubeUrl(prev => {
        const next = prev === embedUrl ? null : embedUrl
        setPreviewYoutubeTitle(next ? link.title || link.url : '')
        setPreviewLinkId(next ? link.id : null)
        return next
      })
      return
    }
    setPreviewYoutubeUrl(null)
    setPreviewYoutubeTitle('')
    setPreviewLinkId(null)
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  const handleLinkRowClick = (link: SongLink) => {
    const embedUrl = getYouTubeEmbedUrl(link.url)
    if (!embedUrl) {
      window.open(link.url, '_blank', 'noopener,noreferrer')
      return
    }
    if (linkClickTimeouts.current[link.id]) {
      window.clearTimeout(linkClickTimeouts.current[link.id])
    }
    linkClickTimeouts.current[link.id] = window.setTimeout(() => {
      handleOpenLink(link)
      delete linkClickTimeouts.current[link.id]
    }, 200)
  }

  const handleLinkRowDoubleClick = (link: SongLink) => {
    if (linkClickTimeouts.current[link.id]) {
      window.clearTimeout(linkClickTimeouts.current[link.id])
      delete linkClickTimeouts.current[link.id]
    }
    window.open(link.url, '_blank', 'noopener,noreferrer')
  }

  // ---------- PDFs ----------
  const getStoragePathFromFile = (file: SongFile) =>
    file.storage_path ?? (file.file_url?.match(/\/song-pdfs\/(.+)$/)?.[1] ?? null)

  const getSignedPdfUrl = async (file: SongFile) => {
    const storagePath = getStoragePathFromFile(file)
    if (!storagePath) return null
    const { data, error } = await supabase.storage.from('song-pdfs').createSignedUrl(storagePath, 60 * 60)
    if (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
    return data?.signedUrl ?? null
  }

  const openPdfInNewTab = async (file: SongFile) => {
    const signedUrl = await getSignedPdfUrl(file)
    if (!signedUrl) return
    window.open(signedUrl, '_blank', 'noopener,noreferrer')
  }

  const handlePreviewPdf = async (file: SongFile) => {
    if (previewPdfId === file.id) {
      setPreviewPdfId(null)
      setPreviewPdfUrl(null)
      return
    }
    const signedUrl = await getSignedPdfUrl(file)
    if (!signedUrl) return
    setPreviewPdfId(file.id)
    setPreviewPdfUrl(signedUrl)
  }

  const handleUploadPdf = async () => {
    if (!pdfFile) {
      addToast({ title: 'No file selected', description: 'Choose a PDF to upload.', variant: 'error' })
      return
    }
    if (pdfFile.size > MAX_PDF_SIZE_BYTES) {
      setPdfError(`PDF is too large. Max size is ${Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024))}MB.`)
      addToast({ title: 'PDF too large', description: 'Choose a smaller file.', variant: 'error' })
      return
    }
    if (!session?.user?.id) {
      console.error('Session not loaded or user ID missing')
      addToast({ title: 'Not signed in', description: 'Please sign in again.', variant: 'error' })
      return
    }

    setUploading(true)
    setUploadProgress(0)
    const userId = session.user.id
    const safeFileName = pdfFile.name
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${userId}/${Date.now()}_${safeFileName}`

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const encodedPath = filePath
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/')

    const uploadWithProgress = () =>
      new Promise<void>((resolve, reject) => {
        if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
          reject(new Error('Missing Supabase config or access token'))
          return
        }
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${supabaseUrl}/storage/v1/object/song-pdfs/${encodedPath}`)
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`)
        xhr.setRequestHeader('apikey', supabaseAnonKey)
        xhr.setRequestHeader('x-upsert', 'false')
        xhr.setRequestHeader('Content-Type', pdfFile.type || 'application/pdf')
        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percent)
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`))
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(pdfFile)
      })

    try {
      await uploadWithProgress()
      setUploadProgress(100)
    } catch (err) {
      console.error('Storage upload error:', err)
      setUploading(false)
      setUploadProgress(0)
      addToast({ title: 'Upload failed', description: 'Please try again.', variant: 'error' })
      return
    }

    // Insert into DB (RLS-safe)
    const { data: dbData, error: dbError } = await supabase
      .from('song_files')
      .insert({
        song_id: id,
        user_id: userId,
        file_name: pdfFile.name,
        file_url: filePath,
        storage_path: filePath
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB insert error (RLS):', dbError)
      setUploading(false)
      setUploadProgress(0)
      addToast({ title: 'Upload saved, but DB failed', description: 'Please retry.', variant: 'error' })
      return
    }

    setPdfFiles(prev => [dbData, ...prev])
    setPdfFile(null)
    setUploading(false)
    setUploadProgress(0)
    setPdfError('')
    addToast({ title: 'PDF uploaded', variant: 'success' })
  }

  const handleDeletePdf = async (fileId: string) => {
    try {
      const file = pdfFiles.find(f => f.id === fileId)
      if (!file) {
        console.error('File not found for deletion:', fileId)
        addToast({ title: 'PDF not found', description: 'Please refresh and try again.', variant: 'error' })
        return
      }
      const confirmDelete = window.confirm(`Delete "${file.file_name}"?`)
      if (!confirmDelete) return

      // Prefer an explicit `storage_path` recorded in the DB. Fall back to
      // parsing the public URL if it isn't available.
      const storagePath = getStoragePathFromFile(file)

      if (!storagePath) {
        console.error('Could not determine storage path for deletion:', file)
        addToast({ title: 'Could not delete PDF', description: 'Missing storage path.', variant: 'error' })
      } else {
        const { error: storageError } = await supabase.storage.from('song-pdfs').remove([storagePath])
        if (storageError) {
          console.error('Error deleting storage file:', storageError)
          addToast({ title: 'Could not delete PDF', description: 'Storage delete failed.', variant: 'error' })
          return
        }
      }

      const { error: dbError } = await supabase.from('song_files').delete().eq('id', fileId)
      if (dbError) {
        console.error('Error deleting PDF record:', dbError)
        addToast({ title: 'Could not delete PDF', description: 'Database delete failed.', variant: 'error' })
        return
      }
      setPdfFiles(prev => prev.filter(f => f.id !== fileId))
      addToast({ title: 'PDF deleted', variant: 'success' })
    } catch (err) {
      console.error('Error deleting PDF:', err)
      addToast({ title: 'Could not delete PDF', description: 'Please try again.', variant: 'error' })
    }
  }

  const handlePdfRowClick = (file: SongFile) => {
    if (pdfClickTimeouts.current[file.id]) {
      window.clearTimeout(pdfClickTimeouts.current[file.id])
    }
    pdfClickTimeouts.current[file.id] = window.setTimeout(() => {
      if (previewPdfId === file.id) {
        setPreviewPdfId(null)
        setPreviewPdfUrl(null)
        delete pdfClickTimeouts.current[file.id]
        return
      }
      getSignedPdfUrl(file).then(signedUrl => {
        if (!signedUrl) return
        setPreviewPdfId(file.id)
        setPreviewPdfUrl(signedUrl)
        delete pdfClickTimeouts.current[file.id]
      })
    }, 200)
  }

  const handlePdfRowDoubleClick = (file: SongFile) => {
    if (pdfClickTimeouts.current[file.id]) {
      window.clearTimeout(pdfClickTimeouts.current[file.id])
      delete pdfClickTimeouts.current[file.id]
    }
    openPdfInNewTab(file)
  }

  const handleRenamePdf = async (file: SongFile) => {
    setEditingPdfId(file.id)
    setEditingPdfName(file.file_name)
  }

  const handleUpdatePdfName = async () => {
    if (!editingPdfId || !editingPdfName.trim() || !session?.user?.id) {
      addToast({ title: 'Name is required', description: 'Enter a file name.', variant: 'error' })
      return
    }
    setPdfError('')
    const trimmed = editingPdfName.trim()
    const { error } = await supabase
      .from('song_files')
      .update({ file_name: trimmed })
      .eq('id', editingPdfId)
      .eq('user_id', session.user.id)
    if (error) {
      console.error('Error renaming PDF:', error)
      setPdfError('Unable to update PDF name. Please try again.')
      addToast({ title: 'Could not rename PDF', description: 'Please try again.', variant: 'error' })
      return
    }
    setPdfFiles(prev => prev.map(f => (f.id === editingPdfId ? { ...f, file_name: trimmed } : f)))
    setEditingPdfId(null)
    setEditingPdfName('')
    addToast({ title: 'PDF renamed', variant: 'success' })
  }

  const handleCancelPdfEdit = () => {
    setEditingPdfId(null)
    setEditingPdfName('')
    setPdfError('')
    skipPdfRowClickRef.current = true
    window.setTimeout(() => {
      skipPdfRowClickRef.current = false
    }, 0)
  }

  // ---------- Recordings ----------
  const getStoragePathFromRecording = (recordingItem: SongRecording) =>
    recordingItem.storage_path ?? (recordingItem.file_url?.match(/\/song-audio\/(.+)$/)?.[1] ?? null)

  const getSignedAudioUrl = async (recordingItem: SongRecording) => {
    const storagePath = getStoragePathFromRecording(recordingItem)
    if (!storagePath) return null
    const { data, error } = await supabase.storage.from('song-audio').createSignedUrl(storagePath, 60 * 60)
    if (error) {
      console.error('Error creating signed audio URL:', error)
      return null
    }
    return data?.signedUrl ?? null
  }

  const handlePreviewRecording = async (recordingItem: SongRecording) => {
    if (previewAudioId === recordingItem.id) {
      setPreviewAudioId(null)
      setPreviewAudioUrl(null)
      return
    }
    const signedUrl = await getSignedAudioUrl(recordingItem)
    if (!signedUrl) return
    setPreviewAudioId(recordingItem.id)
    setPreviewAudioUrl(signedUrl)
  }

  const handleStartRecording = async () => {
    if (recording) return
    setAudioError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaChunksRef.current = []
      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setRecordingAudioBlob(blob)
        setRecording(false)
        stream.getTracks().forEach(track => track.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingAudioBlob(null)
    } catch (error) {
      console.error('Recording failed to start:', error)
      setAudioError('Microphone access denied or unavailable.')
    }
  }

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop()
  }

  const handleUploadAudio = async (file: File) => {
    if (!session?.user?.id) {
      addToast({ title: 'Not signed in', description: 'Please sign in again.', variant: 'error' })
      return
    }
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setAudioError(`Audio is too large. Max size is ${Math.round(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.`)
      addToast({ title: 'Audio too large', description: 'Choose a smaller file.', variant: 'error' })
      return
    }

    setAudioUploading(true)
    setAudioError('')
    const userId = session.user.id
    const safeFileName = file.name.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${userId}/${Date.now()}_${safeFileName}`

    const { error: storageError } = await supabase.storage.from('song-audio').upload(filePath, file, {
      contentType: file.type || 'audio/mpeg',
      upsert: false
    })

    if (storageError) {
      console.error('Audio upload error:', storageError)
      setAudioUploading(false)
      addToast({ title: 'Upload failed', description: 'Please try again.', variant: 'error' })
      return
    }

    const { data: dbData, error: dbError } = await supabase
      .from('song_recordings')
      .insert({
        song_id: id,
        user_id: userId,
        file_name: file.name,
        file_url: filePath,
        storage_path: filePath
      })
      .select()
      .single()

    if (dbError) {
      console.error('Audio DB insert error:', dbError)
      setAudioUploading(false)
      addToast({ title: 'Upload saved, but DB failed', description: 'Please retry.', variant: 'error' })
      return
    }

    setRecordings(prev => [dbData, ...prev])
    setAudioUploading(false)
    setAudioFile(null)
    setRecordingName('')
    setRecordingAudioBlob(null)
    addToast({ title: 'Recording saved', variant: 'success' })
  }

  const handleSaveRecording = async () => {
    if (!recordingAudioBlob) {
      setAudioError('Record audio first or upload a file.')
      return
    }
    const baseName = recordingName.trim() || `Recording_${new Date().toISOString().slice(0, 19)}`
    const fileExtension = recordingAudioBlob.type.includes('ogg') ? 'ogg' : 'webm'
    const file = new File([recordingAudioBlob], `${baseName}.${fileExtension}`, {
      type: recordingAudioBlob.type || 'audio/webm'
    })
    await handleUploadAudio(file)
  }

  const handleDeleteRecording = async (recordingId: string) => {
    const recordingItem = recordings.find(item => item.id === recordingId)
    if (!recordingItem) return
    const confirmDelete = window.confirm(`Delete "${recordingItem.file_name}"?`)
    if (!confirmDelete) return

    const storagePath = getStoragePathFromRecording(recordingItem)
    if (storagePath) {
      const { error: storageError } = await supabase.storage.from('song-audio').remove([storagePath])
      if (storageError) {
        console.error('Error deleting audio file:', storageError)
        addToast({ title: 'Could not delete recording', description: 'Storage delete failed.', variant: 'error' })
        return
      }
    }

    const { error: dbError } = await supabase.from('song_recordings').delete().eq('id', recordingId)
    if (dbError) {
      console.error('Error deleting recording record:', dbError)
      addToast({ title: 'Could not delete recording', description: 'Database delete failed.', variant: 'error' })
      return
    }

    setRecordings(prev => prev.filter(item => item.id !== recordingId))
    if (previewAudioId === recordingId) {
      setPreviewAudioId(null)
      setPreviewAudioUrl(null)
    }
    addToast({ title: 'Recording deleted', variant: 'success' })
  }

  const handleRenameRecording = (recordingItem: SongRecording) => {
    setEditingRecordingId(recordingItem.id)
    setEditingRecordingName(recordingItem.file_name)
  }

  const handleUpdateRecordingName = async () => {
    if (!editingRecordingId || !editingRecordingName.trim() || !session?.user?.id) {
      addToast({ title: 'Name is required', description: 'Enter a recording name.', variant: 'error' })
      return
    }
    const trimmed = editingRecordingName.trim()
    const { error } = await supabase
      .from('song_recordings')
      .update({ file_name: trimmed })
      .eq('id', editingRecordingId)
      .eq('user_id', session.user.id)
    if (error) {
      console.error('Error renaming recording:', error)
      addToast({ title: 'Could not rename recording', description: 'Please try again.', variant: 'error' })
      return
    }
    setRecordings(prev => prev.map(item => (item.id === editingRecordingId ? { ...item, file_name: trimmed } : item)))
    setEditingRecordingId(null)
    setEditingRecordingName('')
    addToast({ title: 'Recording renamed', variant: 'success' })
  }

  const handleCancelRecordingEdit = () => {
    setEditingRecordingId(null)
    setEditingRecordingName('')
  }

  const handleAddSongToSetlist = async (setlistId?: string) => {
    const targetId = typeof setlistId === 'string' ? setlistId : selectedSetlistId
    if (!song || !session?.user?.id || !targetId) {
      addToast({ title: 'Select a setlist', description: 'Choose a setlist first.', variant: 'error' })
      return
    }
    if (songSetlistIds.includes(targetId)) {
      addToast({ title: 'Already added', description: 'Song is already in this setlist.', variant: 'info' })
      return
    }
    const { data: lastItem } = await supabase
      .from('setlist_songs')
      .select('position')
      .eq('setlist_id', targetId)
      .eq('user_id', session.user.id)
      .order('position', { ascending: false })
      .limit(1)
    const nextPosition = (lastItem?.[0]?.position ?? -1) + 1
    const { error } = await supabase
      .from('setlist_songs')
      .insert({
        setlist_id: targetId,
        song_id: song.id,
        user_id: session.user.id,
        position: nextPosition
      })
    if (error) {
      console.error('Error adding to setlist:', error)
      addToast({ title: 'Could not add to setlist', description: 'Please try again.', variant: 'error' })
      return
    }
    setSongSetlistIds(prev => [...prev, targetId])
    addToast({ title: 'Added to setlist', variant: 'success' })
  }

  const handleCreateSetlistAndAdd = async () => {
    if (!newSetlistName.trim() || !session?.user?.id) {
      addToast({ title: 'Setlist name required', description: 'Enter a name to create.', variant: 'error' })
      return
    }
    setSetlistError('')
    const { data, error } = await supabase
      .from('setlists')
      .insert({ name: newSetlistName.trim(), user_id: session.user.id })
      .select()
      .single()
    if (error) {
      console.error('Error adding setlist:', error)
      setSetlistError('Could not add setlist. Try a different name.')
      addToast({ title: 'Could not create setlist', description: 'Please try again.', variant: 'error' })
      return
    }
    if (data) {
      setSetlists(prev => [...prev, data as Setlist].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSetlistName('')
      setSelectedSetlistId(data.id)
      await handleAddSongToSetlist(data.id)
      addToast({ title: 'Setlist created', variant: 'success' })
    }
  }

  const handleDeleteSong = async () => {
    if (!song || !session?.user?.id) return
    const confirmDelete = window.confirm('Delete this song and all its files?')
    if (!confirmDelete) return

    const { data: files, error: filesError } = await supabase
      .from('song_files')
      .select('storage_path, file_url')
      .eq('song_id', song.id)
      .eq('user_id', session.user.id)

    if (filesError) console.error('Error fetching files for deletion:', filesError)

    if (files && files.length > 0) {
      const paths = files
        .map(file => file.storage_path ?? (file.file_url?.match(/\/song-pdfs\/(.+)$/)?.[1] ?? null))
        .filter((path): path is string => Boolean(path))
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('song-pdfs').remove(paths)
        if (storageError) console.error('Error deleting storage files:', storageError)
      }
    }

    const { data: audioFiles, error: audioFilesError } = await supabase
      .from('song_recordings')
      .select('storage_path, file_url')
      .eq('song_id', song.id)
      .eq('user_id', session.user.id)

    if (audioFilesError) console.error('Error fetching recordings for deletion:', audioFilesError)

    if (audioFiles && audioFiles.length > 0) {
      const paths = audioFiles
        .map(file => file.storage_path ?? (file.file_url?.match(/\/song-audio\/(.+)$/)?.[1] ?? null))
        .filter((path): path is string => Boolean(path))
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from('song-audio').remove(paths)
        if (storageError) console.error('Error deleting recording files:', storageError)
      }
    }

    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', song.id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting song:', error)
      addToast({ title: 'Could not delete song', description: 'Please try again.', variant: 'error' })
      return
    }

    addToast({ title: 'Song deleted', variant: 'success' })
    router.push('/songs')
  }

  const toggleGenre = (genreId: string) => {
    setSelectedGenreIds(prev =>
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    )
  }

  const handleAddGenre = async () => {
    if (!newGenreName.trim() || !session?.user?.id) {
      addToast({ title: 'Genre name required', description: 'Enter a genre name.', variant: 'error' })
      return
    }
    setGenreError('')
    const { data, error } = await supabase
      .from('genres')
      .insert({ name: newGenreName.trim(), user_id: session.user.id })
      .select()
      .single()
    if (error) {
      console.error('Error adding genre:', error)
      setGenreError('Could not add genre. Try a different name.')
      addToast({ title: 'Could not add genre', description: 'Please try again.', variant: 'error' })
      return
    }
    if (data) {
      setAllGenres(prev => [...prev, data as Genre].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedGenreIds(prev => [...prev, (data as Genre).id])
      setNewGenreName('')
      addToast({ title: 'Genre added', variant: 'success' })
    }
  }

  const cancelSongEdit = () => {
    if (!song) return
    setIsEditing(false)
    setEditTitle(song.title || '')
    setEditArtist(song.artist || '')
    setEditStatus(song.status || 'learning')
    setSelectedGenreIds(songGenres.map(g => g.genre_id))
    setSaveError('')
    setGenreError('')
    setNewGenreName('')
  }

  useEffect(() => {
    if (!isEditing) return

    const handleOutsideEditClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (songHeaderCardRef.current?.contains(target)) return
      cancelSongEdit()
    }

    document.addEventListener('mousedown', handleOutsideEditClick)
    return () => document.removeEventListener('mousedown', handleOutsideEditClick)
  }, [isEditing, song, songGenres])


  const handleSaveSong = async () => {
    if (!song || !session?.user?.id) return
    setSavingSong(true)
    setSaveError('')

    const { error: updateError } = await supabase
      .from('songs')
      .update({
        title: editTitle.trim(),
        artist: editArtist.trim() || null,
        status: editStatus
      })
      .eq('id', song.id)
      .eq('user_id', session.user.id)

    if (updateError) {
      console.error('Error updating song:', updateError)
      setSaveError('Could not save changes. Please try again.')
      setSavingSong(false)
      addToast({ title: 'Could not save song', description: 'Please try again.', variant: 'error' })
      return
    }

    const { error: deleteError } = await supabase
      .from('song_genres')
      .delete()
      .eq('song_id', song.id)
      .eq('user_id', session.user.id)

    if (deleteError) {
      console.error('Error clearing song genres:', deleteError)
      setSaveError('Song saved, but genres failed to update.')
      setSavingSong(false)
      addToast({ title: 'Genres not updated', description: 'Please try again.', variant: 'error' })
      return
    }

    if (selectedGenreIds.length > 0) {
      const { error: insertError } = await supabase.from('song_genres').insert(
        selectedGenreIds.map(genreId => ({
          song_id: song.id,
          genre_id: genreId,
          user_id: session.user.id
        }))
      )
      if (insertError) {
        console.error('Error saving song genres:', insertError)
        setSaveError('Song saved, but genres failed to update.')
        setSavingSong(false)
        addToast({ title: 'Genres not updated', description: 'Please try again.', variant: 'error' })
        return
      }
    }

    setSong(prev => (prev ? { ...prev, title: editTitle, artist: editArtist, status: editStatus } : prev))
    const updatedGenres = selectedGenreIds.map(genreId => ({
      genre_id: genreId,
      genres: { name: allGenres.find(g => g.id === genreId)?.name ?? 'Unknown' }
    }))
    setSongGenres(updatedGenres)
    setIsEditing(false)
    setSavingSong(false)
    addToast({ title: 'Song saved', variant: 'success' })
  }

  const linkedNotesForLink = previewLinkId
    ? notes.filter(note => note.link_id === previewLinkId)
    : []
  const linkedNotesForPdf = previewPdfId
    ? notes.filter(note => note.file_id === previewPdfId)
    : []
  const linkedNotesForAudio = previewAudioId
    ? notes.filter(note => note.recording_id === previewAudioId)
    : []

  if (loadError) return <p className="p-6 text-red-600">{loadError}</p>
  if (!song) return <p className="p-6">Loading...</p>

  return (
    <div className="page">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4">
          <button onClick={() => router.push('/songs')} className="button-link button-link-large">
            ← Back to Songs
          </button>
          {fromSetlistId && (
            <button
              onClick={() => router.push(`/setlists/${fromSetlistId}`)}
              className="button-link button-link-large"
            >
              ← Back to Setlist
            </button>
          )}
        </div>
      </div>

      <div>
        {/* Song Header */}
        <div className="card p-6 mb-6" ref={songHeaderCardRef}>
        {!isEditing ? (
          <>
            <p className="label mb-2">Song</p>
            <h1 className="text-3xl font-semibold tracking-tight heading-display">{song.title}</h1>
            <p className="muted song-data">{song.artist || 'Unknown Artist'}</p>
            <span className={`badge badge-status status-${song.status} mt-2`}>{song.status}</span>
            {songGenres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {songGenres.map(g => (
                  <span
                    key={g.genre_id}
                    className="genre-pill"
                  >
                    {g.genres?.name ?? 'Unknown'}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 action-group">
              <button
                onClick={() => setIsEditing(true)}
                className="button-ghost action-button action-button-compact"
              >
                <span className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                    <path
                      d="M4 20h4l10-10-4-4L4 16v4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </span>
              </button>
              <button
                onClick={handleDeleteSong}
                className="button-ghost button-danger action-button action-button-compact"
              >
                <span className="inline-flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                    <path
                      d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Delete
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="input w-full"
              placeholder="Song title"
            />
            <input
              type="text"
              value={editArtist}
              onChange={e => setEditArtist(e.target.value)}
              className="input w-full"
              placeholder="Artist (optional)"
            />
            <select
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              className="input w-full"
            >
              <option value="confident">Confident</option>
              <option value="learning">Learning</option>
              <option value="wishlist">Wishlist</option>
            </select>
            <div className="border border-[var(--border)] rounded px-3 py-2">
              <p className="label mb-2">Genres (multi-select)</p>
              {allGenres.length === 0 ? (
                <p className="text-sm muted">No genres yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allGenres.map(genre => (
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
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Add a genre (e.g. Jazz)"
                  value={newGenreName}
                  onChange={e => setNewGenreName(e.target.value)}
                  className="input w-full"
                />
                {genreError && <p className="text-xs text-red-600 mt-2">{genreError}</p>}
              </div>
              <button
                type="button"
                onClick={handleAddGenre}
                disabled={!newGenreName.trim() || !session?.user?.id}
                className={`button-ghost ${!newGenreName.trim() || !session?.user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Add Genre
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveSong}
                disabled={savingSong || !editTitle.trim()}
                className={`button-primary ${savingSong ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {savingSong ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelSongEdit}
                className="button-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Links */}
        <div className="card p-6 mb-6">
        <div className="section-header">
          <div className="section-title">
            <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
              <path
                d="M10 13a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1 1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M14 11a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <h2 className="text-xl font-semibold">Listen</h2>
          </div>
        </div>
        <div className="section-divider" />
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Title (optional)"
            value={linkTitle}
            onChange={e => {
              setLinkTitle(e.target.value)
              if (linkError) setLinkError('')
            }}
            className="input flex-1"
          />
          <input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={e => {
              setLinkUrl(e.target.value)
              if (linkError) setLinkError('')
            }}
            className="input flex-1"
          />
          <button
            onClick={handleAddLink}
            disabled={!linkUrl.trim() || !session?.user?.id}
            className={`button-primary ${!linkUrl.trim() || !session?.user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Add
          </button>
        </div>
        {linkError && <p className="text-sm text-red-600 mb-3">{linkError}</p>}
        {links.length === 0 ? (
          <p className="muted">No links yet.</p>
        ) : (
          <>
            {globalViewMode === 'table' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>URL</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(link => (
                    editingLinkId === link.id ? (
                      <tr key={link.id}>
                        <td colSpan={3}>
                          <div className="table-edit">
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                placeholder="Title (optional)"
                                value={editingLinkTitle}
                                onChange={e => {
                                  setEditingLinkTitle(e.target.value)
                                  if (linkError) setLinkError('')
                                }}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    handleUpdateLink()
                                  }
                                }}
                                className="input flex-1"
                                autoFocus
                              />
                              <input
                                type="url"
                                placeholder="https://..."
                                value={editingLinkUrl}
                                onChange={e => {
                                  setEditingLinkUrl(e.target.value)
                                  if (linkError) setLinkError('')
                                }}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    handleUpdateLink()
                                  }
                                }}
                                className="input flex-1"
                              />
                            </div>
                            <div className="flex gap-3">
                              <button onClick={handleUpdateLink} className="button-primary">
                                Save
                              </button>
                              <button onClick={handleCancelLinkEdit} className="button-ghost">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={link.id}
                        className="table-row row-clickable"
                        onClick={() => {
                          if (skipLinkRowClickRef.current) return
                          if (!editingLinkId) handleLinkRowClick(link)
                        }}
                        onDoubleClick={() => {
                          if (skipLinkRowClickRef.current) return
                          if (!editingLinkId) handleLinkRowDoubleClick(link)
                        }}
                      >
                        <td className="table-cell">{link.title || link.url}</td>
                        <td className="table-cell muted">{link.url}</td>
                        <td className="table-cell table-actions">
                          <div className="menu-container" onClick={event => event.stopPropagation()}>
                            <button
                              type="button"
                              className="button-ghost menu-trigger"
                              onClick={event => {
                                event.stopPropagation()
                                setOpenLinkMenuId(prev => (prev === link.id ? null : link.id))
                              }}
                            >
                              <span className="menu-dots" aria-hidden="true">⋯</span>
                              <span className="sr-only">Link actions</span>
                            </button>
                            {openLinkMenuId === link.id && (
                              <div className="menu" onClick={event => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    handleEditLink(link)
                                    setOpenLinkMenuId(null)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    window.open(link.url, '_blank', 'noopener,noreferrer')
                                    setOpenLinkMenuId(null)
                                  }}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="menu-item menu-danger"
                                  onClick={() => {
                                    handleDeleteLink(link.id)
                                    setOpenLinkMenuId(null)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
            {globalViewMode === 'grid' && (
              <div className="grid grid-two">
                {links.map(link => (
                  <div
                    key={link.id}
                    className="row row-clickable grid-card"
                    onClick={() => {
                      if (skipLinkRowClickRef.current) return
                      if (!editingLinkId) handleLinkRowClick(link)
                    }}
                    onDoubleClick={() => {
                      if (skipLinkRowClickRef.current) return
                      if (!editingLinkId) handleLinkRowDoubleClick(link)
                    }}
                  >
                    {editingLinkId === link.id ? (
                      <div>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Title (optional)"
                            value={editingLinkTitle}
                            onChange={e => {
                              setEditingLinkTitle(e.target.value)
                              if (linkError) setLinkError('')
                            }}
                            className="input flex-1"
                            autoFocus
                          />
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editingLinkUrl}
                            onChange={e => {
                              setEditingLinkUrl(e.target.value)
                              if (linkError) setLinkError('')
                            }}
                            className="input flex-1"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleUpdateLink} className="button-primary">
                            Save
                          </button>
                          <button onClick={handleCancelLinkEdit} className="button-ghost">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-medium">{link.title || link.url}</p>
                          <p className="text-xs muted break-all">{link.url}</p>
                        </div>
                        <div className="menu-container" onClick={event => event.stopPropagation()}>
                          <button
                            type="button"
                            className="button-ghost menu-trigger"
                            onClick={event => {
                              event.stopPropagation()
                              setOpenLinkMenuId(prev => (prev === link.id ? null : link.id))
                            }}
                          >
                            <span className="menu-dots" aria-hidden="true">⋯</span>
                            <span className="sr-only">Link actions</span>
                          </button>
                          {openLinkMenuId === link.id && (
                            <div className="menu" onClick={event => event.stopPropagation()}>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={() => {
                                  handleEditLink(link)
                                  setOpenLinkMenuId(null)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={() => {
                                  window.open(link.url, '_blank', 'noopener,noreferrer')
                                  setOpenLinkMenuId(null)
                                }}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                className="menu-item menu-danger"
                                onClick={() => {
                                  handleDeleteLink(link.id)
                                  setOpenLinkMenuId(null)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {globalViewMode === 'tabs' && (
              <div className="tabs">
                <div className="tabs-list">
                  {links.map(link => (
                    <button
                      key={link.id}
                      type="button"
                      className={`tab-trigger ${effectiveActiveLinkTabId === link.id ? 'tab-active' : ''}`}
                      onClick={() => setActiveLinkTabId(link.id)}
                    >
                      {link.title || link.url}
                    </button>
                  ))}
                </div>
                <div className="tabs-panel">
                  {(() => {
                    const activeLink = links.find(link => link.id === effectiveActiveLinkTabId) ?? null
                    if (!activeLink) {
                      return <p className="muted">Choose a link to see details.</p>
                    }
                    if (editingLinkId === activeLink.id) {
                      return (
                        <div>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              placeholder="Title (optional)"
                              value={editingLinkTitle}
                              onChange={e => {
                                setEditingLinkTitle(e.target.value)
                                if (linkError) setLinkError('')
                              }}
                              className="input flex-1"
                              autoFocus
                            />
                            <input
                              type="url"
                              placeholder="https://..."
                              value={editingLinkUrl}
                              onChange={e => {
                                setEditingLinkUrl(e.target.value)
                                if (linkError) setLinkError('')
                              }}
                              className="input flex-1"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button onClick={handleUpdateLink} className="button-primary">
                              Save
                            </button>
                            <button onClick={handleCancelLinkEdit} className="button-ghost">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    }
                    const isYoutube = Boolean(getYouTubeEmbedUrl(activeLink.url))
                    return (
                      <div className="tabs-content">
                        <div>
                          <p className="text-sm font-medium">{activeLink.title || 'Untitled link'}</p>
                          <p className="text-xs muted break-all">{activeLink.url}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="button-primary"
                            onClick={() => handleOpenLink(activeLink)}
                          >
                            {isYoutube ? 'Preview' : 'Open'}
                          </button>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => window.open(activeLink.url, '_blank', 'noopener,noreferrer')}
                          >
                            Open in new tab
                          </button>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => handleEditLink(activeLink)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button-ghost button-danger"
                            onClick={() => handleDeleteLink(activeLink.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </>
        )}
            {previewYoutubeUrl && (
          <div className="mt-4" ref={youtubePreviewRef}>
            <p className="label mb-2">Video preview</p>
            <div className="card-strong p-2">
              <p className="text-sm font-medium mb-2 mono">{previewYoutubeTitle || 'YouTube'}</p>
              <div className="aspect-video">
                <iframe
                  src={previewYoutubeUrl}
                  title={previewYoutubeTitle || 'YouTube player'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full rounded"
                />
              </div>
              <div className="mt-3">
                <p className="label mb-2">Linked notes</p>
                {linkedNotesForLink.length === 0 ? (
                  <p className="text-sm muted">No linked notes yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {linkedNotesForLink.map(note => (
                      <li key={note.id} className="row">
                        <div className="note-content">
                          <NoteContent text={note.content} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* PDFs */}
        <div className="card p-6 mb-6">
        <div className="section-header">
          <div className="section-title">
            <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
              <path
                d="M7 4h7l4 4v12H7z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 4v4h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="text-xl font-semibold">Read</h2>
          </div>
        </div>
        <div className="section-divider" />
        <div className="flex gap-2 items-center mb-2">
          <input
            type="file"
            accept=".pdf"
            onChange={e => {
              const file = e.target.files?.[0] || null
              if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
                if (file.size > MAX_PDF_SIZE_BYTES) {
                  setPdfError(`PDF is too large. Max size is ${Math.round(MAX_PDF_SIZE_BYTES / (1024 * 1024))}MB.`)
                  addToast({
                    title: 'PDF too large',
                    description: 'Choose a smaller file and try again.',
                    variant: 'error'
                  })
                  setPdfFile(null)
                  return
                }
                setPdfError('')
                setPdfFile(file)
              } else if (file) {
                console.error('Only PDF files are supported.')
                setPdfError('Only PDF files are supported.')
                addToast({ title: 'Invalid file type', description: 'Upload a PDF file.', variant: 'error' })
              } else {
                setPdfFile(null)
              }
            }}
            className="input flex-1"
          />
          <button
            onClick={handleUploadPdf}
            disabled={!pdfFile || !session?.user?.id || uploading}
            className={`button-primary ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        {uploading && (
          <div className="mt-2">
            <div className="h-2 bg-[var(--surface-strong)] rounded">
              <div
                className="h-2 bg-[var(--accent)] rounded"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs muted mt-1">{uploadProgress}%</p>
          </div>
        )}
        {pdfError && <p className="text-sm text-red-600 mb-3">{pdfError}</p>}
        {pdfFiles.length === 0 ? (
          <p className="muted">No PDFs uploaded yet.</p>
        ) : (
          <>
            {globalViewMode === 'table' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfFiles.map(file => (
                    editingPdfId === file.id ? (
                      <tr key={file.id}>
                        <td colSpan={2}>
                          <div className="table-edit">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingPdfName}
                                onChange={event => {
                                  setEditingPdfName(event.target.value)
                                  if (pdfError) setPdfError('')
                                }}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    handleUpdatePdfName()
                                  }
                                }}
                                className="input flex-1"
                                autoFocus
                              />
                              <button type="button" className="button-primary" onClick={handleUpdatePdfName}>
                                Save
                              </button>
                              <button type="button" className="button-ghost" onClick={handleCancelPdfEdit}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={file.id}
                        className="table-row row-clickable"
                        onClick={() => {
                          if (skipPdfRowClickRef.current) return
                          if (!editingPdfId) handlePdfRowClick(file)
                        }}
                        onDoubleClick={() => {
                          if (skipPdfRowClickRef.current) return
                          if (!editingPdfId) handlePdfRowDoubleClick(file)
                        }}
                      >
                        <td className="table-cell">{file.file_name}</td>
                        <td className="table-cell table-actions">
                          <div className="menu-container" onClick={event => event.stopPropagation()}>
                            <button
                              type="button"
                              className="button-ghost menu-trigger"
                              onClick={event => {
                                event.stopPropagation()
                                setOpenPdfMenuId(prev => (prev === file.id ? null : file.id))
                              }}
                            >
                              <span className="menu-dots" aria-hidden="true">⋯</span>
                              <span className="sr-only">PDF actions</span>
                            </button>
                            {openPdfMenuId === file.id && (
                              <div className="menu" onClick={event => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    handleRenamePdf(file)
                                    setOpenPdfMenuId(null)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    openPdfInNewTab(file)
                                    setOpenPdfMenuId(null)
                                  }}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="menu-item menu-danger"
                                  onClick={() => {
                                    handleDeletePdf(file.id)
                                    setOpenPdfMenuId(null)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
            {globalViewMode === 'grid' && (
              <div className="grid grid-two">
                {pdfFiles.map(file => (
                  <div
                    key={file.id}
                    className="row row-clickable grid-card"
                    onClick={() => {
                      if (skipPdfRowClickRef.current) return
                      if (!editingPdfId) handlePdfRowClick(file)
                    }}
                    onDoubleClick={() => {
                      if (skipPdfRowClickRef.current) return
                      if (!editingPdfId) handlePdfRowDoubleClick(file)
                    }}
                  >
                    {editingPdfId === file.id ? (
                      <div className="w-full flex items-center gap-2">
                        <input
                          type="text"
                          value={editingPdfName}
                          onChange={event => {
                            setEditingPdfName(event.target.value)
                            if (pdfError) setPdfError('')
                          }}
                          className="input flex-1"
                          autoFocus
                        />
                        <button type="button" className="button-primary" onClick={handleUpdatePdfName}>
                          Save
                        </button>
                        <button type="button" className="button-ghost" onClick={handleCancelPdfEdit}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-medium">{file.file_name}</p>
                          <p className="text-xs muted">Click to preview · Double click to open</p>
                        </div>
                        <div className="menu-container" onClick={event => event.stopPropagation()}>
                          <button
                            type="button"
                            className="button-ghost menu-trigger"
                            onClick={event => {
                              event.stopPropagation()
                              setOpenPdfMenuId(prev => (prev === file.id ? null : file.id))
                            }}
                          >
                            <span className="menu-dots" aria-hidden="true">⋯</span>
                            <span className="sr-only">PDF actions</span>
                          </button>
                          {openPdfMenuId === file.id && (
                            <div className="menu" onClick={event => event.stopPropagation()}>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={() => {
                                  handleRenamePdf(file)
                                  setOpenPdfMenuId(null)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={() => {
                                  openPdfInNewTab(file)
                                  setOpenPdfMenuId(null)
                                }}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                className="menu-item menu-danger"
                                onClick={() => {
                                  handleDeletePdf(file.id)
                                  setOpenPdfMenuId(null)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {globalViewMode === 'tabs' && (
              <div className="tabs">
                <div className="tabs-list">
                  {pdfFiles.map(file => (
                    <button
                      key={file.id}
                      type="button"
                      className={`tab-trigger ${effectiveActivePdfTabId === file.id ? 'tab-active' : ''}`}
                      onClick={() => setActivePdfTabId(file.id)}
                    >
                      {file.file_name}
                    </button>
                  ))}
                </div>
                <div className="tabs-panel">
                  {(() => {
                    const activeFile = pdfFiles.find(file => file.id === effectiveActivePdfTabId) ?? null
                    if (!activeFile) {
                      return <p className="muted">Choose a file to see details.</p>
                    }
                    if (editingPdfId === activeFile.id) {
                      return (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingPdfName}
                            onChange={event => {
                              setEditingPdfName(event.target.value)
                              if (pdfError) setPdfError('')
                            }}
                            className="input flex-1"
                            autoFocus
                          />
                          <button type="button" className="button-primary" onClick={handleUpdatePdfName}>
                            Save
                          </button>
                          <button type="button" className="button-ghost" onClick={handleCancelPdfEdit}>
                            Cancel
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div className="tabs-content">
                        <div>
                          <p className="text-sm font-medium">{activeFile.file_name}</p>
                          <p className="text-xs muted">PDF file stored in your library.</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="button-primary"
                            onClick={() => handlePreviewPdf(activeFile)}
                          >
                            {previewPdfId === activeFile.id ? 'Hide preview' : 'Preview'}
                          </button>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => openPdfInNewTab(activeFile)}
                          >
                            Open in new tab
                          </button>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => handleRenamePdf(activeFile)}
                          >
                            Edit name
                          </button>
                          <button
                            type="button"
                            className="button-ghost button-danger"
                            onClick={() => handleDeletePdf(activeFile.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
            {previewPdfUrl && (
              <div className="mt-4" ref={pdfPreviewRef}>
                <p className="label mb-2">PDF preview</p>
                <div className="card-strong overflow-hidden">
                  <iframe
                    src={previewPdfUrl}
                    title="PDF preview"
                    className="w-full h-[32rem]"
                  />
                </div>
                <div className="mt-3">
                  <p className="label mb-2">Linked notes</p>
                  {linkedNotesForPdf.length === 0 ? (
                    <p className="text-sm muted">No linked notes yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {linkedNotesForPdf.map(note => (
                        <li key={note.id} className="row">
                          <div className="note-content">
                            <NoteContent text={note.content} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {/* Recordings */}
        <div className="card p-6 mb-6">
          <div className="section-header">
            <div className="section-title">
              <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                <path
                  d="M12 3v10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M8 7a4 4 0 0 0 8 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M6 11v1a6 6 0 0 0 12 0v-1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M12 19v2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <h2 className="text-xl font-semibold">Record</h2>
            </div>
          </div>
          <div className="section-divider" />

          <div className="grid gap-4 lg:grid-cols-[1.05fr_1.45fr]">
            <div className="space-y-4">
              <div className="card-strong p-4">
                <p className="label mb-3">Record memo</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={recording ? handleStopRecording : handleStartRecording}
                    className={`button-primary ${recording ? 'button-danger' : ''}`}
                  >
                    {recording ? 'Stop' : 'Record'}
                  </button>
                  <input
                    type="text"
                    placeholder="Recording name (optional)"
                    value={recordingName}
                    onChange={event => setRecordingName(event.target.value)}
                    className="input flex-1 min-w-[200px]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveRecording}
                    disabled={!recordingAudioBlob || audioUploading}
                    className={`button-ghost ${!recordingAudioBlob || audioUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {audioUploading ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {recording && <p className="text-xs muted mt-2">Recording in progress…</p>}
                {!recording && recordingAudioBlob && (
                  <p className="text-xs text-emerald-500 mt-2">Recording ready to save.</p>
                )}
              </div>

              <div className="card-strong p-4">
                <p className="label mb-3">Upload audio</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
                    onChange={event => {
                      const file = event.target.files?.[0] || null
                      if (!file) {
                        setAudioFile(null)
                        return
                      }
                      if (!file.type.startsWith('audio/')) {
                        setAudioError('Only audio files are supported.')
                        setAudioFile(null)
                        return
                      }
                      if (file.size > MAX_AUDIO_SIZE_BYTES) {
                        setAudioError(`Audio is too large. Max size is ${Math.round(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.`)
                        setAudioFile(null)
                        return
                      }
                      setAudioError('')
                      setAudioFile(file)
                    }}
                    className="input flex-1 min-w-[220px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (audioFile) handleUploadAudio(audioFile)
                    }}
                    disabled={!audioFile || audioUploading}
                    className={`button-primary ${!audioFile || audioUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {audioUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
                {audioError && <p className="text-sm text-red-600 mt-2">{audioError}</p>}
              </div>
            </div>

            <div className="card-strong p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="label">Library</p>
                <span className="text-xs muted">{recordings.length} item{recordings.length === 1 ? '' : 's'}</span>
              </div>

              {recordings.length === 0 ? (
                <p className="muted">No recordings yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recordings.map(recordingItem => (
                    <li
                      key={recordingItem.id}
                      className="row space-y-3"
                      onClick={() => {
                        if (editingRecordingId) return
                        handlePreviewRecording(recordingItem)
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {editingRecordingId === recordingItem.id ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              <input
                                type="text"
                                value={editingRecordingName}
                                onChange={event => setEditingRecordingName(event.target.value)}
                                className="input flex-1 min-w-[200px]"
                                autoFocus
                              />
                              <button
                                type="button"
                                className="button-primary"
                                onClick={event => {
                                  event.stopPropagation()
                                  handleUpdateRecordingName()
                                }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="button-ghost"
                                onClick={event => {
                                  event.stopPropagation()
                                  handleCancelRecordingEdit()
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium truncate">{recordingItem.file_name}</p>
                              <p className="text-xs muted">Click to play</p>
                            </>
                          )}
                        </div>
                        {editingRecordingId !== recordingItem.id && (
                          <div className="menu-container" onClick={event => event.stopPropagation()}>
                            <button
                              type="button"
                              className="button-ghost menu-trigger"
                              onClick={event => {
                                event.stopPropagation()
                                setOpenRecordingMenuId(prev => (prev === recordingItem.id ? null : recordingItem.id))
                              }}
                            >
                              <span className="menu-dots" aria-hidden="true">⋯</span>
                              <span className="sr-only">Recording actions</span>
                            </button>
                            {openRecordingMenuId === recordingItem.id && (
                              <div className="menu" onClick={event => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    handleRenameRecording(recordingItem)
                                    setOpenRecordingMenuId(null)
                                  }}
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  className="menu-item menu-danger"
                                  onClick={() => {
                                    handleDeleteRecording(recordingItem.id)
                                    setOpenRecordingMenuId(null)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {previewAudioId === recordingItem.id && previewAudioUrl && (
                        <div className="space-y-3">
                          <audio controls autoPlay className="w-full" src={previewAudioUrl} />
                          <div>
                            <p className="label mb-2">Linked notes</p>
                            {linkedNotesForAudio.length === 0 ? (
                              <p className="text-sm muted">No linked notes yet.</p>
                            ) : (
                              <ul className="space-y-2">
                                {linkedNotesForAudio.map(note => (
                                  <li key={note.id} className="row">
                                    <div className="note-content">
                                      <NoteContent text={note.content} />
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
        <div className="section-header">
          <div className="section-title">
            <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
              <path
                d="M6 5h12v14H6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M9 9h6M9 13h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <h2 className="text-xl font-semibold">Think</h2>
          </div>
        </div>
        <div className="section-divider" />
        <NoteEditor
          value={newNote}
          onChange={setNewNote}
          placeholder="Add a note..."
          className="input note-editor w-full mb-2 min-h-[100px]"
        />
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={newNoteLinkId}
            onChange={event => {
              const value = event.target.value
              setNewNoteLinkId(value)
              if (value) {
                setNewNotePdfId('')
                setNewNoteRecordingId('')
              }
            }}
            className="input flex-1 min-w-[220px]"
            disabled={links.length === 0}
          >
            <option value="">Link to Listen item (optional)</option>
            {links.map(link => (
              <option key={link.id} value={link.id}>
                {link.title || link.url}
              </option>
            ))}
          </select>
          <select
            value={newNotePdfId}
            onChange={event => {
              const value = event.target.value
              setNewNotePdfId(value)
              if (value) {
                setNewNoteLinkId('')
                setNewNoteRecordingId('')
              }
            }}
            className="input flex-1 min-w-[220px]"
            disabled={pdfFiles.length === 0}
          >
            <option value="">Link to Read item (optional)</option>
            {pdfFiles.map(file => (
              <option key={file.id} value={file.id}>
                {file.file_name}
              </option>
            ))}
          </select>
          <select
            value={newNoteRecordingId}
            onChange={event => {
              const value = event.target.value
              setNewNoteRecordingId(value)
              if (value) {
                setNewNoteLinkId('')
                setNewNotePdfId('')
              }
            }}
            className="input flex-1 min-w-[220px]"
            disabled={recordings.length === 0}
          >
            <option value="">Link to Record item (optional)</option>
            {recordings.map(recordingItem => (
              <option key={recordingItem.id} value={recordingItem.id}>
                {recordingItem.file_name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={handleAddNote} className="button-primary mb-6">Save Note</button>
        {notes.length === 0 ? (
          <p className="muted">No notes yet.</p>
        ) : (
          <>
            {globalViewMode === 'table' && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Note</th>
                    <th className="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map(note => (
                    editingNoteId === note.id ? (
                      <tr key={note.id}>
                        <td colSpan={2}>
                          <div className="table-edit">
                            <NoteEditor
                              value={editingNoteContent}
                              onChange={setEditingNoteContent}
                              placeholder="Edit note..."
                              className="input note-editor w-full mb-2 min-h-[100px]"
                            />
                            <div className="flex flex-wrap gap-2 mb-3">
                              <select
                                value={editingNoteLinkId}
                                onChange={event => {
                                  const value = event.target.value
                                  setEditingNoteLinkId(value)
                                  if (value) {
                                    setEditingNotePdfId('')
                                    setEditingNoteRecordingId('')
                                  }
                                }}
                                className="input flex-1 min-w-[220px]"
                                disabled={links.length === 0}
                              >
                                <option value="">Link to Listen item (optional)</option>
                                {links.map(link => (
                                  <option key={link.id} value={link.id}>
                                    {link.title || link.url}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={editingNotePdfId}
                                onChange={event => {
                                  const value = event.target.value
                                  setEditingNotePdfId(value)
                                  if (value) {
                                    setEditingNoteLinkId('')
                                    setEditingNoteRecordingId('')
                                  }
                                }}
                                className="input flex-1 min-w-[220px]"
                                disabled={pdfFiles.length === 0}
                              >
                                <option value="">Link to Read item (optional)</option>
                                {pdfFiles.map(file => (
                                  <option key={file.id} value={file.id}>
                                    {file.file_name}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={editingNoteRecordingId}
                                onChange={event => {
                                  const value = event.target.value
                                  setEditingNoteRecordingId(value)
                                  if (value) {
                                    setEditingNoteLinkId('')
                                    setEditingNotePdfId('')
                                  }
                                }}
                                className="input flex-1 min-w-[220px]"
                                disabled={recordings.length === 0}
                              >
                                <option value="">Link to Record item (optional)</option>
                                {recordings.map(recordingItem => (
                                  <option key={recordingItem.id} value={recordingItem.id}>
                                    {recordingItem.file_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={handleUpdateNote} className="button-primary">
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteId(null)
                                  setEditingNoteContent('')
                                  setEditingNoteLinkId('')
                                  setEditingNotePdfId('')
                                  setEditingNoteRecordingId('')
                                }}
                                className="button-ghost"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={note.id} className="table-row">
                        <td className="table-cell note-preview">
                          <NoteContent text={note.content} />
                        </td>
                        <td className="table-cell table-actions">
                          <div className="menu-container" onClick={event => event.stopPropagation()}>
                            <button
                              type="button"
                              className="button-ghost menu-trigger"
                              onClick={event => {
                                event.stopPropagation()
                                setOpenNoteMenuId(prev => (prev === note.id ? null : note.id))
                              }}
                            >
                              <span className="menu-dots" aria-hidden="true">⋯</span>
                              <span className="sr-only">Note actions</span>
                            </button>
                            {openNoteMenuId === note.id && (
                              <div className="menu" onClick={event => event.stopPropagation()}>
                                <button
                                  type="button"
                                  className="menu-item"
                                  onClick={() => {
                                    handleEditNote(note)
                                    setOpenNoteMenuId(null)
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="menu-item menu-danger"
                                  onClick={() => {
                                    handleDeleteNote(note.id)
                                    setOpenNoteMenuId(null)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
            {globalViewMode === 'grid' && (
              <div className="grid grid-two">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className={`row grid-card ${openNoteMenuId === note.id ? 'row-menu-open' : ''}`}
                  >
                    {editingNoteId === note.id ? (
                      <div className="w-full">
                        <NoteEditor
                          value={editingNoteContent}
                          onChange={setEditingNoteContent}
                          placeholder="Edit note..."
                          className="input note-editor w-full mb-2 min-h-[100px]"
                        />
                        <div className="flex flex-wrap gap-2 mb-3">
                          <select
                            value={editingNoteLinkId}
                            onChange={event => {
                              const value = event.target.value
                              setEditingNoteLinkId(value)
                              if (value) {
                                setEditingNotePdfId('')
                                setEditingNoteRecordingId('')
                              }
                            }}
                            className="input flex-1 min-w-[220px]"
                            disabled={links.length === 0}
                          >
                            <option value="">Link to Listen item (optional)</option>
                            {links.map(link => (
                              <option key={link.id} value={link.id}>
                                {link.title || link.url}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editingNotePdfId}
                            onChange={event => {
                              const value = event.target.value
                              setEditingNotePdfId(value)
                              if (value) {
                                setEditingNoteLinkId('')
                                setEditingNoteRecordingId('')
                              }
                            }}
                            className="input flex-1 min-w-[220px]"
                            disabled={pdfFiles.length === 0}
                          >
                            <option value="">Link to Read item (optional)</option>
                            {pdfFiles.map(file => (
                              <option key={file.id} value={file.id}>
                                {file.file_name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editingNoteRecordingId}
                            onChange={event => {
                              const value = event.target.value
                              setEditingNoteRecordingId(value)
                              if (value) {
                                setEditingNoteLinkId('')
                                setEditingNotePdfId('')
                              }
                            }}
                            className="input flex-1 min-w-[220px]"
                            disabled={recordings.length === 0}
                          >
                            <option value="">Link to Record item (optional)</option>
                            {recordings.map(recordingItem => (
                              <option key={recordingItem.id} value={recordingItem.id}>
                                {recordingItem.file_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleUpdateNote} className="button-primary">
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(null)
                              setEditingNoteContent('')
                              setEditingNoteLinkId('')
                              setEditingNotePdfId('')
                              setEditingNoteRecordingId('')
                            }}
                            className="button-ghost"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="note-content flex-1">
                          <NoteContent text={note.content} />
                        </div>
                        <div className="menu-container" onClick={event => event.stopPropagation()}>
                          <button
                            type="button"
                            className="button-ghost menu-trigger"
                            onClick={event => {
                              event.stopPropagation()
                              setOpenNoteMenuId(prev => (prev === note.id ? null : note.id))
                            }}
                          >
                            <span className="menu-dots" aria-hidden="true">⋯</span>
                            <span className="sr-only">Note actions</span>
                          </button>
                          {openNoteMenuId === note.id && (
                            <div className="menu" onClick={event => event.stopPropagation()}>
                              <button
                                type="button"
                                className="menu-item"
                                onClick={() => {
                                  handleEditNote(note)
                                  setOpenNoteMenuId(null)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="menu-item menu-danger"
                                onClick={() => {
                                  handleDeleteNote(note.id)
                                  setOpenNoteMenuId(null)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            {globalViewMode === 'tabs' && (
              <div className="tabs">
                <div className="tabs-list">
                  {notes.map((note, index) => (
                    <button
                      key={note.id}
                      type="button"
                      className={`tab-trigger ${effectiveActiveNoteTabId === note.id ? 'tab-active' : ''}`}
                      onClick={() => setActiveNoteTabId(note.id)}
                    >
                      {getNoteLabel(note, index)}
                    </button>
                  ))}
                </div>
                <div className="tabs-panel">
                  {(() => {
                    const activeNote = notes.find(note => note.id === effectiveActiveNoteTabId) ?? null
                    if (!activeNote) {
                      return <p className="muted">Choose a note to see details.</p>
                    }
                    if (editingNoteId === activeNote.id) {
                      return (
                        <div className="w-full">
                          <NoteEditor
                            value={editingNoteContent}
                            onChange={setEditingNoteContent}
                            placeholder="Edit note..."
                            className="input note-editor w-full mb-2 min-h-[100px]"
                          />
                          <div className="flex flex-wrap gap-2 mb-3">
                            <select
                              value={editingNoteLinkId}
                              onChange={event => {
                                const value = event.target.value
                                setEditingNoteLinkId(value)
                                if (value) {
                                  setEditingNotePdfId('')
                                  setEditingNoteRecordingId('')
                                }
                              }}
                              className="input flex-1 min-w-[220px]"
                              disabled={links.length === 0}
                            >
                              <option value="">Link to Listen item (optional)</option>
                              {links.map(link => (
                                <option key={link.id} value={link.id}>
                                  {link.title || link.url}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editingNotePdfId}
                              onChange={event => {
                                const value = event.target.value
                                setEditingNotePdfId(value)
                                if (value) {
                                  setEditingNoteLinkId('')
                                  setEditingNoteRecordingId('')
                                }
                              }}
                              className="input flex-1 min-w-[220px]"
                              disabled={pdfFiles.length === 0}
                            >
                              <option value="">Link to Read item (optional)</option>
                              {pdfFiles.map(file => (
                                <option key={file.id} value={file.id}>
                                  {file.file_name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editingNoteRecordingId}
                              onChange={event => {
                                const value = event.target.value
                                setEditingNoteRecordingId(value)
                                if (value) {
                                  setEditingNoteLinkId('')
                                  setEditingNotePdfId('')
                                }
                              }}
                              className="input flex-1 min-w-[220px]"
                              disabled={recordings.length === 0}
                            >
                              <option value="">Link to Record item (optional)</option>
                              {recordings.map(recordingItem => (
                                <option key={recordingItem.id} value={recordingItem.id}>
                                  {recordingItem.file_name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={handleUpdateNote} className="button-primary">
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingNoteId(null)
                                setEditingNoteContent('')
                                setEditingNoteLinkId('')
                                setEditingNotePdfId('')
                                setEditingNoteRecordingId('')
                              }}
                              className="button-ghost"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div className="tabs-content">
                        <div className="note-content">
                          <NoteContent text={activeNote.content} />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => handleEditNote(activeNote)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button-ghost button-danger"
                            onClick={() => handleDeleteNote(activeNote.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </>
        )}
        </div>

        {/* Setlists */}
        <div className="card p-6 mt-6">
        <div className="section-header">
          <div className="section-title">
            <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
              <path
                d="M7 6h10M7 12h10M7 18h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <h2 className="text-xl font-semibold">Setlists</h2>
          </div>
        </div>
        <div className="section-divider" />

        <div className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="label w-32 text-base">Add to:</span>
            <select
              value={selectedSetlistId}
              onChange={e => setSelectedSetlistId(e.target.value)}
              className="input flex-1"
            >
              <option value="">Choose setlist…</option>
              {setlists.map(setlist => (
                <option key={setlist.id} value={setlist.id}>
                  {setlist.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleAddSongToSetlist()}
              disabled={!selectedSetlistId}
              className={`button-primary ${!selectedSetlistId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Add
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="label w-32 text-base">Create new setlist:</span>
            <input
              type="text"
              placeholder="New setlist name"
              value={newSetlistName}
              onChange={e => setNewSetlistName(e.target.value)}
              className="input flex-1"
            />
            <button
              onClick={handleCreateSetlistAndAdd}
              disabled={!newSetlistName.trim() || !session?.user?.id}
              className={`button-ghost ${!newSetlistName.trim() || !session?.user?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Create
            </button>
          </div>
        </div>

        {setlistError && <p className="text-sm text-red-600 mt-2">{setlistError}</p>}
        <div className="mt-4">
          {setlists.length === 0 ? (
            <p className="text-sm muted">No setlists yet.</p>
          ) : (
            <>
              {globalViewMode === 'table' && (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Setlist</th>
                      <th>Status</th>
                      <th className="table-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setlists.map(setlist => {
                      const isInSetlist = songSetlistIds.includes(setlist.id)
                      return (
                        <tr key={setlist.id} className="table-row">
                          <td className="table-cell">{setlist.name}</td>
                          <td className="table-cell">
                            {isInSetlist ? <span className="badge">Added</span> : <span className="muted">Not added</span>}
                          </td>
                          <td className="table-cell table-actions">
                            {!isInSetlist && (
                              <button
                                type="button"
                                className="button-primary"
                                onClick={() => handleAddSongToSetlist(setlist.id)}
                              >
                                Add
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {globalViewMode === 'grid' && (
                <div className="grid grid-two">
                  {setlists.map(setlist => {
                    const isInSetlist = songSetlistIds.includes(setlist.id)
                    return (
                      <div key={setlist.id} className="row grid-card">
                        <div>
                          <p className="text-sm font-medium">{setlist.name}</p>
                          <p className="text-xs muted">{isInSetlist ? 'Added' : 'Not added yet'}</p>
                        </div>
                        {!isInSetlist && (
                          <button
                            type="button"
                            className="button-primary"
                            onClick={() => handleAddSongToSetlist(setlist.id)}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {globalViewMode === 'tabs' && (
                <div className="tabs">
                  <div className="tabs-list">
                    {setlists.map(setlist => (
                      <button
                        key={setlist.id}
                        type="button"
                        className={`tab-trigger ${effectiveActiveSetlistTabId === setlist.id ? 'tab-active' : ''}`}
                        onClick={() => setActiveSetlistTabId(setlist.id)}
                      >
                        {setlist.name}
                      </button>
                    ))}
                  </div>
                  <div className="tabs-panel">
                    {(() => {
                      const activeSetlist =
                        setlists.find(setlist => setlist.id === effectiveActiveSetlistTabId) ?? null
                      if (!activeSetlist) {
                        return <p className="muted">Choose a setlist to see details.</p>
                      }
                      const isInSetlist = songSetlistIds.includes(activeSetlist.id)
                      return (
                        <div className="tabs-content">
                          <div>
                            <p className="text-sm font-medium">{activeSetlist.name}</p>
                            <p className="text-xs muted">{isInSetlist ? 'Song is in this setlist.' : 'Song is not in this setlist.'}</p>
                          </div>
                          {!isInSetlist && (
                            <button
                              type="button"
                              className="button-primary"
                              onClick={() => handleAddSongToSetlist(activeSetlist.id)}
                            >
                              Add to setlist
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

    </div>
  )
}
