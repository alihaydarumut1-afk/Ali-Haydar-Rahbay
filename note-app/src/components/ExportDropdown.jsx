import { useState, useRef, useEffect } from 'react'

export default function ExportDropdown({ content, targetWords, type, title }) {
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = (moduleName, storageKey) => {
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const newItem = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        content,
        targetWords: targetWords || [],
        type: type || 'Lab',
        title: title || 'Lab Üretimi',
        createdAt: new Date().toISOString()
      }
      // Yeni öğeyi başa ekle
      localStorage.setItem(storageKey, JSON.stringify([newItem, ...current]))
      window.dispatchEvent(new Event(`${storageKey}-updated`))

      setToast(`Metin başarıyla ${moduleName} modülüne aktarıldı!`)
      setTimeout(() => setToast(null), 3000)
      setIsOpen(false)
    } catch (err) {
      console.error('Aktarım hatası', err)
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
        title="Diğer modüllere aktar"
      >
        📤 Aktar
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl z-50">
          <button onClick={() => handleExport('Reading', 'reading_imported_texts')} className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700">📖 Reading'e Aktar</button>
          <button onClick={() => handleExport('Grammar', 'grammar_imported_tasks')} className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700">🧩 Grammar'a Aktar</button>
          <button onClick={() => handleExport('Voice Notes', 'voice_imported_scripts')} className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700">🎙️ Voice Notes'a Aktar</button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-xl animate-fade-in">{toast}</div>
      )}
    </div>
  )
}