import Dexie from 'dexie'
import { useEffect, useState } from 'react'

const db = new Dexie('VoiceNotesDB')
db.version(1).stores({ voiceNotes: 'id,createdAt,duration' })

function createVoiceNoteRecord({ id, audioBlob, duration, createdAt, analysis, mimeType }) {
  return {
    id,
    blob: audioBlob,
    duration,
    createdAt,
    analysis: analysis || null,
    mimeType,
  }
}

function createStateNote({ id, audioBlob, duration, createdAt, analysis, mimeType }) {
  return {
    id,
    audioBlob,
    audioUrl: URL.createObjectURL(audioBlob),
    duration,
    createdAt,
    analysis: analysis || null,
    mimeType,
  }
}

export default function useVoiceNotes() {
  const [notes, setNotes] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadNotes() {
      try {
        const stored = await db.voiceNotes.toArray()
        if (!isMounted) return

        const loaded = stored.map((item) => createStateNote({
          id: item.id,
          audioBlob: item.blob,
          duration: item.duration,
          createdAt: item.createdAt,
          analysis: item.analysis,
          mimeType: item.mimeType,
        }))

        setNotes(loaded.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      } catch (error) {
        console.error('IndexedDB load failed:', error)
      }
    }

    loadNotes()

    return () => {
      isMounted = false
    }
  }, [])

  const addVoiceNote = async ({ audioBlob, duration, createdAt, analysis, mimeType }) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const stateNote = createStateNote({ id, audioBlob, duration, createdAt, analysis, mimeType })

    setNotes((current) => [stateNote, ...current])

    try {
      await db.voiceNotes.add(createVoiceNoteRecord({
        id,
        audioBlob,
        duration,
        createdAt: stateNote.createdAt,
        analysis,
        mimeType,
      }))
    } catch (error) {
      console.error('IndexedDB save failed:', error)
    }
  }

  const updateVoiceNote = async (id, updatedFields) => {
    setNotes((current) =>
      current.map((note) =>
        note.id === id ? { ...note, ...updatedFields } : note
      )
    )

    try {
      const existing = await db.voiceNotes.get(id)
      if (!existing) return
      await db.voiceNotes.put({
        ...existing,
        ...updatedFields,
      })
    } catch (error) {
      console.error('IndexedDB update failed:', error)
    }
  }

  const deleteVoiceNote = async (id) => {
    setNotes((current) => current.filter((item) => item.id !== id))

    try {
      await db.voiceNotes.delete(id)
    } catch (error) {
      console.error('IndexedDB delete failed:', error)
    }
  }

  return {
    notes,
    addVoiceNote,
    updateVoiceNote,
    deleteVoiceNote,
  }
}
