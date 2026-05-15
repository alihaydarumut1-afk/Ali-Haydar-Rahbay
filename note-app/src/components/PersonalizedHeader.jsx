import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import RandomWordWidget from './RandomWordWidget.jsx'
import useWords from '../hooks/useWords.js'
import { MoreVertical } from 'lucide-react'

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue]
}

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good Night'
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const DEFAULT_COVER_URL = 'https://images.unsplash.com/photo-1507525428034-b723a9ce6890?q=80&w=2070&auto=format&fit=crop'

const QUOTES = [
  { text: "It is not the brains that matter most, but that which guides them.", author: "Fyodor Dostoevsky" },
  { text: "To have a new language is to have a second soul.", author: "Charlemagne" },
  { text: "Do not wait for the right opportunity: create it.", author: "George Bernard Shaw" },
  { text: "Knowledge is the most beautiful ornament of a human being.", author: "Ali Shariati" }
]

export default function PersonalizedHeader() {
  const { words } = useWords() || { words: [] }
  const masteredCount = words.filter((w) => w.isMastered || w.masteryScore >= 90).length
  const [userName, setUserName] = useLocalStorage('dashboard_userName', 'Student')
  const [coverUrl, setCoverUrl] = useLocalStorage(
    'dashboard_coverUrl',
    DEFAULT_COVER_URL
  )
  const [userAvatar, setUserAvatar] = useLocalStorage('userAvatar', null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [draftName, setDraftName] = useState(userName)
  const [greeting, setGreeting] = useState('')
  const [quote, setQuote] = useState(QUOTES[0])
  const fileInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [isMounted, setIsMounted] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false)
  const navigate = useNavigate()

  const [lastVisitedPath, setLastVisitedPath] = useState('/flashcard')
  const [lastVisitedName, setLastVisitedName] = useState('Flashcards')

  useEffect(() => {
    const savedPath = localStorage.getItem('lastVisitedPage') || '/flashcard'
    setLastVisitedPath(savedPath)
    const PATH_NAMES = {
      '/words': 'Word List',
      '/flashcard': 'Flashcards',
      '/quiz': 'Quiz Mode',
      '/grammar': 'Grammar Notes',
      '/voice': 'Voice Notes',
      '/audio': 'Audio Lab',
      '/reading': 'Reading Center',
      '/speaking-studio': 'Speaking Studio',
      '/writing': 'Writing Lab',
      '/creative-lab': 'Creative Lab',
      '/immersion': 'Media Lab',
    }
    setLastVisitedName(PATH_NAMES[savedPath] || 'Flashcards')
  }, [])

  useEffect(() => {
    setGreeting(getGreeting())
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
    setIsMounted(true)
  }, [])

  const handleNameSave = () => {
    if (draftName.trim()) {
      setUserName(draftName.trim())
    } else {
      setDraftName(userName) // Revert if empty
    }
    setIsEditingName(false)
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUserAvatar(reader.result)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className={`relative mb-12 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Cover Image Section */}
      <div className="group relative h-64 w-full rounded-[2rem] sm:h-[22rem] overflow-hidden shadow-sm">
        <img src={coverUrl} alt="Cover Photo" className="h-full w-full object-cover" />
        
        {/* Sinematik Arka Plan (Cinematic Fade-to-Black) */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/60 to-transparent pointer-events-none" />
        
        <div className="absolute right-6 top-6 z-20" onMouseLeave={() => setIsPhotoMenuOpen(false)}>
          <button
            onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
          >
            <MoreVertical size={20} />
          </button>

          {isPhotoMenuOpen && (
            <div className="absolute right-0 top-12 flex flex-col overflow-hidden rounded-xl bg-white shadow-lg w-40 animate-fade-in">
              <button
                onClick={() => { fileInputRef.current?.click(); setIsPhotoMenuOpen(false); }}
                className="px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Change Cover
              </button>
              {coverUrl !== DEFAULT_COVER_URL && (
                <button
                  onClick={() => { setCoverUrl(DEFAULT_COVER_URL); setIsPhotoMenuOpen(false); }}
                  className="px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  Remove Cover
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Dynamic Quote Overlay */}
        <div className="absolute right-16 top-8 hidden max-w-lg text-right lg:block z-10">
          <p className="cursor-help truncate font-serif text-sm italic text-white/80 drop-shadow-md" title={`"${quote.text}" - ${quote.author}`}>
            "{quote.text}" <span className="ml-1 font-sans text-xs text-white/50">- {quote.author}</span>
          </p>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleCoverChange} accept="image/*" className="hidden" />

        {/* Birleşik Cam İstasyon (Unified Glass Dock) */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between px-6 py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl z-20">
          
          {/* Sol Taraf (Kimlik ve Aksiyon) */}
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                onClick={() => userAvatar ? setIsLightboxOpen(true) : avatarInputRef.current?.click()}
                className={`group relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-full bg-slate-800 shadow-xl ring-2 ring-white/20 transition-all hover:ring-white/40 ${userAvatar ? 'cursor-zoom-in' : 'cursor-pointer'}`}
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <span className="text-3xl font-bold text-slate-400">{userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-900 shadow-md transition hover:scale-110"
                title="Change Photo"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
              </button>
              <input type="file" ref={avatarInputRef} onChange={handleAvatarFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="flex flex-col">
              <p className="text-sm font-medium text-white/60 drop-shadow-sm">{greeting},</p>
              {isEditingName ? (
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  className="w-full bg-transparent py-1 text-xl sm:text-2xl font-bold text-white outline-none border-b border-white/40"
                  autoFocus
                />
              ) : (
                <div className="group/name flex cursor-pointer items-center gap-2" onClick={() => setIsEditingName(true)}>
                  <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">{userName}</h1>
                  <button className="text-white/40 opacity-0 transition group-hover/name:opacity-100 hover:text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => navigate(lastVisitedPath)}
                className="mt-2 w-fit flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-50 transition hover:bg-indigo-500/30 shadow-sm"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Continue: {lastVisitedName}
              </button>
            </div>
          </div>

          {/* Sağ Taraf (Başarı Sayacı ve Rastgele Kelime) */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Öğrenilen Kelime Sayacı */}
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-xl shadow-inner">
                🏆
              </div>
              <div>
                <p className="text-2xl font-black leading-none text-green-400 drop-shadow-sm">{masteredCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mt-0.5">Words Mastered</p>
              </div>
            </div>

            {/* Random Word Widget Entagrasyonu */}
            <div className="hidden lg:block rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm shadow-inner">
              <RandomWordWidget variant="dock" />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && userAvatar && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
        >
          <style>{`
            @keyframes lightboxFadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .lightbox-anim { animation: lightboxFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          `}</style>
          <div 
            className="relative flex w-full max-w-2xl flex-col items-center justify-center lightbox-anim" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 right-0 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:-top-10 sm:-right-10"
              title="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={userAvatar}
              alt="Large Profile"
              className="aspect-square max-h-[75vh] w-auto max-w-[90vw] rounded-full object-cover shadow-2xl ring-8 ring-white/10"
            />
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => {
                  avatarInputRef.current?.click()
                  setIsLightboxOpen(false)
                }}
                className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                Change Photo
              </button>
              <button
                onClick={() => {
                  setUserAvatar(null)
                  setIsLightboxOpen(false)
                }}
                className="flex items-center gap-2 rounded-xl bg-rose-500/90 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}