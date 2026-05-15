import { useState, useEffect, useRef } from 'react'
import { Volume2, Loader2 } from 'lucide-react'

export default function PronunciationButton({ text, lang = 'en-US' }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef(null)
  const isMounted = useRef(true) // Bileşenin sayfada olup olmadığını takip eder

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
      // Sayfadan çıkıldığında çalan sesi temizle
      if (audioRef.current) {
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current.pause()
        audioRef.current.removeAttribute('src')
        audioRef.current.load()
      }
    }
  }, [])

  const handlePlay = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!text || isLoading) return // isPlaying kilitlenmesini engellemek için kaldırıldı

    // O an çalan tüm sesleri sustur
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }

    try {
        setIsLoading(true)
        let audioSource = ''
        let blobToPlay = null

        const apiKey = localStorage.getItem('geminiApiKey')
        if (apiKey && apiKey.startsWith('sk-')) {
          const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'tts-1', voice: lang === 'en-GB' ? 'onyx' : 'alloy', input: text })
          })
          if (response.ok) blobToPlay = await response.blob()
        }
        
        if (!blobToPlay) {
          const googleUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text)}`
          const res = await fetch(googleUrl)
          if (res.ok) blobToPlay = await res.blob()
        }

        if (blobToPlay) {
          if (!isMounted.current) return
          audioSource = URL.createObjectURL(blobToPlay)
        } else {
          throw new Error('Hiçbir API okumayı başaramadı.')
        }

      if (!isMounted.current) return // Sayfadan çıkıldıysa çalmayı iptal et

      const audio = new Audio(audioSource)
      audioRef.current = audio

      setIsLoading(false)
      setIsPlaying(true)

      audio.onended = () => {
        if (!isMounted.current) return
        setIsPlaying(false)
        URL.revokeObjectURL(audioSource) // Hafıza tasarrufu için oynatılınca sil
      }
      
      audio.onerror = () => {
        if (!isMounted.current) return
        setIsPlaying(false)
        URL.revokeObjectURL(audioSource)
      }

      await audio.play().catch((err) => {
        if (!isMounted.current) return
        setIsPlaying(false)
        URL.revokeObjectURL(audioSource)
      })

    } catch (err) {
      if (!isMounted.current) return
      setIsLoading(false)
      setIsPlaying(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      title="Sesli Okunuşu Dinle"
      disabled={isLoading}
      className={`p-2 rounded-full transition-all duration-200 focus:outline-none flex items-center justify-center ${
        isLoading
          ? 'text-indigo-400 bg-indigo-50 cursor-wait'
          : isPlaying
          ? 'text-blue-600 bg-blue-50 animate-pulse'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} />}
    </button>
  )
}