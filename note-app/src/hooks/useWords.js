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

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createEntry({ turkish, type, sentence, collocation }) {
  return {
    partOfSpeech: type?.trim() || '',
    turkish: turkish?.trim() || '',
    sentence: sentence?.trim() || '',
    collocation: collocation?.trim() || '',
  }
}

export default function useWords() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribeSnapshot = null

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return }

      const uid = user.uid
      const localData = loadLocal(uid)
      if (localData.length > 0) setWords(localData)

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

  const addWord = async ({ english, turkish, type, sentence, collocation }) => {
    const user = auth.currentUser
    const uid = user?.uid
    const current = loadLocal(uid)

    // UPSERT: Aynı kelime var mı? (büyük/küçük harf fark etmez)
    const existingIndex = current.findIndex(
      w => w.english.toLowerCase() === english.trim().toLowerCase()
    )

    let updated

    if (existingIndex !== -1) {
      // Kelime zaten var → entries dizisine yeni anlam ekle
      const existing = current[existingIndex]
      const newEntry = createEntry({ turkish, type, sentence, collocation })

      // Aynı tür zaten eklenmiş mi kontrol et
      const alreadyExists = existing.entries?.some(
        e => e.partOfSpeech.toLowerCase() === newEntry.partOfSpeech.toLowerCase() &&
             e.turkish.toLowerCase() === newEntry.turkish.toLowerCase()
      )

      if (alreadyExists) {
        alert(`"${english}" kelimesinin bu türü ve anlamı zaten eklenmiş.`)
        return
      }

      const updatedWord = {
        ...existing,
        entries: [...(existing.entries || []), newEntry],
        // Geriye dönük uyumluluk: ilk entry'yi ana alanlara yansıt
        turkish: existing.entries?.[0]?.turkish || turkish?.trim() || '',
        type: existing.entries?.[0]?.partOfSpeech || type?.trim() || '',
        sentence: existing.entries?.[0]?.sentence || sentence?.trim() || '',
      }

      updated = current.map((w, i) => i === existingIndex ? updatedWord : w)

      if (user) {
        try {
          await setDoc(doc(db, 'users', uid, 'words', updatedWord.id), updatedWord)
        } catch (e) {
          console.warn('Firestore güncelleme hatası:', e)
        }
      }
    } else {
      // Yeni kelime → sıfırdan oluştur
      const newWord = {
        id: generateId(),
        english: english?.trim() || '',
        entries: [createEntry({ turkish, type, sentence, collocation })],
        // Geriye dönük uyumluluk
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

      updated = [newWord, ...current]

      if (user) {
        try {
          await setDoc(doc(db, 'users', uid, 'words', newWord.id), newWord)
        } catch (e) {
          console.warn('Firestore yazma hatası:', e)
        }
      }
    }

    saveLocal(uid, updated)
    setWords(updated)
  }

  const removeWord = async (id) => {
    const user = auth.currentUser
    const uid = user?.uid
    const updated = loadLocal(uid).filter(w => w.id !== id)
    saveLocal(uid, updated)
    setWords(updated)
    if (user) {
      try { await deleteDoc(doc(db, 'users', uid, 'words', id)) }
      catch (e) { console.warn('Firestore silme hatası:', e) }
    }
  }

  const updateWord = async (id, updatedFields) => {
    const user = auth.currentUser
    const uid = user?.uid
    const updated = loadLocal(uid).map(w => w.id === id ? { ...w, ...updatedFields } : w)
    saveLocal(uid, updated)
    setWords(updated)
    if (user) {
      try { await setDoc(doc(db, 'users', uid, 'words', id), updatedFields, { merge: true }) }
      catch (e) { console.warn('Firestore güncelleme hatası:', e) }
    }
  }

  return { words, addWord, removeWord, updateWord, loading }
}