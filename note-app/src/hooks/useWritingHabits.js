import { useEffect, useState } from 'react'

const STORAGE_KEY = 'writingHabit'

function loadWritings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function createWritingEntry({ text, analysis }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: text.trim(),
    analysis,
    createdAt: new Date().toISOString(),
  }
}

export default function useWritingHabits() {
  const [writings, setWritings] = useState(loadWritings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(writings))
  }, [writings])

  const addWriting = (writing) => {
    setWritings((current) => [createWritingEntry(writing), ...current])
  }

  const updateWriting = (id, updatedWriting) => {
    setWritings((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...updatedWriting } : entry))
    )
  }

  const removeWriting = (id) => {
    setWritings((current) => current.filter((entry) => entry.id !== id))
  }

  return {
    writings,
    addWriting,
    updateWriting,
    removeWriting,
  }
}
