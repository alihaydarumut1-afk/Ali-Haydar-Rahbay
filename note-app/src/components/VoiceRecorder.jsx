import { useEffect, useState, useRef } from 'react'
import { Mic, Loader2, Trash2 } from 'lucide-react'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

export default function VoiceRecorder({ onTranscription }) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [savedNotes, setSavedNotes] = useState([])
  const [audioUrl, setAudioUrl] = useState('')
  const [aiFeedback, setAiFeedback] = useState(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const handleStart = async () => {
    setTranscript('')
    setAudioBlob(null)
    setAiFeedback(null)
    setAudioUrl('')
    setRecordingTime(0)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false)
          return
        }
        const blob = new Blob([...audioChunksRef.current], { type: mimeType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
        
        try {
          await processRecording(blob)
        } catch (err) {
          console.error('Recording processing error:', err)
          throw err // Hatayı yutmayıp fırlatıyoruz (konsolda Unhandled Rejection olarak patlasın)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      
    } catch (caughtError) {
      console.error('Microphone access error:', caughtError)
      setIsRecording(false)
    }
  }

  const handleStop = () => {
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  const processRecording = async (blob) => {
    if (!blob || blob.size === 0) {
      setIsTranscribing(false)
      console.error('Invalid audio blob, no recording data available.')
      return
    }

    setIsTranscribing(true)
    let transcriptText = ''

    // 1. AŞAMA: OPENAI WHISPER VEYA GEMINI STT (Sesten Metne)
    try {
      const base64Audio = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })
      const response = await fetch(`${getBaseUrl()}/api/ai/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type, apiKey: getUserApiKey() })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 429) alert(errorData.error);
        console.error('API Hatası:', errorData)
        throw new Error(errorData.error?.message || 'API Sunucusu yanıt vermedi.')
      }

      const data = await response.json()
      transcriptText = data.text?.trim() || ''

      if (transcriptText && ['you', 'you.', 'thank you.', 'thank you', 'okay', 'okay.'].includes(transcriptText.toLowerCase())) {
        transcriptText = ''
      }
    } catch (error) {
      console.error('Transcription error:', error)
      setIsTranscribing(false)
      return
    }

    setIsTranscribing(false)

    if (!transcriptText) {
      throw new Error('Sessizlik algılandı: API boş metin döndürdü. Lütfen Google Chrome veya Windows mikrofon ayarlarınızı kontrol edin (Yanlış mikrofon seçili olabilir veya ses kaydedilmiyor).')
    }

    setTranscript(transcriptText)
    if (onTranscription) onTranscription(transcriptText)

    // 2. AŞAMA: YAPAY ZEKA DEĞERLENDİRMESİ (Score out of 30 & 5 Criteria)
    setIsEvaluating(true)
    try {
      const prompt = `You are a strict and professional TOEFL/IELTS speaking examiner. Evaluate the following spoken text (transcript) of an English learner.
      Calculate a total score out of 30 (e.g., 24/30).
      Provide feedback on these 5 criteria: Fluency, Pronunciation, Tone/Intonation, Vocabulary, Grammar.
      Return ONLY a valid JSON object strictly in this format:
      {
        "score": "24/30",
        "overall_comment": "Summary of performance...",
        "fluency": "Feedback on flow, pauses, and filler words...",
        "pronunciation": "Feedback on clarity and word pronunciation...",
        "tone": "Feedback on emotion, intonation, and natural rhythm...",
        "vocabulary": "Feedback on lexical resource...",
        "grammar": "Feedback on grammatical range and accuracy..."
      }
      
      Transcript: '${transcriptText}'`

      const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, expectJson: true, apiKey: getUserApiKey() })
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429) alert(data.error);
        throw new Error(data.error || 'AI Hatası');
      }
      setAiFeedback(JSON.parse(data.content))
    } catch (err) {
      console.error('Eval error', err)
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleSaveNote = () => {
    if (!transcript) return

    // 3. AŞAMA: INDEXEDDB'YE KAYDET
    const newRecord = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      title: transcript.split(' ').slice(0, 5).join(' ') + (transcript.split(' ').length > 5 ? '...' : ''),
      transcript: transcript,
      evaluation: aiFeedback,
       audioUrl: audioUrl,
      evaluation: aiFeedback,
      
    }

    setSavedNotes(prev => [newRecord, ...prev])
    setAudioBlob(null)
    setTranscript('')
    setAiFeedback(null)
    setAudioUrl('') // Orijinal sesi silmiyoruz ki listedeyken çalmaya devam etsin
  }

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this record?")) return
    setSavedNotes(prev => prev.filter(note => note.id !== id))
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
      
      {/* KONTROL PANELİ */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Intelligent Vocal Coach</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Record your voice, let AI analyze it automatically.</p>
        </div>
        <button
          type="button"
          onClick={isRecording ? handleStop : handleStart}
          disabled={isTranscribing || isEvaluating}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all ${
            isRecording ? 'bg-rose-600 hover:bg-rose-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 disabled:bg-slate-400'
          }`}
        >
          {isRecording ? (
            <>
              <span className="h-3 w-3 rounded-full bg-white"></span>
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              New Record
            </>
          )}
        </button>
      </div>

      {/* DURUM BİLDİRİMLERİ & ANLIK TRANSKRİPT */}
      {isRecording && (
        <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
          <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute top-0 left-0 w-full h-full animate-ping rounded-full bg-rose-400/20" />
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
              <Mic className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-medium text-slate-700 font-mono tracking-widest">{formatTime(recordingTime)}</p>
        </div>
      )}

      {/* ACTIVE SESSION UI */}
      {audioUrl && !isRecording && (
        <div className="flex flex-col items-center gap-4 py-6 animate-fade-in rounded-2xl bg-zinc-50 border border-zinc-100 p-6 dark:bg-zinc-900/50 dark:border-zinc-800 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300 eye-care:text-[#5C4B37] self-start">Ses Kaydınız (Tekrar Dinleyebilirsiniz):</p>
          
          <audio src={audioUrl} controls className="w-full my-4 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          
          {isTranscribing && (
            <div className="flex items-center gap-3 text-indigo-600 font-semibold my-2"><Loader2 className="animate-spin w-5 h-5" /> Sesiniz metne çevriliyor...</div>
          )}
          
          {transcript && !isTranscribing && (
            <div className="w-full space-y-4">
              <div className="bg-white p-4 rounded-xl border border-zinc-200 italic text-zinc-700 leading-relaxed dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8] eye-care:text-[#5C4B37]">
                "{transcript}"
              </div>
              
              {isEvaluating && (
                <div className="flex items-center gap-3 text-emerald-600 font-semibold my-2"><Loader2 className="animate-spin w-5 h-5" /> AI uzmanı sesinizi 30 üzerinden puanlıyor...</div>
              )}
              
              {aiFeedback && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner shrink-0">
                      <span className="text-xl font-black">🎯</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{aiFeedback.score}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">TOEFL/IELTS Puanı</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-xl">
                    <h4 className="font-bold text-slate-800 mb-1">📝 Genel Değerlendirme</h4>
                    <p className="text-sm text-slate-600">{aiFeedback.overall_comment}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                      <h4 className="font-bold text-emerald-900 mb-1">🌊 Fluency (Akıcılık)</h4>
                      <p className="text-sm text-emerald-800">{aiFeedback.fluency}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                      <h4 className="font-bold text-blue-900 mb-1">🗣️ Pronunciation (Telaffuz)</h4>
                      <p className="text-sm text-blue-800">{aiFeedback.pronunciation}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                      <h4 className="font-bold text-purple-900 mb-1">🎵 Tone & Intonation</h4>
                      <p className="text-sm text-purple-800">{aiFeedback.tone}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                      <h4 className="font-bold text-amber-900 mb-1">📚 Vocabulary (Kelime)</h4>
                      <p className="text-sm text-amber-800">{aiFeedback.vocabulary}</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl sm:col-span-2">
                      <h4 className="font-bold text-rose-900 mb-1">✍️ Grammar (Dil Bilgisi)</h4>
                      <p className="text-sm text-rose-800">{aiFeedback.grammar}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => { setAudioBlob(null); setTranscript(''); setAiFeedback(null); setAudioUrl('') }} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
                      Discard
                    </button>
                    <button onClick={handleSaveNote} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition">
                      💾 Save to History
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ARŞİV PANELİ (Kayıt Geçmişi) */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">My Recording History</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{savedNotes.length} Records</span>
        </div>
        
        {savedNotes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
            <p className="font-semibold text-slate-700">No records yet</p>
            <p className="mt-1 text-sm">Your recorded audio and AI scorecards will be archived here.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {savedNotes.map(note => (
              <div key={note.id} className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                
                {/* Başlık ve Silme */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base leading-tight capitalize">{note.title || 'Untitled Record'}</h4>
                    <span className="text-xs font-semibold text-slate-400 mt-1 block">{new Date(note.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} className="shrink-0 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Ses Oynatıcı ve Metin */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <audio src={note.audioUrl} controls className="h-10 w-full sm:w-1/3 shrink-0 rounded-xl" />
                  <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 italic border border-slate-100 flex-1">
                    "{note.transcript}"
                  </div>
                </div>

                {/* AI KARNE (Report Card) */}
                {note.evaluation && (
                  <div className="mt-2 border-t border-slate-50 pt-5">
                    <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg mb-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner shrink-0">
                        <span className="text-xl font-black">🎯</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{note.evaluation.score || 'N/A'}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">TOEFL/IELTS Score</p>
                      </div>
                    </div>
                    
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 mb-4">
                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">📝 Overall Comment</h4>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{note.evaluation.overall_comment || 'No overall comment.'}</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className="bg-emerald-50/50 p-4 rounded-2xl text-emerald-900 border border-emerald-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">🌊</span> Fluency</span>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {note.evaluation.fluency || 'No feedback.'}
                        </p>
                      </div>
                      <div className="bg-blue-50/50 p-4 rounded-2xl text-blue-900 border border-blue-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">🗣️</span> Pronunciation</span>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {note.evaluation.pronunciation || 'No feedback.'}
                        </p>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-2xl text-amber-900 border border-amber-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">📚</span> Vocabulary</span>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {note.evaluation.vocabulary || 'No feedback.'}
                        </p>
                      </div>
                      <div className="bg-purple-50/50 p-4 rounded-2xl text-purple-900 border border-purple-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">🎵</span> Tone</span>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {note.evaluation.tone || 'No feedback.'}
                        </p>
                      </div>
                      <div className="bg-rose-50/50 p-4 rounded-2xl text-rose-900 border border-rose-100 shadow-sm sm:col-span-2">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">✍️</span> Grammar</span>
                        <p className="text-slate-700 text-xs leading-relaxed">
                          {note.evaluation.grammar || 'No feedback.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
