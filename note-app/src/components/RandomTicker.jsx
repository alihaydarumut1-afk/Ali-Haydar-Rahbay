import { useEffect, useState } from 'react'
import PronunciationButton from './PronunciationButton.jsx'

export default function RandomTicker({ words }) {
  const [currentWord, setCurrentWord] = useState(null)

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

  useEffect(() => {
    if (!words || words.length === 0) {
      setCurrentWord(null)
      return
    }

    const pickRandomWord = (previousWord) => {
      if (words.length === 1) {
        return words[0]
      }

      let nextWord = previousWord
      while (nextWord?.id === previousWord?.id) {
        const randomIndex = Math.floor(Math.random() * words.length)
        nextWord = words[randomIndex]
      }
      return nextWord
    }

    setCurrentWord((prev) => pickRandomWord(prev))

    const interval = setInterval(() => {
      setCurrentWord((prev) => pickRandomWord(prev))
    }, 15000)

    return () => clearInterval(interval)
  }, [words])

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Reminder</p>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
          Random Kart
        </span>
      </div>

      {currentWord ? (
        <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition-all hover:border-slate-300 hover:shadow-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold text-slate-950">{currentWord.english}</p>
                <PronunciationButton text={currentWord.english} />
              </div>
              {isBlurEnabled ? (
                <div className="relative mt-1 inline-block w-fit cursor-help">
                  <span className="invisible text-sm font-medium">{currentWord.turkish}</span>
                  <span className="absolute inset-0 select-none text-sm font-medium text-slate-500 opacity-70 blur-[6px] transition-all duration-300 group-hover:select-text group-hover:opacity-100 group-hover:blur-none">
                    {currentWord.turkish}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-sm font-medium text-slate-500">{currentWord.turkish}</div>
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              currentWord.type === 'Noun'
                ? 'bg-emerald-100 text-emerald-800'
                : currentWord.type === 'Verb'
                ? 'bg-sky-100 text-sky-800'
                : currentWord.type === 'Adjective'
                ? 'bg-violet-100 text-violet-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {currentWord.type}
            </span>
          </div>
          <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700">
            <p className="font-semibold">Anlam</p>
            {isBlurEnabled ? (
              <div className="relative mt-2 inline-block w-fit cursor-help">
                <p className="invisible leading-7 font-medium">{currentWord.turkish}</p>
                <p className="absolute inset-0 select-none leading-7 font-medium text-slate-700 opacity-70 blur-[6px] transition-all duration-300 group-hover:select-text group-hover:opacity-100 group-hover:blur-none">
                  {currentWord.turkish}
                </p>
              </div>
            ) : (
              <p className="mt-2 leading-7 font-medium text-slate-700">{currentWord.turkish}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-5 text-center text-slate-500">
          <p className="font-semibold">Henüz kelime yok</p>
          <p className="mt-2 text-sm">Kelime eklediğinizde burada hatırlatıcı kart gösterilecektir.</p>
        </div>
      )}
    </div>
  )
}
