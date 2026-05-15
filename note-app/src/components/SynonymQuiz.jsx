import { useEffect, useState } from 'react'
import shuffleArray from '../utils/shuffle.js'

export default function SynonymQuiz({ words }) {
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const generateQuestions = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Soru havuzu için kelimeleri karıştır ve rastgele 15 tanesini seç
        const shuffledWords = shuffleArray(words).slice(0, 15)

        // Seçilen kelimelerin eş anlamlılarını Datamuse API'den eşzamanlı (paralel) olarak çek
        const fetchedData = await Promise.all(
          shuffledWords.map(async (word) => {
            const query = word.english.trim().replace(/\s+/g, '+')
            const res = await fetch(`https://api.datamuse.com/words?rel_syn=${query}&max=5`)
            if (!res.ok) throw new Error('API Hatası')
            const data = await res.json()
            return { word, synonyms: data.map((d) => d.word) }
          })
        )

        if (!isMounted) return

        // Sadece API'de eş anlamlısı bulunan kelimeleri filtrele
        const validItems = fetchedData.filter((item) => item.synonyms.length > 0)

        if (validItems.length < 4) {
          setError(
            'Eş anlamlı testi üretebilmek için listenizde Datamuse veritabanında karşılığı olan en az 4 İngilizce kelime bulunmalıdır.'
          )
          setIsLoading(false)
          return
        }

        // Soru Destesini Oluştur (Akıllı Çeldirici Mantığı ile)
        const deck = validItems.map((item) => {
          const correctSynonym = item.synonyms[Math.floor(Math.random() * item.synonyms.length)]

          // Çeldiriciler için listedeki DİĞER kelimelerin eş anlamlılarını bul
          const otherItems = validItems.filter((other) => other.word.id !== item.word.id)
          const shuffledOthers = shuffleArray(otherItems).slice(0, 3)

          const distractors = []
          for (const other of shuffledOthers) {
            // Doğru cevapla aynı kelimenin şıklara düşmemesi için güvenlik filtresi
            const available = other.synonyms.filter(
              (s) => s !== correctSynonym && !distractors.includes(s)
            )
            if (available.length > 0) {
              distractors.push(available[Math.floor(Math.random() * available.length)])
            } else {
              distractors.push(other.synonyms[0] || 'unknown')
            }
          }

          // Doğru cevabı ve çeldiricileri birleştirip karıştır
          const options = shuffleArray([
            { text: correctSynonym, isCorrect: true },
            ...distractors.map((d) => ({ text: d, isCorrect: false })),
          ])

          return {
            targetWord: item.word,
            correctSynonym,
            options,
          }
        })

        setQuestions(deck)
      } catch (err) {
        if (isMounted) setError('Sorular hazırlanırken bir hata oluştu. İnternet bağlantınızı kontrol edin.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    generateQuestions()

    return () => {
      isMounted = false
    }
  }, [words])

  const currentQuestion = questions[currentIndex]

  const handleSelect = (option) => {
    if (selectedOption) return
    setSelectedOption(option)
  }

  const handleNext = () => {
    setSelectedOption(null)
    setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <svg className="mb-4 h-10 w-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="animate-pulse font-medium">Datamuse API'den eş anlamlı kelimeler çekiliyor...</p>
      </div>
    )
  }

  if (error) return <div className="py-12 text-center"><p className="text-lg font-medium text-rose-600">{error}</p></div>
  if (!currentQuestion) return null

  return (
    <div className="animate-fade-in">
      <p className="mb-6 text-sm font-medium text-slate-500">Soru {currentIndex + 1} / {questions.length}</p>
      <div className="mb-12 text-center">
        <p className="mb-3 text-lg font-semibold text-slate-500 dark:text-zinc-400 eye-care:text-amber-800">Which word is closest in meaning to:</p>
        <h3 className="text-4xl font-extrabold uppercase tracking-[0.15em] text-slate-900 dark:text-zinc-50 eye-care:text-amber-950 sm:text-5xl">{currentQuestion.targetWord.english}</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedOption === option
          const isRevealed = selectedOption !== null
          let stateClasses = 'border-slate-200 bg-zinc-50 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50 hover:-translate-y-1 hover:shadow-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-indigo-900/30 dark:hover:border-indigo-500 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:text-amber-950 eye-care:hover:bg-[#F4ECD8] eye-care:hover:border-amber-400'
          if (isRevealed) {
            if (option.isCorrect) stateClasses = 'border-emerald-500 bg-emerald-500 text-white shadow-md dark:bg-emerald-600 dark:border-emerald-600 eye-care:bg-emerald-600 eye-care:border-emerald-600'
            else if (isSelected && !option.isCorrect) stateClasses = 'border-rose-500 bg-rose-500 text-white shadow-md dark:bg-rose-600 dark:border-rose-600 eye-care:bg-rose-600 eye-care:border-rose-600'
            else stateClasses = 'border-slate-200 bg-slate-50 text-slate-400 opacity-50 dark:bg-zinc-800/50 dark:border-zinc-800 dark:text-zinc-500 eye-care:border-[#EAE0C8] eye-care:bg-transparent eye-care:text-amber-900/50'
          }
          return <button key={index} onClick={() => handleSelect(option)} disabled={isRevealed} className={`rounded-2xl border px-6 py-5 text-lg font-bold capitalize transition-all duration-300 ${stateClasses}`}>{option.text}</button>
        })}
      </div>
      {selectedOption && (
        <div className="mt-8 animate-fade-in space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 text-center shadow-inner">
            <p className="text-base font-semibold text-indigo-900 sm:text-lg dark:text-indigo-300 eye-care:text-amber-900"><span className="uppercase">{currentQuestion.targetWord.english}</span> = <span className="uppercase">{currentQuestion.correctSynonym}</span> = <span className="font-bold text-indigo-700 dark:text-indigo-400 eye-care:text-amber-700">{currentQuestion.targetWord.turkish}</span></p>
          </div>
          <div className="flex justify-end"><button onClick={handleNext} disabled={currentIndex === questions.length - 1} className="rounded-2xl bg-slate-950 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white eye-care:bg-amber-900 eye-care:hover:bg-amber-800">{currentIndex === questions.length - 1 ? 'Test Bitti' : 'Sonraki Soru'}</button></div>
        </div>
      )}
    </div>
  )
}