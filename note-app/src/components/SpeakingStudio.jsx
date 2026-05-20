import { useState, useEffect, useRef } from 'react'
import { Bot, Mic, Square, Save, Trash2, RotateCcw, Plus, User } from 'lucide-react'
import useWords from '../hooks/useWords.js'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

async function fetchAI(prompt, expectJson = false, maxTokensOverride = null) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, expectJson, maxTokens: maxTokensOverride, apiKey: getUserApiKey() })
    });
    
    const textRaw = await response.text();
    let data;
    try {
      data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
      if (!response.ok && (response.status === 502 || response.status === 504)) {
        throw new Error('Arka plan sunucusuna bağlanılamadı. Lütfen "node server.js" ile sunucuyu başlattığınızdan emin olun.');
      }
      throw new Error('Sunucu boş veya geçersiz yanıt döndürdü');
    }

    if (!response.ok) {
      if (response.status === 429) alert(data.error);
      throw new Error(data.error || 'AI Hatası');
    }
    if (expectJson) {
      try {
        let cleanJson = data.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const match = cleanJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (match) cleanJson = match[0];
        return JSON.parse(cleanJson);
      } catch(e) {
        throw new Error('Yapay zeka eksik veri döndürdü.');
      }
    }
    return data.content;
  } catch (err) {
    console.error(err)
    throw err
  }
}

async function transcribeAudioWithAI(blob) {
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

  let data;
  try {
    const textRaw = await response.text();
    data = textRaw ? JSON.parse(textRaw) : {};
  } catch (e) {
    if (!response.ok && (response.status === 502 || response.status === 504)) {
      throw new Error('Arka plan sunucusuna bağlanılamadı. Lütfen "node server.js" ile sunucuyu başlattığınızdan emin olun.');
    }
    throw new Error('Sunucu geçersiz yanıt döndürdü');
  }

  if (!response.ok) {
    if (response.status === 429) alert(data.error);
    throw new Error(data.error || 'Transcription Hatası');
  }
  return data.text;
}

