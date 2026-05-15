import { useState, useEffect } from 'react'
import useWords from '../hooks/useWords.js'

export default function RandomWordWidget({ variant }) {
  const { words } = useWords()
  const [currentWord, setCurrentWord] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const [isBlurEnabled, setIsBlurEnabled] = useState(() => {
    const saved = localStorage.getItem('noteapp_blur_enabled')
    return saved !== null ? JSON.parse(saved) : true
  })

  useEffect(() => {
    const handleBlurChange = () => {
      const saved = localStorage.getItem('noteapp_blur_enabled')
      setIsBlurEnabled(saved !== null ? JSON.parse(saved) : true)
    }
    window.addEventListener('blur_setting_changed', handleBlurChange)
    return () => window.removeEventListener('blur_setting_changed', handleBlurChange)
  }, [])

  // İlk yüklemede rastgele bir kelime seç
  useEffect(() => {
    if (words && words.length > 0 && !currentWord) {
      pickRandomWord()
    }
  }, [words])

  const pickRandomWord = () => {
    if (!words || words.length === 0) return
    
    setIsAnimating(true)
    
    // Ufak bir fade-out/fade-in gecikmesi için setTimeout
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * words.length)
      setCurrentWord(words[randomIndex])
      setIsAnimating(false)
    }, 200)
  }

  // Eğer henüz hiç kelime kaydedilmemişse widget'ı gizle
  if (!words || words.length === 0) return null

  return (
    <div className={`group flex cursor-help items-center transition-all ${
      variant === 'dock' ? 'gap-3 px-2 py-1' : 'gap-4 rounded-2xl border border-white/40 bg-white/60 px-5 py-3 shadow-xl backdrop-blur-md hover:bg-white/80 dark:border-white/10 dark:bg-slate-900/60'
    }`}>
      <button
        onClick={pickRandomWord}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-all hover:scale-110 focus:outline-none ${variant === 'dock' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 dark:bg-indigo-400/20 dark:text-indigo-300'}`}
        title="Başka bir kelime getir"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width={variant === 'dock' ? '16' : '18'} height={variant === 'dock' ? '16' : '18'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="12" height="12" x="2" y="10" rx="2" ry="2" />
          <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" />
          <path d="M6 18h.01" /><path d="M10 14h.01" /><path d="M15 6h.01" /><path d="M18 9h.01" />
        </svg>
      </button>
      
      <div className={`flex items-center transition-opacity duration-200 ${variant === 'dock' ? 'gap-3' : 'gap-4'} ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        <span className={`font-bold ${variant === 'dock' ? 'text-base text-white drop-shadow-md' : 'text-lg text-slate-900 dark:text-slate-100'}`}>{currentWord?.english}</span>
        <div className={`h-5 w-px ${variant === 'dock' ? 'bg-white/20' : 'bg-slate-400/40 dark:bg-slate-600/50'}`}></div>
        {isBlurEnabled ? (
          <div className="relative inline-block w-fit">
            <span className={`invisible font-medium ${variant === 'dock' ? 'text-sm' : 'text-base'}`}>{currentWord?.turkish}</span>
            <span className={`absolute inset-0 select-none font-medium opacity-70 blur-[6px] transition-all duration-300 group-hover:select-text group-hover:opacity-100 group-hover:blur-none ${variant === 'dock' ? 'text-sm text-white/70 drop-shadow-md' : 'text-base text-slate-700 dark:text-slate-300'}`}>
              {currentWord?.turkish}
            </span>
          </div>
        ) : (
          <span className={`font-medium ${variant === 'dock' ? 'text-sm text-white/90 drop-shadow-md' : 'text-base text-slate-700 dark:text-slate-300'}`}>{currentWord?.turkish}</span>
        )}
      </div>
    </div>
  )
}