import { useEffect, useState } from 'react'
import Dexie from 'dexie'

const db = new Dexie('audioLabDB')
db.version(1).stores({ audioFiles: '++id,name,type,date' })

export default function useAudioFiles() {
  const [audioFiles, setAudioFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadFiles() {
      const files = await db.audioFiles.orderBy('date').reverse().toArray()
      if (!cancelled) {
        setAudioFiles(files)
        setLoading(false)
      }
    }

    loadFiles()

    return () => {
      cancelled = true
    }
  }, [])

  const addAudioFile = async (file) => {
    const blob = await file.arrayBuffer().then((buffer) => new Blob([buffer], { type: file.type }))
    const record = {
      name: file.name,
      type: file.type,
      date: new Date().toISOString(),
      blob,
    }
    await db.audioFiles.add(record)
    const files = await db.audioFiles.orderBy('date').reverse().toArray()
    setAudioFiles(files)
  }

  const deleteAudioFile = async (id) => {
    await db.audioFiles.delete(id)
    const files = await db.audioFiles.orderBy('date').reverse().toArray()
    setAudioFiles(files)
  }

  return {
    audioFiles,
    loading,
    addAudioFile,
    deleteAudioFile,
  }
}