const DB_NAME = 'PronunciationDB'
const STORE_NAME = 'audioStore'

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => { e.target.result.createObjectStore(STORE_NAME) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const saveAudioToDB = async (key, blob) => {
  try { const db = await initDB(); db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(blob, key) } catch (e) {}
}

const getAudioFromDB = async (key) => {
  try {
    const db = await initDB()
    return await new Promise((resolve) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
  } catch (e) { return null }
}

export default function SpeakingStudio() {
  const { words = [], addWord } = useWords() || {}
  
  const [status, setStatus] = useState('setup')
  const [roles, setRoles] = useState({ user: '', ai: '', scenario: '', level: 'B1-B2', aiMode: 'normal' })
  const [messages, setMessages] = useState([])
  const [feedbackData, setFeedbackData] = useState(null)
  const [interimText, setInterimText] = useState('')
  const currentTranscriptRef = useRef('')
  
  const [sessionScore, setSessionScore] = useState(null)
  const [overallProgress, setOverallProgress] = useState('0')
  const [feedbackType, setFeedbackType] = useState('general')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [addedWords, setAddedWords] = useState({})
  
  const [isRecording, setIsRecording] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isSavedOpen, setIsSavedOpen] = useState(false)
  
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [savedSessions, setSavedSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('speaking_sessions') || '[]') } catch { return [] }
  })

  const recognitionRef = useRef(null)
  const chatEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const isRecordingRef = useRef(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
      if (recognitionRef.current) {
        recognitionRef.current.onend = null
        try { recognitionRef.current.stop() } catch(e) {}
      }
    }
  }, [])

  const handleStartSimulation = async () => {
    if (!roles.user.trim() || !roles.ai.trim() || !roles.scenario.trim()) {
      return alert("Please fill in all fields (Scenario, Your Role, AI's Role).")
    }
    setStatus('chatting')
    setMessages([])
    setFeedbackData(null)
    setAddedWords({})
    setIsProcessing(true)
    setActiveSessionId(null)

    const modeRuleStart = roles.aiMode === 'professor'
      ? "4. PROFESSOR MODE: You are 'Professor', an IELTS/TOEFL coach. If the user makes a mistake, correct it concisely. If correct, keep your response VERY brief to maintain a fast flow. Always end with a question to prompt the user."
      : "4. NORMAL MODE: Act as a casual speaking partner. Start the conversation fast and naturally (1-2 short sentences). Don't just ask a question, share a brief thought too.";
      
    const prompt = `You are an AI character in an English speaking practice simulation.
    Your role: ${roles.ai}
    User's role: ${roles.user}
    Scenario: ${roles.scenario}
    Target English Level: ${roles.level}
    
    STRICT RULES:
    1. YOU MUST SPEAK ONLY IN ENGLISH, absolutely no Turkish or other languages.
    2. Keep it extremely natural, conversational, and realistic. Use appropriate contractions (I'm, don't) and everyday language.
    3. Do not use asterisks, emojis, or stage directions.
    ${modeRuleStart}`
    
    try {
      const reply = await fetchAI(prompt)
      await playAiAudio(reply, () => {
        setMessages([{ role: 'ai', content: reply }])
      })
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setIsProcessing(false)
    }
  }

  const playAiAudio = async (text, onReady) => {
    setIsAiSpeaking(true)
    try {
      const cacheKey = `en-US-${text.toLowerCase().trim()}`
      let blobToPlay = null

      const cachedBlob = await getAudioFromDB(cacheKey)
      if (cachedBlob) {
        blobToPlay = cachedBlob
      } else {
        const response = await fetch(`${getBaseUrl()}/api/ai/speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'alloy', apiKey: getUserApiKey() })
        })
        if (response.ok) { blobToPlay = await response.blob(); await saveAudioToDB(cacheKey, blobToPlay); }
        else if (response.status === 429) { const err = await response.json(); alert(err.error); }

        if (!blobToPlay) {
          const googleUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text)}`
          const res = await fetch(googleUrl)
          if (res.ok) { blobToPlay = await res.blob(); await saveAudioToDB(cacheKey, blobToPlay); }
        }
      }

      if (blobToPlay) {
        const audioSource = URL.createObjectURL(blobToPlay)
        const audio = new Audio(audioSource)
        
        if (roles.level.includes('A1') || roles.level.includes('A2')) audio.playbackRate = 0.85

        audio.onended = () => { setIsAiSpeaking(false); URL.revokeObjectURL(audioSource) }
        audio.onerror = () => setIsAiSpeaking(false)
        if (onReady) onReady()
        await audio.play()
        return
      }
    } catch (err) {
      console.warn('API okuması başarısız, yerleşik motora dönülüyor:', err)
    }

    if (!('speechSynthesis' in window)) {
      setIsAiSpeaking(false)
      if (onReady) onReady()
      return
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    if (roles.level.includes('A1') || roles.level.includes('A2')) utterance.rate = 0.85
    else utterance.rate = 1.0
    
    const voices = window.speechSynthesis.getVoices()
    const engVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'))
    const englishVoice = engVoices.find(v => v.lang === 'en-US' || v.lang === 'en_US') || engVoices[0]
    if (englishVoice) utterance.voice = englishVoice

    utterance.onend = () => setIsAiSpeaking(false)
    utterance.onerror = () => setIsAiSpeaking(false)
    if (onReady) onReady()
    window.speechSynthesis.speak(utterance)
  }

  const handleStartRecording = async () => {
    if (isAiSpeaking || isProcessing) return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert('Your browser does not support Web Speech API. Please use Chrome.')
    
    window.speechSynthesis.cancel()
    
    setInterimText('')
    currentTranscriptRef.current = ''
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      
      mediaRecorder.start(250)
      isRecordingRef.current = true
      setIsRecording(true)

      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = true
      recognition.continuous = true 
      
      recognition.onresult = (e) => {
        let interim = ''
        let finalStr = ''
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalStr += e.results[i][0].transcript + ' '
          else interim += e.results[i][0].transcript
        }
        if (finalStr) currentTranscriptRef.current += finalStr
        setInterimText(currentTranscriptRef.current + interim)
      }
      
      recognition.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'audio-capture') {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          isRecordingRef.current = false
          setIsRecording(false)
        }
      }
      
      recognition.onend = () => {
        if (isRecordingRef.current && mediaRecorderRef.current?.state === 'recording' && recognitionRef.current) {
          try { recognitionRef.current.start() } catch (err) {}
        }
      }
      
      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      alert('Microphone access denied. Please check your browser permissions.')
      isRecordingRef.current = false
      setIsRecording(false)
    }
  }

  const handleStopRecording = async () => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    setIsRecording(false)
    setIsProcessing(true)
    
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.onerror = null
      try { recognitionRef.current.stop() } catch(e) {}
      recognitionRef.current = null
    }
    
    const blob = await new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state !== 'recording') {
        resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
        return
      }
      recorder.onstop = () => resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
      recorder.stop()
    })

    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorderRef.current = null

    let transcript = currentTranscriptRef.current.trim()
    
    if (!transcript && blob && blob.size > 500) {
      setInterimText('✨ Transferring your voice to AI...')
      try {
        const aiText = await transcribeAudioWithAI(blob)
        if (aiText) transcript = aiText.trim()
      } catch(e) {
        console.error('Fallback transcription failed', e)
        throw e
      }
    }
    
    setInterimText('')
    if (!transcript) {
      setIsProcessing(false)
      return 
    }
    
    const newHistory = [...messages, { role: 'user', content: transcript }]
    setMessages(newHistory)
    currentTranscriptRef.current = ''

    const modeInstruction = roles.aiMode === 'professor' 
      ? `1. PROFESSOR MODE (Academic Expert): You are 'Professor', a highly professional, native English-speaking language coach preparing the user for academic exams (IELTS/TOEFL). Adapt your response length dynamically: If the user makes a significant grammar or vocabulary mistake, provide a concise but clear correction (1-2 sentences) and then ask a follow-up question to keep the conversation going. If the user's response is correct and fluent, keep your response VERY brief (e.g., 'Excellent point. And what about...?') to maintain a fast, natural conversation flow. Do NOT write long essays unless explicitly asked. Always end with a question to prompt the user to speak.`
      : `1. NORMAL MODE (Casual Chat): Direct, practical, and clear. 
         - Length: Ultra-short (1-2 sentences, max 15-20 words). Natural flow, human-like. 
         - Interaction: Do NOT end every turn with a question. React naturally.`;

    const prompt = `You are ${roles.ai} having a real-time voice conversation with ${roles.user}. Scenario: ${roles.scenario}. Target Level: ${roles.level}.
    
    Conversation history:
    ${newHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')}
    
    CRITICAL RULES:
    ${modeInstruction}
    2. BE ACCURATE & NATURAL: Speak in flawless, native English. Do NOT output any formatting tags.
    3. IELTS LIVE EXAMINER: After each user response, evaluate ONLY the user's last message against official IELTS Speaking band descriptors (Band 1-9).
       - session_score: An IELTS band score (1.0 to 9.0, half-bands allowed e.g. 6.5) based on the user's LATEST message only.
       - overall_progress: Change from previous turn as "+0.5", "-0.5", or "0".
       - feedback_type: The PRIMARY weakness area: "fluency" | "coherence" | "lexical_resource" | "grammatical_range" | "pronunciation_hint"
       - feedback_note: A SPECIFIC, actionable 1-sentence tip targeting the exact mistake made. Reference the user's actual words. Example: 'You said "I am agree" - the correct form is "I agree" (stative verb, no "be").' Never give generic praise.
    You MUST respond in valid JSON format only. JSON structure: { "spoken_reply": "Your dialogue here", "session_score": 6.5, "overall_progress": "+0.5", "feedback_type": "grammatical_range", "feedback_note": "Specific tip referencing their exact words." }`
    
    try {
      const rawText = await fetchAI(prompt, false, 350)
      let replyJson = {}
      try {
        const match = rawText.match(/\{[\s\S]*\}/)
        if (match) replyJson = JSON.parse(match[0])
      } catch(e) {
        replyJson = { spoken_reply: rawText }
      }
      setSessionScore(replyJson.session_score || sessionScore)
      setOverallProgress(replyJson.overall_progress || '0')
      setFeedbackType(replyJson.feedback_type || 'general')
      setFeedbackNote(replyJson.feedback_note || '')
      await playAiAudio(replyJson.spoken_reply || "Okay.", () => {
        setMessages(prev => [...prev, { role: 'ai', content: replyJson.spoken_reply || "Okay." }])
      })
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "[Connection error, please try again.]" }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEndSimulation = async () => {
    window.speechSynthesis.cancel()
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      try { recognitionRef.current.stop() } catch(e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop() } catch(e) {}
    }
    isRecordingRef.current = false
    setIsRecording(false)
    setIsAiSpeaking(false)
    setStatus('review')
    
    if (messages.length === 0) return
    
    setIsEvaluating(true)

    const prompt = `You are a strict, professional IELTS Speaking examiner using the official 4-criterion band descriptor rubric. Evaluate the USER's turns ONLY (ignore AI lines) from the transcript below. The user is targeting ${roles.level} level.

SCORING RULES - You MUST follow official IELTS band descriptors precisely:
- Fluency & Coherence (Band 1-9): Rate based on hesitation frequency, self-correction, use of discourse markers, logical flow.
- Lexical Resource (Band 1-9): Rate based on range, accuracy, and appropriacy of vocabulary. Identify 2-3 specific words the user used simply and provide a C1 alternative.
- Grammatical Range & Accuracy (Band 1-9): Rate based on range of structures and error frequency/impact. Quote 1-2 actual errors from the transcript with corrections.
- Pronunciation (Band 1-9): Infer from word choices and fluency patterns. Note any patterns that may affect intelligibility.
- Overall Band Score: The mean of the 4 criteria, rounded to nearest half-band (e.g. 5.5, 6.0, 6.5).

You MUST output ONLY valid JSON, no markdown, no extra text:
{
  "academic_score": "IELTS Band 6.5",
  "band_breakdown": {
    "fluency_coherence": 6.5,
    "lexical_resource": 6.0,
    "grammatical_range": 5.5,
    "pronunciation": 6.0
  },
  "evaluation": {
    "fluency_and_coherence": "Specific feedback quoting the transcript.",
    "lexical_resource": "Specific feedback with C1 alternatives.",
    "grammatical_range": "Quote exact errors with corrections.",
    "pronunciation": "Inferred feedback on clarity and stress patterns."
  },
  "overall_comment": "2-3 sentence balanced summary with one concrete study tip."
}

Transcript:
${messages.filter(m => m.role === 'user').map((m, i) => `User turn ${i+1}: ${m.content}`).join('\n')}`
    
    try {
      const evalData = await fetchAI(prompt, true)
      setFeedbackData(evalData)
    } catch (e) {
      console.error('Feedback extraction error:', e)
      setFeedbackData(null)
    } finally {
      setIsEvaluating(false)
    }
  }

  const saveSession = () => {
    if (activeSessionId) return alert('This session is already saved!')
    const newSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      roles,
      messages,
      sessionScore,
      overallProgress,
      feedbackData
    }
    const updated = [newSession, ...savedSessions]
    setSavedSessions(updated)
    localStorage.setItem('speaking_sessions', JSON.stringify(updated))
    setActiveSessionId(newSession.id)
    alert('Analysis, vocabulary, and transcript successfully saved!')
  }

  const loadSession = (session) => {
    setRoles(session.roles)
    setMessages(session.messages)
    setSessionScore(session.sessionScore || null)
    setOverallProgress(session.overallProgress || '0')
    setFeedbackData(session.feedbackData || null)
    setActiveSessionId(session.id)
    setStatus('review')
  }

  const deleteSession = (id) => {
    if (!window.confirm("Are you sure you want to delete this transcript?")) return
    const updated = savedSessions.filter(s => s.id !== id)
    setSavedSessions(updated)
    localStorage.setItem('speaking_sessions', JSON.stringify(updated))
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-zinc-100 eye-care:text-amber-950">
      
      {/* 1. SETUP EKRANI */}
      {status === 'setup' && (
        <div className="flex flex-col items-center">
          <div className="mt-8 w-full max-w-lg rounded-3xl bg-white border border-zinc-200 p-8 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-md eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            <div className="text-center mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Speaking Studio</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-zinc-50 eye-care:text-amber-950 mt-2">Set Your Role & Speak!</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300 eye-care:text-amber-900">Scenario / Context</label>
                <textarea
                  value={roles.scenario}
                  onChange={(e) => setRoles({ ...roles, scenario: e.target.value })}
                  rows="2"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:placeholder:text-amber-700/60"
                  placeholder="e.g., Ordering food at a restaurant..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300 eye-care:text-amber-900">Your Role</label>
                  <input
                    type="text"
                    value={roles.user}
                    onChange={(e) => setRoles({ ...roles, user: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:bg-transparent eye-care:border-[#EAE0C8]"
                    placeholder="e.g., Customer"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300 eye-care:text-amber-900">AI's Role</label>
                  <input
                    type="text"
                    value={roles.ai}
                    onChange={(e) => setRoles({ ...roles, ai: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:bg-transparent eye-care:border-[#EAE0C8]"
                    placeholder="e.g., Waiter"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300 eye-care:text-amber-900">English Level</label>
                <select
                  value={roles.level}
                  onChange={(e) => setRoles({ ...roles, level: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 eye-care:bg-transparent eye-care:border-[#EAE0C8]"
                >
                  <option value="A1-A2">A1-A2 (Beginner)</option>
                  <option value="B1-B2">B1-B2 (Intermediate)</option>
                  <option value="C1-C2">C1-C2 (Advanced)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300 eye-care:text-amber-900">AI Mode</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRoles({ ...roles, aiMode: 'normal' })}
                    className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all"
                    style={roles.aiMode === 'normal'
                      ? { borderColor: '#4f46e5', backgroundColor: '#eef2ff', color: '#4338ca' }
                      : { borderColor: '#e2e8f0', backgroundColor: 'transparent', color: '#64748b' }
                    }
                  >
                    <span className="text-xl">💬</span>
                    <span className="text-sm font-bold">Casual Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoles({ ...roles, aiMode: 'professor' })}
                    className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all"
                    style={roles.aiMode === 'professor'
                      ? { borderColor: '#059669', backgroundColor: '#ecfdf5', color: '#065f46' }
                      : { borderColor: '#e2e8f0', backgroundColor: 'transparent', color: '#64748b' }
                    }
                  >
                    <span className="text-xl">🎓</span>
                    <span className="text-sm font-bold">Professor</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleStartSimulation}
                disabled={isProcessing}
                className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-4 font-bold text-white transition hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Preparing...' : 'Start Simulation'}
              </button>
            </div>
          </div>

          {savedSessions.length > 0 && (
            <div className="mt-12 w-full max-w-4xl animate-fade-in">
              <button
                onClick={() => setIsSavedOpen(!isSavedOpen)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm transition hover:bg-slate-50 mb-6 dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]"
              >
                <span className="text-xl font-bold text-slate-900 dark:text-zinc-50 eye-care:text-amber-950 flex items-center gap-2">
                  <Save size={20} className="text-indigo-600" /> Saved Recordings
                </span>
                <svg className={`h-5 w-5 text-slate-500 transition-transform ${isSavedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {isSavedOpen && (
                <div className="grid gap-4 md:grid-cols-2 animate-fade-in">
                  {savedSessions.map(session => (
                    <div key={session.id} className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">{session.roles.scenario}</p>
                          {session.sessionScore && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold px-2 py-0.5 rounded text-xs">Band {session.sessionScore}</span>}
                        </div>
                        <p className="text-xs font-semibold text-indigo-600 mb-3">{session.roles.user} & {session.roles.ai}</p>
                        <div className="bg-slate-50 rounded-xl p-3 h-24 overflow-y-auto custom-scrollbar text-sm text-slate-600 border border-slate-100 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
                          {session.messages.map((m, i) => (
                            <div key={i} className="mb-2"><strong className="text-slate-800 dark:text-zinc-200 eye-care:text-amber-900">{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.content}</div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-zinc-700 eye-care:border-[#EAE0C8]">
                        <span className="text-xs text-slate-400 font-medium">{new Date(session.date).toLocaleDateString('en-US')}</span>
                        <div className="flex gap-2">
                          <button onClick={() => loadSession(session)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition text-xs font-bold" title="View Details">Review</button>
                          <button onClick={() => deleteSession(session.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. SOHBET (CHATTING) EKRANI */}
      {status === 'chatting' && (
        <div className="mx-auto mt-4 w-full max-w-3xl flex flex-col h-[80vh] rounded-[2rem] bg-slate-900 text-white shadow-2xl overflow-hidden animate-fade-in relative border border-slate-800 dark:bg-zinc-950 dark:border-zinc-800 eye-care:bg-sepia-surface eye-care:border-sepia-border eye-care:text-sepia-text">
          
          <div className="flex items-center justify-between p-6 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 z-10">
            <div>
              <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live Simulation
              </h2>
              <p className="text-xs text-slate-400 mt-1">{roles.scenario}</p>
            </div>
            <button onClick={handleEndSimulation} className="bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white transition px-4 py-2 rounded-xl text-sm font-bold">
              End Simulation
            </button>
          </div>
        
          {sessionScore !== null && (
            <div className="absolute top-24 right-6 z-20 animate-fade-in flex flex-col gap-2 w-64">
              <div className="rounded-2xl border border-slate-700/50 bg-slate-900/80 p-4 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">IELTS Live Score</span>
                  <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                    {roles.level}
                  </span>
                </div>
                
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Band Score</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-slate-100">{sessionScore}</span>
                      <span className={`text-sm font-bold flex items-center ${String(overallProgress).startsWith('+') ? 'text-emerald-400' : String(overallProgress).startsWith('-') ? 'text-rose-400' : 'text-slate-400'}`}>
                        {String(overallProgress).startsWith('+') ? '↑' : String(overallProgress).startsWith('-') ? '↓' : ''} {overallProgress !== '0' ? overallProgress : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full border-2 border-slate-700 flex items-center justify-center bg-slate-800">
                    <span className="text-lg">🎓</span>
                  </div>
                </div>

                {feedbackNote && (
                  <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-2 w-2 rounded-full ${feedbackType === 'grammatical_range' ? 'bg-rose-400' : feedbackType === 'fluency' ? 'bg-emerald-400' : feedbackType === 'lexical_resource' ? 'bg-sky-400' : feedbackType === 'coherence' ? 'bg-violet-400' : feedbackType === 'pronunciation_hint' ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">{feedbackType.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {feedbackNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center relative py-6 z-0">
            <div className="relative flex items-center justify-center mb-6">
              <div className={`absolute inset-0 rounded-full transition-all duration-500 ${isAiSpeaking ? 'bg-indigo-500/20 scale-150 animate-ping' : 'scale-100 opacity-0'}`} />
              <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isAiSpeaking ? 'bg-indigo-500/40 scale-125 animate-pulse' : 'scale-100 opacity-0'}`} />
              <div className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-slate-800 border-4 transition-colors duration-500 ${isAiSpeaking ? 'border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.5)]' : 'border-slate-700'}`}>
                <Bot size={48} className={isAiSpeaking ? 'text-indigo-400' : 'text-slate-500'} />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-200">{roles.ai}</p>
            <p className="mt-2 text-lg font-semibold text-slate-400">{isAiSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : isRecording ? 'Listening...' : 'Your Turn'}</p>
          </div>

          <div className="h-48 w-full bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent p-6 pt-12 z-10">
            <div className="h-full overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-zinc-100 eye-care:bg-[#FDF6E3] eye-care:border eye-care:border-[#EAE0C8] rounded-br-sm' : 'border border-slate-700 bg-slate-800 text-slate-100 dark:bg-zinc-700 dark:text-zinc-100 eye-care:bg-[#EAE0C8] eye-care:border-transparent eye-care:text-[#5C4B37] rounded-bl-sm'}`}>
                    <span className={`block text-[10px] uppercase font-bold opacity-60 mb-1 ${msg.role === 'user' ? 'text-slate-500 dark:text-zinc-400' : 'text-slate-400 dark:text-zinc-300'}`}>{msg.role === 'user' ? 'You' : roles.ai}</span>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isRecording && (
                <div className="flex justify-end animate-fade-in">
                  <div className="max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed bg-slate-100/90 text-slate-800 rounded-br-sm border border-slate-200 shadow-sm italic">
                    <span className="block text-[10px] uppercase font-bold opacity-60 mb-1 text-slate-500">You (Listening...)</span>
                    {interimText || 'Speak now...'}
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-sm px-5 py-3 text-sm animate-pulse border border-slate-700">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <button 
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isAiSpeaking || isProcessing}
              className={`flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
                isRecording ? 'bg-rose-500 scale-110 shadow-rose-500/50 animate-pulse text-white' : 'bg-white text-slate-900 hover:scale-105 disabled:opacity-50 disabled:scale-100'
              }`}
              title={isRecording ? "Stop Recording" : "Start Speaking"}
            >
              {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
            </button>
          </div>
        </div>
      )}

      {/* 3. REVIEW EKRANI */}
      {status === 'review' && (
        <div className="mx-auto mt-8 w-full max-w-4xl space-y-6 animate-fade-in pb-12">
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-3xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50 eye-care:text-amber-950">Session Summary</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{roles.scenario}</p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <button onClick={() => { setStatus('setup'); setMessages([]); setFeedbackData(null); setSessionScore(null); setOverallProgress('0'); setFeedbackNote(''); setFeedbackType('general'); setActiveSessionId(null); }} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-200">
                <RotateCcw size={18} /> New Simulation
              </button>
              {!activeSessionId && (
                <button onClick={saveSession} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700 shadow-sm">
                  <Save size={18} /> Save Full Analysis
                </button>
              )}
            </div>
          </div>

          {isEvaluating ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm animate-pulse dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3]">
              <div className="relative flex h-24 w-24 items-center justify-center mb-6">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-20"></span>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner">
                  <Bot size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50 mb-2">AI is analyzing your performance...</h3>
              <p className="text-slate-500 dark:text-zinc-400">Your grammar, vocabulary choices, and fluency are being evaluated in detail.</p>
              <div className="w-full max-w-xl mt-10 space-y-4 px-6">
                <div className="h-3 bg-slate-100 rounded-full w-3/4 mx-auto"></div>
                <div className="h-3 bg-slate-100 rounded-full w-full mx-auto"></div>
                <div className="h-3 bg-slate-100 rounded-full w-5/6 mx-auto"></div>
              </div>
            </div>
          ) : feedbackData ? (
            <div className="space-y-6">
              
              {/* Academic Score Badge */}
              <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner shrink-0">
                  <span className="text-xl font-black">🎓</span>
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold">{feedbackData.academic_score || 'N/A'}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Official IELTS Examiner Score</p>
                </div>
              </div>

              {/* Band Breakdown Grid */}
              {feedbackData.band_breakdown && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'fluency_coherence', label: 'Fluency & Coherence', icon: '🗣️', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/20', darkBorder: 'dark:border-emerald-800/50', darkText: 'dark:text-emerald-400' },
                    { key: 'lexical_resource', label: 'Lexical Resource', icon: '📚', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', darkBg: 'dark:bg-sky-900/20', darkBorder: 'dark:border-sky-800/50', darkText: 'dark:text-sky-400' },
                    { key: 'grammatical_range', label: 'Grammar Range', icon: '✍️', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', darkBg: 'dark:bg-rose-900/20', darkBorder: 'dark:border-rose-800/50', darkText: 'dark:text-rose-400' },
                    { key: 'pronunciation', label: 'Pronunciation', icon: '🎙️', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-900/20', darkBorder: 'dark:border-amber-800/50', darkText: 'dark:text-amber-400' },
                  ].map(({ key, label, icon, bg, border, text, darkBg, darkBorder, darkText }) => (
                    <div key={key} className={`rounded-2xl ${bg} ${border} ${darkBg} ${darkBorder} border p-4 text-center`}>
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className={`text-3xl font-black ${text} ${darkText}`}>
                        {feedbackData.band_breakdown[key] ?? '—'}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wide ${text} ${darkText} mt-1 opacity-80`}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Overall Comment — 🔴 DÜZELTİLDİ */}
              <div className="rounded-3xl bg-indigo-50/50 border border-indigo-100 p-6 shadow-sm dark:bg-indigo-900/20 dark:border-indigo-800/50 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📋</span> Overall Comment
                </h3>
                <p className="text-slate-900 dark:text-zinc-100 eye-care:text-amber-950 leading-relaxed font-semibold">{feedbackData.overall_comment}</p>
              </div>

              {/* Evaluation Sections — 🔴 DÜZELTİLDİ */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl bg-white border border-emerald-100 p-6 shadow-sm dark:bg-emerald-900/20 dark:border-emerald-800/50 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <span>🗣️</span> Fluency & Coherence
                  </h3>
                  <p className="text-sm text-slate-900 dark:text-zinc-100 eye-care:text-amber-950 font-semibold leading-relaxed">{feedbackData.evaluation?.fluency_and_coherence}</p>
                </div>
                <div className="rounded-3xl bg-white border border-sky-100 p-6 shadow-sm dark:bg-sky-900/20 dark:border-sky-800/50 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
                  <h3 className="text-base font-bold text-sky-900 dark:text-sky-400 mb-3 flex items-center gap-2">
                    <span>📚</span> Lexical Resource
                  </h3>
                  <p className="text-sm text-slate-900 dark:text-zinc-100 eye-care:text-amber-950 font-semibold leading-relaxed">{feedbackData.evaluation?.lexical_resource}</p>
                </div>
                <div className="rounded-3xl bg-white border border-rose-100 p-6 shadow-sm dark:bg-rose-900/20 dark:border-rose-800/50 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
                  <h3 className="text-base font-bold text-rose-900 dark:text-rose-400 mb-3 flex items-center gap-2">
                    <span>✍️</span> Grammatical Range & Accuracy
                  </h3>
                  <p className="text-sm text-slate-900 dark:text-zinc-100 eye-care:text-amber-950 font-semibold leading-relaxed">{feedbackData.evaluation?.grammatical_range}</p>
                </div>
                <div className="rounded-3xl bg-white border border-amber-100 p-6 shadow-sm dark:bg-amber-900/20 dark:border-amber-800/50 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
                  <h3 className="text-base font-bold text-amber-900 dark:text-amber-400 mb-3 flex items-center gap-2">
                    <span>🎙️</span> Pronunciation
                  </h3>
                  <p className="text-sm text-slate-900 dark:text-zinc-100 eye-care:text-amber-950 font-semibold leading-relaxed">{feedbackData.evaluation?.pronunciation}</p>
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <button onClick={() => { setStatus('setup'); setMessages([]); setFeedbackData(null); setSessionScore(null); setOverallProgress('0'); setFeedbackNote(''); setFeedbackType('general'); setActiveSessionId(null); }} className="rounded-2xl bg-slate-900 px-8 py-4 font-bold text-white transition hover:bg-slate-800 shadow-xl shadow-slate-900/20">
                  Start New Simulation
                </button>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><User size={20} className="text-indigo-500"/> Full Conversation Transcript</h3>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5 max-h-96 overflow-y-auto custom-scrollbar shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300 eye-care:bg-transparent eye-care:border eye-care:border-[#EAE0C8]'}`}>
                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">{msg.role === 'user' ? 'You (' + roles.user + ')' : 'AI (' + roles.ai + ')'}</p>
                        <p className="text-slate-800 dark:text-zinc-200 eye-care:text-amber-900 leading-relaxed font-medium text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
              <p className="text-slate-500">Analysis data could not be generated, or the conversation was too short.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}