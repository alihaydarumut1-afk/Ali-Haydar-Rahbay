import { useEffect, useState, useRef } from 'react'
import { Mic, Loader2, Trash2 } from 'lucide-react'

function useEyeCare() {
  const [isEyeCare, setIsEyeCare] = useState(false)
  useEffect(() => {
    const check = () => setIsEyeCare(document.documentElement.classList.contains('eye-care'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isEyeCare
}

const getBaseUrl = () =>
  typeof window !== 'undefined' &&
  (window.location.port === '5173' || window.location.origin.includes('file://'))
    ? 'http://localhost:3000'
    : 'https://note-app-server-44hm.onrender.com'

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || ''
  }
  return ''
}

export default function VoiceRecorder({ onTranscription }) {
  const isEyeCare = useEyeCare()
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [savedNotes, setSavedNotes] = useState([])
  const [audioUrl, setAudioUrl] = useState('')
  const [aiFeedback, setAiFeedback] = useState(null)

  const activeBlobRef = useRef(null)
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
    setAiFeedback(null)
    setRecordingTime(0)
    audioChunksRef.current = []

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl('')
    }
    activeBlobRef.current = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())

        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false)
          return
        }

        const blob = new Blob([...audioChunksRef.current], { type: mimeType })
        activeBlobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        await processRecording(blob)
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
      console.error('Invalid audio blob.')
      return
    }

    setIsTranscribing(true)
    let transcriptText = ''

    try {
      const base64Audio = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })

      const response = await fetch(`${getBaseUrl()}/api/ai/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: blob.type,
          apiKey: getUserApiKey(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 429) alert(errorData.error)
        throw new Error(errorData.error?.message || 'API Sunucusu yanıt vermedi.')
      }

      const data = await response.json()
      transcriptText = data.text?.trim() || ''

      const silenceResponses = ['you', 'you.', 'thank you.', 'thank you', 'okay', 'okay.']
      if (silenceResponses.includes(transcriptText.toLowerCase())) {
        transcriptText = ''
      }
    } catch (error) {
      console.error('Transcription error:', error)
      setIsTranscribing(false)
      return
    }

    setIsTranscribing(false)

    if (!transcriptText) {
      console.warn('Sessizlik algılandı veya API boş metin döndürdü.')
      return
    }

    setTranscript(transcriptText)
    if (onTranscription) onTranscription(transcriptText)

    setIsEvaluating(true)
    try {
      const prompt = `You are an EXTREMELY strict TOEFL/IELTS speaking examiner. You NEVER give high scores unless truly deserved. Your job is to be honest and critical — even harsh when necessary.

CRITICAL RULES:
- If the transcript is empty, silence, or fewer than 10 words → give 0/100 and say "No speech detected."
- If the transcript contains only filler words (um, uh, like, okay, you know) → give 0-5/100.
- If the transcript contains only 1-2 sentences → cap score at 40/100 maximum.
- NEVER give a score above 50/100 unless the speech is clearly fluent, grammatically correct, and uses varied vocabulary.
- NEVER give 90+ unless the speech is near-native level.
- If you detect any Turkish words mixed in → penalize heavily under Grammar and Vocabulary.

SCORING RUBRIC (each criterion scored 1-6):

FLUENCY (1-6):
1 = Constant stops, unable to form sentences
2 = Very frequent pauses, many filler words (um/uh/like)
3 = Noticeable pauses, some filler words, choppy delivery
4 = Minor hesitations, mostly smooth
5 = Natural flow with very rare pauses
6 = Completely fluent, native-like pacing

PRONUNCIATION (1-6):
1 = Completely unintelligible
2 = Very difficult to understand
3 = Understandable but many errors
4 = Mostly clear with noticeable accent
5 = Clear with minor accent
6 = Native-like clarity

TONE/INTONATION (1-6):
1 = Completely monotone or robotic
2 = Mostly flat, no natural rhythm
3 = Some variation but unnatural
4 = Reasonable intonation with some flatness
5 = Good intonation, nearly natural
6 = Fully natural, expressive

VOCABULARY (1-6):
1 = Only basic words (good, nice, very, thing)
2 = Very limited range, lots of repetition
3 = Basic range, some repetition
4 = Adequate range, occasional advanced words
5 = Good range, varied and appropriate
6 = Rich, precise, idiomatic

GRAMMAR (1-6):
1 = Almost no correct sentences
2 = Constant errors, hard to follow
3 = Frequent errors in basic structures
4 = Some errors but generally understandable
5 = Minor errors only
6 = Near-perfect grammar

IMPORTANT: Be realistic. Most learners score between 2-4 on each criterion. Only exceptional performance earns 5-6. If the speech is short or unclear, score accordingly — do not be generous.

Calculate total: add all 5 scores, multiply by (100/30), round to nearest integer. Format as "X/100".

Return ONLY valid JSON, no markdown, no preamble:
{
  "score": "X/100",
  "overall_comment": "Honest 2-3 sentence summary. Be direct about weaknesses.",
  "fluency": "Specific feedback with examples from the transcript if possible...",
  "pronunciation": "Specific feedback...",
  "tone": "Specific feedback...",
  "vocabulary": "Specific feedback with examples of weak/strong word choices...",
  "grammar": "Specific feedback with specific error examples from the transcript..."
}

Transcript: '${transcriptText}'`

      const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, expectJson: true, apiKey: getUserApiKey() }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429) alert(data.error)
        throw new Error(data.error || 'AI Hatası')
      }

      setAiFeedback(JSON.parse(data.content))
    } catch (err) {
      console.error('Evaluation error:', err)
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleSaveNote = () => {
    if (!transcript) return

    const savedBlob = activeBlobRef.current
    const savedAudioUrl = savedBlob ? URL.createObjectURL(savedBlob) : audioUrl

    const newRecord = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      title:
        transcript.split(' ').slice(0, 5).join(' ') +
        (transcript.split(' ').length > 5 ? '...' : ''),
      transcript,
      audioUrl: savedAudioUrl,
      evaluation: aiFeedback,
    }

    setSavedNotes((prev) => [newRecord, ...prev])

    if (audioUrl && audioUrl !== savedAudioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioUrl('')
    setTranscript('')
    setAiFeedback(null)
    activeBlobRef.current = null
  }

  const handleDiscard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl('')
    setTranscript('')
    setAiFeedback(null)
    activeBlobRef.current = null
  }

  const handleDeleteNote = (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this record?')) return
    setSavedNotes((prev) => {
      const note = prev.find((n) => n.id === id)
      if (note?.audioUrl) URL.revokeObjectURL(note.audioUrl)
      return prev.filter((n) => n.id !== id)
    })
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
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">
            Intelligent Vocal Coach
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">
            Record your voice, let AI analyze it automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={isRecording ? handleStop : handleStart}
          disabled={isTranscribing || isEvaluating}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 disabled:bg-slate-400'
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

      {/* KAYIT DURUMU */}
      {isRecording && (
        <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
          <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute top-0 left-0 w-full h-full animate-ping rounded-full bg-rose-400/20" />
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
              <Mic className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-medium text-slate-700 font-mono tracking-widest">
            {formatTime(recordingTime)}
          </p>
        </div>
      )}

      {/* AKTİF SESSION UI */}
      {audioUrl && !isRecording && (
        <div className="flex flex-col items-center gap-4 py-6 animate-fade-in rounded-2xl bg-zinc-50 border border-zinc-100 p-6 dark:bg-zinc-900/50 dark:border-zinc-800 eye-care:bg-[#EDE0C4] eye-care:border-[#C9B99A]">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300 eye-care:text-[#3B2F2F] self-start">
            Ses Kaydınız (Tekrar Dinleyebilirsiniz):
          </p>

          <audio src={audioUrl} controls className="w-full my-4 rounded-lg bg-zinc-100 dark:bg-zinc-800" />

          {isTranscribing && (
            <div className="flex items-center gap-3 text-indigo-600 font-semibold my-2">
              <Loader2 className="animate-spin w-5 h-5" /> Sesiniz metne çevriliyor...
            </div>
          )}

          {transcript && !isTranscribing && (
            <div className="w-full space-y-4">
              <div className={`p-4 rounded-xl border italic leading-relaxed ${isEyeCare ? 'bg-[#FDF6E3] border-[#C9B99A] text-[#3B2F2F]' : 'bg-white border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'}`}>
                "{transcript}"
              </div>

              {isEvaluating && (
                <div className="flex items-center gap-3 text-emerald-600 font-semibold my-2">
                  <Loader2 className="animate-spin w-5 h-5" /> AI uzmanı sesinizi 100 üzerinden puanlıyor...
                </div>
              )}

              {aiFeedback && (
                <div className="space-y-4 animate-fade-in">
                  {/* SCORE KARTI */}
                  <div className={`flex items-center gap-5 rounded-3xl p-6 shadow-lg ${isEyeCare ? 'bg-[#E8DCC8] text-slate-900' : 'bg-slate-900 text-white'}`}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-inner shrink-0 ${isEyeCare ? 'bg-[#C9B99A] border-[#5C4B37]' : 'bg-slate-800 border-indigo-500'}`}>
                      <span className="text-xl font-black">🎯</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{aiFeedback.score}</h3>
                      <p className={`text-xs font-semibold mt-1 uppercase tracking-wider ${isEyeCare ? 'text-[#3B2F2F]' : 'text-slate-400'}`}>
                        TOEFL/IELTS Puanı
                      </p>
                    </div>
                  </div>

                  <div className={`border p-4 rounded-xl ${isEyeCare ? 'bg-[#FDF6E3] border-[#C9B99A]' : 'bg-white border-slate-200'}`}>
                    <h4 className={`font-bold mb-1 ${isEyeCare ? 'text-[#3B2F2F]' : 'text-slate-800'}`}>📝 Genel Değerlendirme</h4>
                    <p className={`text-sm ${isEyeCare ? 'text-[#5C4B37]' : 'text-slate-600'}`}>{aiFeedback.overall_comment}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className={`border p-4 rounded-xl ${isEyeCare ? 'bg-[#E8F0DF] border-[#B5C9A8]' : 'bg-emerald-50 border-emerald-100'}`}>
                      <h4 className={`font-bold mb-1 ${isEyeCare ? 'text-[#1A3A1A]' : 'text-emerald-900'}`}>🌊 Fluency (Akıcılık)</h4>
                      <p className={`text-sm ${isEyeCare ? 'text-[#2A4A2A]' : 'text-emerald-800'}`}>{aiFeedback.fluency}</p>
                    </div>
                    <div className={`border p-4 rounded-xl ${isEyeCare ? 'bg-[#DDE8F0] border-[#A8BCC9]' : 'bg-blue-50 border-blue-100'}`}>
                      <h4 className={`font-bold mb-1 ${isEyeCare ? 'text-[#0D2A3A]' : 'text-blue-900'}`}>🗣️ Pronunciation (Telaffuz)</h4>
                      <p className={`text-sm ${isEyeCare ? 'text-[#1A3D4E]' : 'text-blue-800'}`}>{aiFeedback.pronunciation}</p>
                    </div>
                    <div className={`border p-4 rounded-xl ${isEyeCare ? 'bg-[#EAE0F0] border-[#C4B0D4]' : 'bg-purple-50 border-purple-100'}`}>
                      <h4 className={`font-bold mb-1 ${isEyeCare ? 'text-[#2A1040]' : 'text-purple-900'}`}>🎵 Tone & Intonation</h4>
                      <p className={`text-sm ${isEyeCare ? 'text-[#3A2050]' : 'text-purple-800'}`}>{aiFeedback.tone}</p>
                    </div>
                    <div className={`border p-4 rounded-xl ${isEyeCare ? 'bg-[#F5ECD7] border-[#D4B896]' : 'bg-amber-50 border-amber-100'}`}>
                      <h4 className={`font-bold mb-1 ${isEyeCare ? 'text-[#4A2800]' : 'text-amber-900'}`}>📚 Vocabulary (Kelime)</h4>
                      <p className={`text-sm ${isEyeCare ? 'text-[#5C3400]' : 'text-amber-800'}`}>{aiFeedback.vocabulary}</p>
                    </div>
                    <div className={`border p-4 rounded-xl sm:col-span-2 ${isEyeCare ? 'bg-[#F0DDE0] border-[#D4A8AE]' : 'bg-rose-50 border-rose-100'}`}>
                      <h4 className={`font-bold mb-1 ${isEyeCare ? 'text-[#4A0A12]' : 'text-rose-900'}`}>✍️ Grammar (Dil Bilgisi)</h4>
                      <p className={`text-sm ${isEyeCare ? 'text-[#5C1820]' : 'text-rose-800'}`}>{aiFeedback.grammar}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={handleDiscard}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveNote}
                      className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                    >
                      💾 Save to History
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ARŞİV PANELİ */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">My Recording History</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {savedNotes.length} Records
          </span>
        </div>

        {savedNotes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
            <p className="font-semibold text-slate-700">No records yet</p>
            <p className="mt-1 text-sm">Your recorded audio and AI scorecards will be archived here.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {savedNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base leading-tight capitalize">
                      {note.title || 'Untitled Record'}
                    </h4>
                    <span className="text-xs font-semibold text-slate-400 mt-1 block">
                      {new Date(note.createdAt).toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="shrink-0 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <audio
                    src={note.audioUrl}
                    controls
                    className="h-10 w-full sm:w-1/3 shrink-0 rounded-xl"
                  />
                  <div className={`p-3 rounded-xl text-sm italic border flex-1 ${isEyeCare ? 'bg-[#FDF6E3] border-[#C9B99A] text-[#3B2F2F]' : 'bg-slate-50 border-slate-100 text-slate-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'}`}>
                    "{note.transcript}"
                  </div>
                </div>

                {note.evaluation && (
                  <div className="mt-2 border-t border-slate-50 pt-5">
                    <div className={`flex items-center gap-5 rounded-3xl p-6 shadow-lg mb-6 ${isEyeCare ? 'bg-[#E8DCC8] text-slate-900' : 'bg-slate-900 text-white'}`}>
                      <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-inner shrink-0 ${isEyeCare ? 'bg-[#C9B99A] border-[#5C4B37]' : 'bg-slate-800 border-indigo-500'}`}>
                        <span className="text-xl font-black">🎯</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{note.evaluation.score || 'N/A'}</h3>
                        <p className={`text-xs font-semibold mt-1 uppercase tracking-wider ${isEyeCare ? 'text-[#3B2F2F]' : 'text-slate-400'}`}>
                          TOEFL/IELTS Score
                        </p>
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-5 mb-4 ${isEyeCare ? 'bg-[#FDF6E3] border-[#C9B99A]' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className={`font-bold mb-2 flex items-center gap-2 ${isEyeCare ? 'text-[#3B2F2F]' : 'text-slate-800'}`}>
                        📝 Overall Comment
                      </h4>
                      <p className={`text-sm leading-relaxed font-medium ${isEyeCare ? 'text-[#4A3828]' : 'text-slate-700'}`}>
                        {note.evaluation.overall_comment || 'No overall comment.'}
                      </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 text-sm">
                      <div className={`p-4 rounded-2xl border shadow-sm ${isEyeCare ? 'bg-[#E0EDD8] border-[#A8C49A]' : 'bg-emerald-50/50 border-emerald-100'}`}>
                        <span className={`font-bold flex items-center gap-1.5 mb-2 ${isEyeCare ? 'text-[#1A3A1A]' : 'text-emerald-900'}`}>
                          <span className="text-lg">🌊</span> Fluency
                        </span>
                        <p className={`text-xs leading-relaxed ${isEyeCare ? 'text-[#2A3A2A]' : 'text-slate-700'}`}>
                          {note.evaluation.fluency || 'No feedback.'}
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl border shadow-sm ${isEyeCare ? 'bg-[#D5E5EF] border-[#98B8C8]' : 'bg-blue-50/50 border-blue-100'}`}>
                        <span className={`font-bold flex items-center gap-1.5 mb-2 ${isEyeCare ? 'text-[#0D2A3A]' : 'text-blue-900'}`}>
                          <span className="text-lg">🗣️</span> Pronunciation
                        </span>
                        <p className={`text-xs leading-relaxed ${isEyeCare ? 'text-[#1A3A4A]' : 'text-slate-700'}`}>
                          {note.evaluation.pronunciation || 'No feedback.'}
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl border shadow-sm ${isEyeCare ? 'bg-[#EDE0C4] border-[#C9A870]' : 'bg-amber-50/50 border-amber-100'}`}>
                        <span className={`font-bold flex items-center gap-1.5 mb-2 ${isEyeCare ? 'text-[#4A2800]' : 'text-amber-900'}`}>
                          <span className="text-lg">📚</span> Vocabulary
                        </span>
                        <p className={`text-xs leading-relaxed ${isEyeCare ? 'text-[#5C3800]' : 'text-slate-700'}`}>
                          {note.evaluation.vocabulary || 'No feedback.'}
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl border shadow-sm ${isEyeCare ? 'bg-[#E0D8EC] border-[#B8A8CC]' : 'bg-purple-50/50 border-purple-100'}`}>
                        <span className={`font-bold flex items-center gap-1.5 mb-2 ${isEyeCare ? 'text-[#2A1040]' : 'text-purple-900'}`}>
                          <span className="text-lg">🎵</span> Tone
                        </span>
                        <p className={`text-xs leading-relaxed ${isEyeCare ? 'text-[#3A2050]' : 'text-slate-700'}`}>
                          {note.evaluation.tone || 'No feedback.'}
                        </p>
                      </div>
                      <div className={`p-4 rounded-2xl border shadow-sm sm:col-span-2 ${isEyeCare ? 'bg-[#EDD8DC] border-[#C49898]' : 'bg-rose-50/50 border-rose-100'}`}>
                        <span className={`font-bold flex items-center gap-1.5 mb-2 ${isEyeCare ? 'text-[#4A0A12]' : 'text-rose-900'}`}>
                          <span className="text-lg">✍️</span> Grammar
                        </span>
                        <p className={`text-xs leading-relaxed ${isEyeCare ? 'text-[#5C1820]' : 'text-slate-700'}`}>
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