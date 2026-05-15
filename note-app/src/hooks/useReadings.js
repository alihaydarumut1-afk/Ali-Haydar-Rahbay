import { useEffect, useState } from 'react'

const STORAGE_KEY = 'readings'

function loadReadings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function createReading({ text, level, questions, advancedVocab }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: text.trim(),
    level,
    questions,
    advancedVocab,
    createdAt: new Date().toISOString(),
  }
}

export default function useReadings() {
  const [readings, setReadings] = useState(loadReadings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readings))
  }, [readings])

  const addReading = (reading) => {
    setReadings((current) => [createReading(reading), ...current])
  }

  const deleteReading = (id) => {
    setReadings((current) => current.filter((item) => item.id !== id))
  }

  const updateReading = (id, updatedReading) => {
    setReadings((current) =>
      current.map((reading) =>
        reading.id === id ? { ...reading, ...updatedReading } : reading
      )
    )
  }

  return {
    readings,
    addReading,
    deleteReading,
    updateReading,
  }
}
