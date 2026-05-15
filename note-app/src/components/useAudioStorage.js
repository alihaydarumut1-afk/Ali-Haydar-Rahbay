import { useState, useEffect, useCallback } from 'react'

const DB_NAME = 'AudioStorageDB'
const STORE_NAME = 'shared_audios'

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export default function useAudioStorage() {
  const [storedAudios, setStoredAudios] = useState([])

  const loadAudios = useCallback(async () => {
    try {
      const db = await initDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => {
        const data = request.result || []
        setStoredAudios(data.sort((a, b) => b.createdAt - a.createdAt))
      }
    } catch (e) {
      console.error('IDB load error', e)
    }
  }, [])

  useEffect(() => {
    loadAudios()
  }, [loadAudios])

  const saveAudioToDB = async (audioObj) => {
    const db = await initDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(audioObj)
    tx.oncomplete = () => loadAudios()
  }

  const deleteAudioFromDB = async (id) => {
    const db = await initDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => loadAudios()
  }

  return { storedAudios, saveAudioToDB, deleteAudioFromDB, reloadAudios: loadAudios }
}