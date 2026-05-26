import { useState, useEffect, useMemo, useRef } from 'react'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : 'https://note-app-server-44hm.onrender.com';

// --- KALICI BELLEK (IndexedDB) YÖNETİMİ ---
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

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

// Yardımcı fonksiyon: API İsteği
async function fetchAI(prompt, expectJson = false) {
  const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, expectJson, maxTokens: expectJson ? 8000 : 1500, apiKey: getUserApiKey() })
  });

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
    throw new Error(data.error || 'AI Hatası');
  }
  return expectJson ? data.content : data.content;
}

// Yeni Yardımcı Fonksiyon: Audio Transcription via AI (Whisper / Gemini)
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

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429) alert(data.error);
    throw new Error(data.error || 'Transcription Hatası');
  }
  return data.text;
}

const normalize = (str) => {
  if (!str) return ''
  return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_~()]/g, "").trim()
}

export default function KnowledgeValidationEngine({ words = [], allWords = [], onComplete, onCancel }) {
  const [tasks, setTasks] = useState([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [scoreMap, setScoreMap] = useState({})

  // Yapay Zeka Test Verileri
  const [testDataMap, setTestDataMap] = useState({})
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  
  // Kullanıcı Girdileri ve Geri Bildirimler
  const [inputValue, setInputValue] = useState('')
  const [feedback, setFeedback] = useState(null) // { isCorrect: bool, text: string }
  
  const [recordingStatus, setRecordingStatus] = useState('idle') // 'idle' | 'recording' | 'review' | 'analyzing'
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [audioUrl, setAudioUrl] = useState('')
  const cumulativeTranscriptRef = useRef('') // Kesintilerde önceki metinleri hafızada tutar

  // Aktif Görev Verileri
  const currentTask = tasks[currentTaskIndex]
  const currentWord = currentTask?.word
  const layer = currentTask?.layer
  const testData = currentWord ? testDataMap[currentWord.id] : null

  // Layer 1: Çoktan Seçmeli (Recognition) Seçenekleri
  const layer1Options = useMemo(() => {
    if (!currentWord) return []
    const distractors = allWords
      .filter(w => w.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.turkish)
    
    while (distractors.length < 3) {
      distractors.push('Rastgele Anlam ' + Math.floor(Math.random() * 100))
    }
    
    return [...distractors, currentWord.turkish].sort(() => Math.random() - 0.5)
  }, [currentWord, allWords])

  // Layer 2: Bağlam (Context) Anti-Predictability Çeldiricileri (İngilizce)
  const layer2Options = useMemo(() => {
    if (!currentWord) return []
    const distractors = allWords
      .filter(w => w.id !== currentWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.english)
    
    while (distractors.length < 3) {
      distractors.push('randomWord' + Math.floor(Math.random() * 100))
    }
    return [...distractors, currentWord.english].sort(() => Math.random() - 0.5)
  }, [currentWord, allWords])

  // Sesleri Önden Yükle (Web Speech API Güvencesi)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices()
      }
    }
  }, [])

  // Interleaving Engine & Toplu AI Verisi
  useEffect(() => {
    let isMounted = true

    // 1. Task Havuzunu Oluştur ve Karıştır (Kaos Motoru)
    let generatedTasks = []
    let initialScores = {}
    words.forEach(w => {
      initialScores[w.id] = 0 // Sıfırdan başlar, doğru oldukça 20 artar
      for(let i=1; i<=5; i++) {
        generatedTasks.push({ word: w, layer: i })
      }
    })
    
    // Array Shuffle (Fisher-Yates)
    for (let i = generatedTasks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [generatedTasks[i], generatedTasks[j]] = [generatedTasks[j], generatedTasks[i]];
    }
    
    setTasks(generatedTasks)
    setScoreMap(initialScores)

    // 2. Tüm kelimeler için Tek Seferde AI Test Verisi Çek
    const generateContext = async () => {
      setIsLoadingContext(true)
      const prompt = `You are a strict English vocabulary test generator.
      For each word in the list below, generate a testing dataset.
      
      Words to process:
      ${words.map(w => `- ID: "${w.id}", English: "${w.english}", Turkish: "${w.turkish}"`).join('\n')}
      
      Return ONLY a valid JSON object where keys are the Word IDs, and values are objects containing:
      { "context_paragraph": "A short paragraph (max 2 sentences) using the exact word, but replace the word with '_____'.", "listening_sentence": "A natural, complete English sentence using the word.", "speaking_scenario": "Instruct the user to SPEAK a specific sentence in a specific scenario using this word.", "writing_scenario": "Instruct the user to WRITE an original sentence using this word in a specific context." }`

      try {
        const rawResponse = await fetchAI(prompt, true)
        const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleanJson)
        if (isMounted) setTestDataMap(parsed)
      } catch (err) {
        console.warn('AI context generation failed, using fallbacks', err)
        if (isMounted) {
          const fallbackMap = {}
          words.forEach(w => {
            fallbackMap[w.id] = {
              context_paragraph: `This is a fallback sentence where you should insert the word _____.`,
              listening_sentence: `This is a spoken sentence containing the word ${w.english}.`,
              speaking_scenario: `Speak a creative sentence using the word "${w.english}".`,
              writing_scenario: `Write a creative sentence using the word "${w.english}".`
            }
          })
          setTestDataMap(fallbackMap)
        }
      } finally {
        if (isMounted) setIsLoadingContext(false)
      }
    }
    
    if (words.length > 0) generateContext()
    return () => { isMounted = false }
  }, [words])

  // Ses Oynatma Fonksiyonu (Blind Listening)
  const playAudio = async (text) => {
    if (isAudioPlaying) return
    setIsAudioPlaying(true)

    const fallbackToWebSpeech = () => {
      if (!('speechSynthesis' in window)) { setIsAudioPlaying(false); return }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB') || voices.find(v => v.lang.startsWith('en'))
      if (englishVoice) utterance.voice = englishVoice
      utterance.onend = () => setIsAudioPlaying(false)
      utterance.onerror = () => setIsAudioPlaying(false)
      window.speechSynthesis.speak(utterance)
    }

    const wordCount = text.trim().split(/\s+/).length
    if (wordCount < 3) {
      fallbackToWebSpeech()
      return
    }

    try {
      let blobToPlay = null
      const cacheKey = `en-US-${text.toLowerCase().trim()}`
      
      // 1. IndexedDB Check
      const cachedBlob = await getAudioFromDB(cacheKey)
      if (cachedBlob) {
        blobToPlay = cachedBlob
      } else {
        const response = await fetch(`${getBaseUrl()}/api/ai/speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'alloy' })
        })
        if (response.ok) { blobToPlay = await response.blob(); await saveAudioToDB(cacheKey, blobToPlay); }
        else if (response.status === 429) { const err = await response.json(); alert(err.error); }

      if (!blobToPlay) {
          const googleUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en-US&q=${encodeURIComponent(text)}`
        const res = await fetch(googleUrl)
          if (res.ok) { blobToPlay = await res.blob(); await saveAudioToDB(cacheKey, blobToPlay); }
        }
      }

      if (blobToPlay) {
        const audioSource = URL.createObjectURL(blobToPlay)
        const audio = new Audio(audioSource)
        audio.onended = () => { URL.revokeObjectURL(audioSource); setIsAudioPlaying(false); }
        audio.onerror = () => { URL.revokeObjectURL(audioSource); setIsAudioPlaying(false); }
        await audio.play()
        return // Başarılıysa fonksiyonu bitir
      }
    } catch (err) {
      console.warn('API okuması başarısız, yerleşik motora dönülüyor:', err)
    }

    fallbackToWebSpeech()
  }

  // Ses Kayıt Fonksiyonu (Spoken Production)
  const handleStartRecording = async () => {
    if (recordingStatus !== 'idle') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Tarayıcınız ses tanımayı desteklemiyor. Lütfen Chrome kullanın.')
      return
    }

    setInputValue('')
    setAudioUrl('')
    audioChunksRef.current = []
    cumulativeTranscriptRef.current = ''

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((track) => track.stop())
        setRecordingStatus('review')
        
        // Tarayıcı desteklemiyorsa veya zayıf kaldıysa asıl transkripti doğrudan AI'a (Whisper/Gemini) yaptır
        setInputValue('✨ Yapay zeka sesinizi metne döküyor, lütfen bekleyin...')
        try {
          const aiText = await transcribeAudioWithAI(blob)
          setInputValue(aiText)
          cumulativeTranscriptRef.current = aiText
        } catch (err) {
          console.error('AI Transkript Hatası:', err)
          setInputValue(cumulativeTranscriptRef.current || 'Ses tam anlaşılamadı, lütfen tekrar deneyin.')
        }
      }

      mediaRecorderRef.current = mediaRecorder

      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.interimResults = true
      recognition.continuous = true // KRİTİK: Duraksamalarda metin çevirisinin kesilmesini önler
      
      recognition.onresult = (e) => {
        let interim = ''
        let finalStr = ''
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalStr += e.results[i][0].transcript + ' '
          } else {
            interim += e.results[i][0].transcript
          }
        }
        if (finalStr) cumulativeTranscriptRef.current += finalStr
        setInputValue((cumulativeTranscriptRef.current + interim).trim())
      }
      
      recognition.onerror = (e) => {
        console.warn("SpeechRecognition Hatası (Önemsiz olabilir):", { error: e.error, message: e.message })
        // 'no-speech' (sessizlik) gibi ufak hatalarda asıl ses kaydını (MediaRecorder) BÖLME.
        if (e.error === 'not-allowed' || e.error === 'audio-capture') {
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop()
          }
          setRecordingStatus('idle')
          alert('Mikrofon erişiminde bir sorun var. Lütfen izinleri kontrol edin.')
        }
      }

      recognition.onend = () => {
        // Eğer kayıt devam ediyorsa ve ses motoru nefes alırken uykuya daldıysa zorla yeniden başlat (Kopmaları %100 önler)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            recognition.start()
          } catch (err) { }
        }
      }

      recognitionRef.current = recognition

      mediaRecorder.start()
      recognition.start()
      setRecordingStatus('recording')
    } catch (err) {
      console.error("Speaking Hatası Detayı (getUserMedia):", { name: err.name, message: err.message, stack: err.stack })
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert('Mikrofon izni reddedildi. Tarayıcı ayarlarından izin verip sayfayı yenileyin.')
      } else {
        alert('Kayıt sırasında bir hata oluştu (Mikrofon bulunamadı veya başka bir sorun var).')
      }
      setRecordingStatus('idle')
    }
  }

  const handleStopRecording = () => {
    if (recordingStatus !== 'recording') return

    // MediaRecorder'ı ÖNCE durdur ki onend event'i kaydın bittiğini anlasın ve sonsuz döngüye girmesin
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      setRecordingStatus('review')
    }

    try {
      recognitionRef.current?.stop()
    } catch(e) {
      console.error(e)
    }
  }

  const handleRetry = () => {
    setRecordingStatus('idle')
    setAudioUrl('')
    setInputValue('')
    audioChunksRef.current = []
  }

  const handleLayerSubmit = async () => {
    let earned = 0

    if (layer === 1) {
      const isCorrect = inputValue === currentWord.turkish
      if (isCorrect) earned = 20
      setFeedback({
        isCorrect,
        text: isCorrect ? 'Doğru! Kelimenin anlamını tanıyorsunuz.' : `Yanlış. Doğru cevap: ${currentWord.turkish}`
      })
    } 
    else if (layer === 2) {
      const isCorrect = inputValue === currentWord.english
      if (isCorrect) earned = 20
      setFeedback({
        isCorrect,
        text: isCorrect ? 'Harika! Bağlam içinde kelimeyi doğru tahmin ettiniz.' : `Yanlış. Boşluğa "${currentWord.english}" gelmeliydi.`
      })
    }
    else if (layer === 3) {
      const cleanInput = normalize(inputValue)
      const targetSentence = normalize(testData.listening_sentence)
      
      const isCorrect = cleanInput === targetSentence
      
      if (isCorrect) earned = 20
      setFeedback({
        isCorrect,
        text: isCorrect ? 'Mükemmel! Duyduğunuzu anlama beceriniz çok iyi.' : `Eksik veya hatalı dikte. Asıl cümle şuydu: "${testData.listening_sentence}"`
      })
    }
    else if (layer === 4) {
      // Semantic AI Judgment
      setRecordingStatus('analyzing')
      setIsEvaluating(true)
      const prompt = `You are an English teacher evaluating a student's spoken sentence. 
      Target Word: "${currentWord.english}"
      Student's Spoken Transcript: "${inputValue}"
      
      Evaluate if the student used the target word correctly in terms of SEMANTICS (meaning) and GRAMMAR.
      Return ONLY a raw valid JSON object (no markdown):
      {
        "isCorrect": boolean (true if meaning is correct and grammar is mostly acceptable),
        "feedback": "Detailed Turkish feedback explaining if it's correct, praising them, or pointing out grammar/meaning mistakes.",
        "penalty": number (0 if perfect, 10 if minor grammar issue, 20 if completely wrong meaning)
      }`

      try {
        const rawResponse = await fetchAI(prompt, true)
        const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleanJson)
        
        earned = Math.max(0, 20 - (parsed.penalty || 0))
        setFeedback({
          isCorrect: parsed.isCorrect,
          text: parsed.feedback
        })
      } catch (err) {
        console.error('Semantic AI Evaluation Error', err)
        earned = 20
        setFeedback({
          isCorrect: true,
          text: "Cümleniz alındı, ancak AI yargıcı şu an meşgul. Varsayılan olarak geçerli kabul edildi."
        })
      } finally {
        setIsEvaluating(false)
      }
    }
    else if (layer === 5) {
      // Semantic AI Judgment (Writing)
      setIsEvaluating(true)
      const prompt = `You are an English teacher evaluating a student's written sentence. 
      Target Word: "${currentWord.english}"
      Student's Written Sentence: "${inputValue}"
      
      Evaluate if the student used the target word correctly in terms of SEMANTICS (meaning) and GRAMMAR.
      Return ONLY a raw valid JSON object (no markdown):
      {
        "isCorrect": boolean (true if meaning is correct and grammar is mostly acceptable),
        "feedback": "Detailed Turkish feedback explaining if it's correct, praising them, or pointing out grammar/meaning mistakes.",
        "penalty": number (0 if perfect, 10 if minor grammar issue, 20 if completely wrong meaning)
      }`

      try {
        const rawResponse = await fetchAI(prompt, true)
        const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleanJson)
        
        earned = Math.max(0, 20 - (parsed.penalty || 0))
        setFeedback({
          isCorrect: parsed.isCorrect,
          text: parsed.feedback
        })
      } catch (err) {
        console.error('Semantic AI Evaluation Error', err)
        earned = 20
        setFeedback({
          isCorrect: true,
          text: "Cümleniz alındı, ancak AI yargıcı şu an meşgul. Varsayılan olarak geçerli kabul edildi."
        })
      } finally {
        setIsEvaluating(false)
      }
    }

    // Puanı Arka Planda Güncelle (Silent Scoring)
    setScoreMap(prev => ({ ...prev, [currentWord.id]: prev[currentWord.id] + earned }))
  }

  const nextLayer = () => {
    setFeedback(null)
    setInputValue('')
    setAudioUrl('')
    setRecordingStatus('idle')
    audioChunksRef.current = []
    setCurrentTaskIndex(prev => prev + 1)
  }

  const finishValidation = () => {
    onComplete(scoreMap)
  }

  if (tasks.length === 0) return null

  const isFinished = currentTaskIndex >= tasks.length

  return (
    <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
      {/* Header & Progress */}
      <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 rounded-t-[2rem] dark:border-zinc-700 dark:bg-zinc-900/50 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Çapraz Sınav (Interleaved PoK)</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Soru: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{Math.min(currentTaskIndex + 1, tasks.length)} / {tasks.length}</span></p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div 
            className="bg-indigo-600 transition-all duration-500" 
            style={{ width: `${(Math.min(currentTaskIndex, tasks.length) / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Workspace */}
      <div className="p-8">
        {/* Yükleme Ekranı (Data Beklerken) */}
        {isLoadingContext && !isFinished ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <svg className="mb-4 h-10 w-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="font-medium animate-pulse">Yapay zeka test senaryolarını hazırlıyor...</p>
          </div>
        ) : !isFinished ? (
          <>
            {/* LAYER 1: RECOGNITION */}
            {layer === 1 && !feedback && (
              <div className="animate-fade-in">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400 text-center">Tanıma (Recognition)</p>
                <h3 className="mb-6 text-center text-xl font-semibold text-slate-800">
                  "<span className="text-indigo-600">{currentWord.english}</span>" kelimesinin Türkçe anlamı hangisidir?
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {layer1Options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue(opt)}
                      className={`rounded-2xl border-2 px-4 py-4 font-semibold transition ${
                        inputValue === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LAYER 2: CONTEXT & ANTI-PREDICTABILITY */}
            {layer === 2 && !feedback && testData && (
              <div className="animate-fade-in">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Bağlam (Context)</p>
                <div className="mb-6 rounded-2xl bg-indigo-50/50 p-6 border border-indigo-100">
                  <p className="text-lg leading-relaxed text-slate-700">{testData.context_paragraph}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {layer2Options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue(opt)}
                      className={`rounded-2xl border-2 px-4 py-4 font-bold transition ${
                        inputValue === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LAYER 3: BLIND LISTENING */}
            {layer === 3 && !feedback && testData && (
              <div className="animate-fade-in">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400 text-center">Kör Dinleme (Blind Listening)</p>
                <div className="mb-6 flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 border border-slate-200">
                  <button 
                    onClick={() => playAudio(testData.listening_sentence)}
                    disabled={isAudioPlaying}
                    className="flex items-center gap-3 rounded-full bg-indigo-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700 disabled:opacity-50 disabled:scale-100"
                  >
                    🔊 Dinle
                  </button>
                  <p className="mt-4 text-sm font-medium text-slate-500">Cümleyi dinleyin ve duyduğunuzu aşağıya yazın.</p>
                </div>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Duyduğunuz İngilizce cümleyi buraya dikte edin..."
                  className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-5 py-4 text-lg text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B]"
                  autoFocus
                />
              </div>
            )}

            {/* LAYER 4: SPOKEN PRODUCTION */}
            {layer === 4 && !feedback && testData && (
              <div className="animate-fade-in">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Sesli Üretim (Speaking)</p>
                <div className="mb-6 flex items-start gap-4 rounded-2xl bg-amber-50 p-5 border border-amber-200">
                  <span className="text-2xl">🤖</span>
                  <p className="text-sm font-medium leading-relaxed text-amber-900">{testData.speaking_scenario}</p>
                </div>
                <div className="mb-4 flex flex-col items-center">
                {recordingStatus === 'idle' && (
                    <>
                      <button 
                      onClick={handleStartRecording}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all hover:bg-slate-800"
                      >
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </button>
                    <p className="mt-3 text-xs font-semibold text-slate-500">Başlamak için dokunun</p>
                    </>
                  )}
                {recordingStatus === 'recording' && (
                  <>
                    <button 
                      onClick={handleStopRecording}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/50 transition-all animate-pulse scale-110"
                    >
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
                    </button>
                    <p className="mt-3 text-xs font-semibold text-rose-500">Kayıt Devam Ediyor... (Durdurmak için tıklayın)</p>
                  </>
                )}
                {recordingStatus === 'review' && (
                    <div className="mt-4 flex flex-col items-center gap-4">
                      {audioUrl && <audio controls src={audioUrl} className="w-full max-w-xs" />}
                      <div className="flex gap-3">
                      <button onClick={handleRetry} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm">
                          🔄 Yeniden Dene
                        </button>
                      <button onClick={handleLayerSubmit} disabled={inputValue.startsWith('✨')} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        ✅ Onayla ve Gönder
                        </button>
                      </div>
                    </div>
                  )}
                {recordingStatus === 'analyzing' && (
                  <div className="mt-4 flex flex-col items-center gap-3">
                    <svg className="h-8 w-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-sm font-semibold text-indigo-600">AI Yargılıyor...</p>
                  </div>
                )}
                </div>
              {recordingStatus !== 'analyzing' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 min-h-[60px]">
                  <p className={`text-center font-medium ${inputValue ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                    {inputValue || 'Söylediğiniz cümle burada belirecek...'}
                  </p>
                </div>
              )}
              </div>
            )}

            {/* LAYER 5: WRITTEN PRODUCTION */}
            {layer === 5 && !feedback && testData && (
              <div className="animate-fade-in">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">Yazılı Üretim (Writing)</p>
                <div className="mb-6 flex items-start gap-4 rounded-2xl bg-indigo-50 p-5 border border-indigo-200">
                  <span className="text-2xl">✍️</span>
                  <p className="text-sm font-medium leading-relaxed text-indigo-900">{testData.writing_scenario}</p>
                </div>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`"${currentWord.english}" kelimesini kullanarak yaratıcı bir cümle yazın...`}
                  className="w-full resize-none rounded-2xl border-2 border-zinc-200 bg-white px-5 py-4 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B]"
                  rows="3"
                  autoFocus
                />
              </div>
            )}

            {/* GERİ BİLDİRİM EKRANI (Tüm katmanlar için ortak) */}
            {feedback && !isFinished && (
              <div className="animate-fade-in flex flex-col items-center text-center">
                <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full ${feedback.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {feedback.isCorrect ? (
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <h3 className={`mb-2 text-2xl font-bold ${feedback.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {feedback.isCorrect ? 'Başarılı!' : 'Hata Yapıldı'}
                </h3>
                <p className="mb-8 text-slate-600 max-w-md leading-relaxed">{feedback.text}</p>
                
                <button onClick={nextLayer} className="rounded-2xl bg-slate-900 px-8 py-3.5 font-bold text-white transition hover:bg-slate-800">
                  {currentTaskIndex === tasks.length - 1 ? 'Sonuçları Gör' : 'Sıradaki Soruya Geç'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="animate-fade-in flex flex-col items-center text-center">
            <div className="mb-4 text-6xl">📊</div>
            <h2 className="mb-6 text-3xl font-black text-slate-900">Sınav Tamamlandı!</h2>
            <div className="w-full space-y-3 mb-8">
              {words.map(w => {
                const finalScore = scoreMap[w.id] || 0
                const isMastered = finalScore >= 90
                return (
                  <div key={w.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <div>
                      <p className="font-bold text-slate-900">{w.english} <span className="font-medium text-slate-500">- {w.turkish}</span></p>
                      {isMastered ? (
                        <p className="text-xs font-semibold text-emerald-600 mt-1">Öğrenildi (Mastered)</p>
                      ) : (
                        <p className="text-xs font-semibold text-amber-600 mt-1">Daha fazla pratik gerekli</p>
                      )}
                    </div>
                    <div className={`text-xl font-black ${isMastered ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {finalScore}%
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={finishValidation} className="rounded-2xl bg-indigo-600 px-8 py-3.5 font-bold text-white transition hover:bg-indigo-700">
              Sınavı Bitir ve Kaydet
            </button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      {!feedback && !isFinished && !isLoadingContext && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-8 py-5 rounded-b-[2rem]">
          <button onClick={onCancel} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Vazgeç
          </button>
          
          {layer !== 4 && (
            <button 
              onClick={handleLayerSubmit} 
              disabled={!inputValue.trim() || isEvaluating}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" 
                  cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  AI Değerlendiriyor...
                </>
              ) : (
                <>
                  Cevapla
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
