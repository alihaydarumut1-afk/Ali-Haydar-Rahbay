import { useState, useEffect, useRef } from 'react'
import { Volume2, Loader2 } from 'lucide-react'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

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

        const response = await fetch(`${getBaseUrl()}/api/ai/speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: lang === 'en-GB' ? 'onyx' : 'alloy', apiKey: getUserApiKey() })
        });
        if (response.ok) {
          blobToPlay = await response.blob();
        } else if (response.status === 429) {
          const err = await response.json();
          console.error(err.error);
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