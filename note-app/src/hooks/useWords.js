import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'word-book-entries'

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function createWordEntry({ english, turkish, type, sentence }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    english: english.trim(),
    turkish: turkish.trim(),
    type: type.trim(),
    sentence: sentence.trim(),
    createdAt: new Date().toISOString(),
    repetition: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
  }
}

export default function useWords() {
  const [words, setWords] = useState(loadWords)

  const reloadWords = useCallback(() => {
    setWords(loadWords())
  }, [])

  useEffect(() => {
    window.addEventListener('storage', reloadWords)
    window.addEventListener('words-updated', reloadWords)
    return () => {
      window.removeEventListener('storage', reloadWords)
      window.removeEventListener('words-updated', reloadWords)
    }
  }, [reloadWords])

  const addWord = (word) => {
    const current = loadWords()
    const updated = [createWordEntry(word), ...current]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('words-updated'))
    setWords(updated)
  }

  const removeWord = (id) => {
    const current = loadWords()
    const updated = current.filter((item) => item.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('words-updated'))
    setWords(updated)
  }

  const updateWord = (id, updatedWord) => {
    const current = loadWords()
    const updated = current.map((word) => word.id === id ? { ...word, ...updatedWord } : word)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('words-updated'))
    setWords(updated)
  }

  return {
    words,
    addWord,
    removeWord,
    updateWord,
  }
}
