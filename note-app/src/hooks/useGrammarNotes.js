import { useEffect, useState } from 'react'

const STORAGE_KEY = 'grammarNotes'

function loadGrammarNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function createGrammarNote({ title, content }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
}

export default function useGrammarNotes() {
  const [notes, setNotes] = useState(loadGrammarNotes)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const addNote = (note) => {
    const newNote = createGrammarNote(note)
    setNotes((current) => [newNote, ...current])
    return newNote.id
  }

  const updateNote = (id, note) => {
    setNotes((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, title: note.title.trim(), content: note.content.trim(), updatedAt: new Date().toISOString() }
          : item,
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
