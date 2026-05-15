import { useEffect, useState, useRef } from 'react'
import { Mic, Loader2, Trash2 } from 'lucide-react'

// --- GÜVENLİ SES OYNATICI (Memory Leak Önleyici) ---
const AudioPlayer = ({ blob }) => {
  const [url, setUrl] = useState('')
  
  useEffect(() => {
    if (blob instanceof Blob) {
      const objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  if (!url) return <div className="h-10 w-full sm:w-1/3 shrink-0 bg-slate-50 rounded-xl flex items-center px-4 text-xs text-slate-400 border border-slate-100">Loading Audio...</div>
  return <audio src={url} controls className="h-10 w-full sm:w-1/3 shrink-0" />
}

export default function VoiceRecorder({ onTranscription }) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [audioBlob, setAudioBlob] = useState(null)
  
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [savedNotes, setSavedNotes] = useState([])
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)

  // OpenAI API Key (sadece GPT-4o-mini değerlendirme için kullanılıyor)
  const keyToUse = localStorage.getItem('openAiApiKey') || localStorage.getItem('geminiApiKey') || ''

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
        if (audioChunksRef.current.length === 0) return
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach((track) => track.stop())
        
        setIsEvaluating(true)
        try {
          const aiText = await transcribeAudio(blob)
          if (!aiText) {
            setIsEvaluating(false)
            return alert("Sessizlik algılandı veya metin anlaşılamadı. Lütfen tekrar deneyin.")
          }
          setTranscript(aiText)
          if (onTranscription) onTranscription(aiText)
          await handleEvaluate(aiText, blob)
        } catch (err) {
          console.error("Transkript hatası:", err)
          setIsEvaluating(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      
    } catch (caughtError) {
      alert('Microphone access denied or an error occurred.')
      setIsRecording(false)
    }
  }

  const handleStop = () => {
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Kısa gecikme ile transkripti al (recognition.onend tetiklensin)
    setTimeout(async () => {
      const transcriptText = interimTranscriptRef.current.trim()

      if (!transcriptText) {
        alert('No speech detected. Please try again and speak clearly.')
        return
      }

      setTranscript(transcriptText)
      if (onTranscription) onTranscription(transcriptText)

      await handleEvaluate(transcriptText)
    }, 800)
  }

  const handleEvaluate = async (transcriptText) => {
    setIsEvaluating(true)
    let evalData = null

    try {
      const key = keyToUse
      if (!key || (!key.startsWith('sk-') && !key.startsWith('AI'))) {
        // API key yoksa değerlendirme yapma, sadece kaydet
        setIsEvaluating(false)
        saveRecord(transcriptText, null, blob)
        return
      }

      const prompt = `You are a strict and professional IELTS/TOEFL examiner and CEFR assessor. Evaluate the following spoken text (transcribed from audio) of an English learner targeting B1-B2 level. You MUST return a JSON object evaluating the student based on official rubrics.
      You MUST output ONLY in the following JSON format, do not add markdown:
      {
        "academic_score": "e.g., IELTS Band 6.5 / TOEFL 22 / CEFR B2",
        "evaluation": {
          "fluency_and_coherence": "Feedback on flow and linking words.",
          "lexical_resource": "Feedback on vocabulary usage. Suggest 2 advanced (C1) synonyms for words they used simply.",
          "grammatical_range": "Identify any grammar mistakes and explain the rule."
        },
        "overall_comment": "A short, encouraging summary of their speaking performance."
      }
      
      Transcript to evaluate: '${transcriptText}'`

      let content = ''

      if (key.startsWith('sk-')) {
        const evalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: prompt }],
            temperature: 0.3
          })
        })
        if (evalResponse.ok) {
          const evalJson = await evalResponse.json()
          content = evalJson.choices?.[0]?.message?.content || ''
        }
      } else {
        // Gemini
        const evalResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1000, responseMimeType: 'application/json' }
          })
        })
        if (evalResponse.ok) {
          const evalJson = await evalResponse.json()
          content = evalJson.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }
      }

      if (content) {
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim()
        if (cleanContent) evalData = JSON.parse(cleanContent)
      }
    } catch (err) {
      console.error('Eval error', err)
    } finally {
      setIsEvaluating(false)
      saveRecord(transcriptText, evalData, blob)
    }
  }

  const saveRecord = (transcriptText, evalData, currentBlob) => {
    const newRecord = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      title: transcriptText.split(' ').slice(0, 5).join(' ') + (transcriptText.split(' ').length > 5 ? '...' : ''),
      transcript: transcriptText,
      evaluation: evalData,
      blob: currentBlob
    }

    setSavedNotes(prev => [newRecord, ...prev])
  }

  const handleDeleteNote = (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this record?")) return
    setSavedNotes(prev => prev.filter(note => note.id !== id))
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
      
      {/* KONTROL PANELİ */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">AI Vocal Coach</h2>
          <p className="text-sm text-slate-500">Record your voice, let AI analyze it automatically.</p>
        </div>
        <button
          type="button"
          onClick={isRecording ? handleStop : handleStart}
          disabled={isEvaluating}
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

      {/* DURUM BİLDİRİMLERİ */}
      {isRecording && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute top-0 left-0 w-full h-full animate-ping rounded-full bg-rose-400/20" />
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-inner">
              <Mic className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-medium text-slate-700 font-mono tracking-widest">{formatTime(recordingTime)}</p>
          <p className="mt-2 text-sm text-slate-500">Speaking... (Browser transcribing live)</p>
        </div>
      )}

      {isEvaluating && (
        <div className="flex flex-col items-center justify-center py-8 text-emerald-600">
          <Loader2 className="mb-4 h-10 w-10 animate-spin" />
      <p className="font-semibold text-slate-700">Vocal Coach is transcribing and evaluating your fluency...</p>
        </div>
      )}

      {/* TRANSKRIPT ÖNIZLEME */}
      {transcript && !isRecording && (
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Last Transcript</p>
          <p className="text-sm text-slate-700 italic">"{transcript}"</p>
        </div>
      )}

      {/* ARŞİV PANELİ */}
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
                
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base leading-tight capitalize">{note.title || 'Untitled Record'}</h4>
                    <span className="text-xs font-semibold text-slate-400 mt-1 block">{new Date(note.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button onClick={() => handleDeleteNote(note.id)} className="shrink-0 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {note.blob && <AudioPlayer blob={note.blob} />}
                  <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 italic border border-slate-100 flex-1">
                    "{note.transcript}"
                  </div>
                </div>

                {note.evaluation && (
                  <div className="mt-2 border-t border-slate-50 pt-5">
                    <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg mb-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner shrink-0">
                        <span className="text-xl font-black">🎓</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{note.evaluation.academic_score || 'N/A'}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Official Examiner Score</p>
                      </div>
                    </div>
                    
                    <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-5 mb-4">
                      <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">📝 Overall Comment</h4>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">{note.evaluation.overall_comment}</p>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-indigo-50/50 p-4 rounded-2xl text-indigo-900 border border-indigo-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">🌊</span> Fluency & Coherence</span>
                        <p className="text-slate-700 text-xs leading-relaxed">{note.evaluation.evaluation?.fluency_and_coherence}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-4 rounded-2xl text-emerald-900 border border-emerald-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">📚</span> Lexical Resource</span>
                        <p className="text-slate-700 text-xs leading-relaxed">{note.evaluation.evaluation?.lexical_resource}</p>
                      </div>
                      <div className="bg-purple-50/50 p-4 rounded-2xl text-purple-900 border border-purple-100 shadow-sm">
                        <span className="font-bold flex items-center gap-1.5 mb-2"><span className="text-lg">✍️</span> Grammatical Range</span>
                        <p className="text-slate-700 text-xs leading-relaxed">{note.evaluation.evaluation?.grammatical_range}</p>
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
