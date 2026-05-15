import { useState, useEffect, useCallback } from 'react'
import useWords from '../hooks/useWords.js'

export default function FlashcardMode() {
  const { words = [] } = useWords() || {}
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const currentWord = words[currentIndex]

  const handleNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setIsFlipped(false)
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
      }, 200)
    }
  }, [currentIndex, words.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false)
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1)
      }, 200)
    }
  }, [currentIndex])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsFlipped(prev => !prev)
      } else if (e.code === 'ArrowRight') {
        handleNext()
      } else if (e.code === 'ArrowLeft') {
        handlePrev()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev])

  if (!words || words.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-zinc-700">Hiç kelime yok.</h2>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full bg-zinc-50 p-6">
      {/* Üst Sayaç */}
      <div className="mb-6 text-lg font-medium text-zinc-500">
        Card {currentIndex + 1} of {words.length}
      </div>

      <div 
        className="relative w-full max-w-xl h-[400px] [perspective:1000px] mx-auto cursor-pointer" 
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          
          {/* Ön Yüz */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-white rounded-3xl shadow-lg border border-zinc-100 flex flex-col items-center justify-center p-8">
            {currentWord.type && (
              <span className="absolute top-6 right-6 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase">
                {currentWord.type}
              </span>
            )}
            <h3 className="text-5xl font-bold text-zinc-800">{currentWord.english}</h3>
          </div>

          {/* Arka Yüz */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white rounded-3xl shadow-lg border border-zinc-100 flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-3xl font-semibold text-zinc-800">{currentWord.turkish}</h3>
            {currentWord.sentence && (
              <>
                <div className="w-16 h-[1px] bg-gray-300 my-6"></div>
                <p className="italic text-gray-600 text-lg">"{currentWord.sentence}"</p>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}