import { useState, useRef, useEffect } from 'react'

export default function ActionsDropdown({ onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        title="İşlemler"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-10 dark:bg-zinc-900 dark:border-zinc-700">
          <button
            onClick={() => {
              onEdit()
              setIsOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg transition dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Düzenle
          </button>
          <button
            onClick={() => {
              onDelete()
              setIsOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg transition dark:text-red-400 dark:hover:bg-red-900/30"
          >
            Sil
          </button>
        </div>
      )}
    </div>
  )
}