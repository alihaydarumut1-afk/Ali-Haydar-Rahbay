import { useEffect, useState } from 'react'
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

function getStorageKey(uid) {
  return uid ? `word-book-entries-${uid}` : 'word-book-entries-anonymous'
}

function loadLocal(uid) {
  try {
    const raw = localStorage.getItem(getStorageKey(uid))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveLocal(uid, words) {
  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify(words))
  } catch {}
}

function createWordEntry({ english, turkish, type, sentence, collocation }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    english: english?.trim() || '',
    turkish: turkish?.trim() || '',
    type: type?.trim() || '',
    sentence: sentence?.trim() || '',
    collocation: collocation?.trim() || '',
    createdAt: new Date().toISOString(),
    repetition: 0,
    interval: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
  }
}

export default function useWords() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeSnapshot = null

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false)
        return
      }

      const uid = user.uid

      const localData = loadLocal(uid)
      if (localData.length > 0) {
        setWords(localData)
      }

      const wordsRef = collection(db, 'users', uid, 'words')
      const q = query(wordsRef, orderBy('createdAt', 'desc'))

      unsubscribeSnapshot = onSnapshot(q,
        (snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
          setWords(data)
          saveLocal(uid, data)
          setLoading(false)
        },
        (error) => {
          console.warn('Firestore bağlantısı yok, localStorage kullanılıyor:', error)
          setWords(loadLocal(uid))
          setLoading(false)
        }
      )
    })

    return () => {
      unsubscribeAuth()
      if (unsubscribeSnapshot) unsubscribeSnapshot()
    }
  }, [])

  const addWord = async (word) => {
    const user = auth.currentUser
    const uid = user?.uid
    const entry = createWordEntry(word)

    const current = loadLocal(uid)
    const updated = [entry, ...current]
    saveLocal(uid, updated)
    setWords(updated)

    if (user) {
      try {
        await setDoc(doc(db, 'users', uid, 'words', entry.id), entry)
      } catch (e) {
        console.warn('Firestore yazma hatası:', e)
      }
    }
  }

  const removeWord = async (id) => {
    const user = auth.currentUser
    const uid = user?.uid

    const updated = loadLocal(uid).filter(w => w.id !== id)
    saveLocal(uid, updated)
    setWords(updated)

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', uid, 'words', id))
      } catch (e) {
        console.warn('Firestore silme hatası:', e)
      }
    }
  }

  const updateWord = async (id, updatedFields) => {
    const user = auth.currentUser
    const uid = user?.uid

    const updated = loadLocal(uid).map(w => w.id === id ? { ...w, ...updatedFields } : w)
    saveLocal(uid, updated)
    setWords(updated)

    if (user) {
      try {
        await setDoc(doc(db, 'users', uid, 'words', id), updatedFields, { merge: true })
      } catch (e) {
        console.warn('Firestore güncelleme hatası:', e)
      }
    }
  }

  return { words, addWord, removeWord, updateWord, loading }
}