import { useState, useEffect } from 'react'

export default function useSavedCreations() {
  const [creations, setCreations] = useState([])

  const loadCreations = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedCreations') || '[]')
      setCreations(Array.isArray(saved) ? saved : [])
    } catch (error) {
      console.error('Creative Lab verileri yüklenirken hata oluştu:', error)
      setCreations([])
    }
  }

  useEffect(() => {
    loadCreations()
    
    // Diğer sekmelerdeki (veya aynı sekmedeki özel) değişiklikleri dinle
    window.addEventListener('storage', loadCreations)
    window.addEventListener('lab-creations-updated', loadCreations)

    return () => {
      window.removeEventListener('storage', loadCreations)
      window.removeEventListener('lab-creations-updated', loadCreations)
    }
  }, [])

  const addCreation = (newCreation) => {
    try {
      const parsed = JSON.parse(localStorage.getItem('savedCreations') || '[]')
      const current = Array.isArray(parsed) ? parsed : []
      const creationWithId = {
        ...newCreation,
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        createdAt: new Date().toISOString()
      }
      const updated = [creationWithId, ...current]
      localStorage.setItem('savedCreations', JSON.stringify(updated))
      
      // Diğer sekmelerin anında haberdar olması için tetikleme (Event) fırlatıyoruz
      window.dispatchEvent(new Event('lab-creations-updated'))
      setCreations(updated)
    } catch (error) {
      console.error('Kayıt eklenirken hata:', error)
    }
  }

  const removeCreation = (id) => {
    try {
      const parsed = JSON.parse(localStorage.getItem('savedCreations') || '[]')
      const current = Array.isArray(parsed) ? parsed : []
      const updated = current.filter(c => c && c.id !== id)
      localStorage.setItem('savedCreations', JSON.stringify(updated))
      
      window.dispatchEvent(new Event('lab-creations-updated'))
      setCreations(updated)
    } catch (error) {
      console.error('Kayıt silinirken hata:', error)
    }
  }

  const updateCreation = (id, updatedFields) => {
    try {
      const parsed = JSON.parse(localStorage.getItem('savedCreations') || '[]')
      const current = Array.isArray(parsed) ? parsed : []
      const updated = current.map(c => 
        c && c.id === id ? { ...c, ...updatedFields } : c
      )
      localStorage.setItem('savedCreations', JSON.stringify(updated))
      
      window.dispatchEvent(new Event('lab-creations-updated'))
      setCreations(updated)
    } catch (error) {
      console.error('Kayıt güncellenirken hata:', error)
    }
  }

  const dialogues = (Array.isArray(creations) ? creations : []).filter(c => {
    const t = c.type ? c.type.toLowerCase() : ''
    return t.includes('dialogue') || t.includes('diyalog') || t.includes('günlük')
  })
  const readingMaterials = (Array.isArray(creations) ? creations : []).filter(c => {
    const t = c.type ? c.type.toLowerCase() : ''
    return t.includes('academic') || t.includes('akademik') || t.includes('news') || t.includes('gazete')
  })

  return { creations, dialogues, readingMaterials, addCreation, removeCreation, updateCreation }
}