import { useEffect, useState } from 'react'

const STORAGE_KEY = 'note-app-notes'

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function createNotePayload(note) {
  const timestamp = new Date().toISOString()
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: note.title.trim(),
    content: note.content.trim(),
    updatedAt: timestamp,
  }
}

export default function useNotes() {
  const [notes, setNotes] = useState(loadNotes)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const addNote = (note) => {
    const nextNote = createNotePayload(note)
    setNotes((current) => [nextNote, ...current])
  }

  const updateNote = (id, note) => {
    setNotes((current) =>
      current.map((item) =>
        item.id === id ? { ...item, title: note.title.trim(), content: note.content.trim(), updatedAt: new Date().toISOString() } : item,
      ),
    )
  }

  const deleteNote = (id) => {
    setNotes((current) => current.filter((item) => item.id !== id))
  }

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
  }
}
