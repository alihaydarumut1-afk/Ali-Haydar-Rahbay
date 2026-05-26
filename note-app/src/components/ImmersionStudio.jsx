import { useState, useEffect, useRef } from 'react'
import { PenTool, X } from 'lucide-react'
import useWords from '../hooks/useWords.js'

const formatUrl = (url) => {
  if (!url) return "";
  let val = url.trim();
  return val.startsWith("http") ? val : "https://" + val;
};

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\?v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};
const getBaseUrl = () => 'https://note-app-server-44hm.onrender.com'; 

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

async function fetchAI(prompt, expectJson = false) {
  const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, expectJson, maxTokens: expectJson ? 8000 : 1500, apiKey: getUserApiKey() })
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
    throw new Error(data.error || 'AI hatası');
  }

  return data.content;
}

function parseAIJson(content) {
  let jsonText = content.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    jsonText = match[0];
  }
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    throw new Error('Yapay zeka eksik veri döndürdü, lütfen tekrar deneyin.');
  }
}

export default function ImmersionStudio() {
  const { words = [], addWord } = useWords() || {}
  // 1. Temiz State Mimarisi
  const [inputValue, setInputValue] = useState('')
  const [activeUrl, setActiveUrl] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  
  // Dil Laboratuvarı Sağ Panel State'leri
  const [rightTab, setRightTab] = useState('transcript') // transcript, grammar, quiz
  const [currentTime, setCurrentTime] = useState(0) // Senkronizasyon Motoru State'i
  const [selectedAnalysis, setSelectedAnalysis] = useState(null) // Bağlamsal AI Analiz State'i
  const [selectedSentenceAnalysis, setSelectedSentenceAnalysis] = useState(null) // Uzman Cümle Analizi State'i
  
  // AI Veri State'leri
  const [transcriptData, setTranscriptData] = useState([])
  const [quizData, setQuizData] = useState(null)

  // Quiz State'leri
  const [quizAnswers, setQuizAnswers] = useState({})
  const [showExplanations, setShowExplanations] = useState({})

  // Yüklenme (Loading) State'leri
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false)
  const [isQuizLoading, setIsQuizLoading] = useState(false)
  const iframeRef = useRef(null)

  // Akıllı Not Defteri (Floating Notepad) State'leri
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [notes, setNotes] = useState(() => localStorage.getItem('media-lab-notes') || '')
  const [savedVideoNotes, setSavedVideoNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('media_lab_archived_notes') || '[]') } catch { return [] }
  })
  const [noteTab, setNoteTab] = useState('write') // 'write' | 'archive'

  useEffect(() => {
    localStorage.setItem('media-lab-notes', notes)
  }, [notes])

  // Hydration Hatalarını Önleme
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSaveVideoNote = () => {
    if (!notes.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      content: notes,
      date: new Date().toISOString(),
      url: activeUrl || ''
    };
    const updated = [newNote, ...savedVideoNotes];
    setSavedVideoNotes(updated);
    localStorage.setItem('media_lab_archived_notes', JSON.stringify(updated));
    setNotes(''); // Mevcut notu temizle
    setNoteTab('archive'); // Arşiv sekmesine geç
  }

  const handleDeleteVideoNote = (id) => {
    if(!window.confirm("Bu notu arşivden silmek istediğinize emin misiniz?")) return;
    const updated = savedVideoNotes.filter(n => n.id !== id);
    setSavedVideoNotes(updated);
    localStorage.setItem('media_lab_archived_notes', JSON.stringify(updated));
  }

  const handlePlay = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const url = formatUrl(inputValue);
    setActiveUrl(url);

    // Önceki verileri temizle
    setTranscriptData([]);
    setQuizData(null);
    setSelectedAnalysis(null);
    setSelectedSentenceAnalysis(null);

    // Eğer geçerli bir YouTube linki ise transkripti otomatik çek
    if (getYouTubeId(url)) {
      setIsTranscriptLoading(true);
      try {
        const data = await generateAITranscript(url);
        setTranscriptData(data);
      } catch (error) {
        console.error("Transcript fetch error:", error);
        if (error.message === 'SUNUCU_KAPALI') {
          alert("Bağlantı Hatası: Arka plan sunucusu (server.js) çalışmıyor.\n\nVS Code'da yeni bir terminal açıp 'node server.js' komutunu çalıştırarak sunucuyu başlatın.");
        } else {
          alert(`Transkript Hatası: ${error.message}\n\nLütfen videonun dışarıdan eklenebilir İngilizce altyazısı (CC) olduğundan emin olun.`);
        }
      } finally {
        setIsTranscriptLoading(false);
      }
    }
  }

  // --- AI Servis Fonksiyonları (Async Fetch) ---
  const generateAITranscript = async (videoUrl) => {
    const videoId = getYouTubeId(videoUrl)
    if (!videoId) throw new Error('Geçersiz YouTube linki')
    
    // En güvenilir yöntem olan Arka Plan Sunucusu (Local Server - server.js) üzerinden çekim
    try {
      // Dinamik port desteği: Uygulama hangi porttaysa o portu kullanır (Dev modunda 3000).
      const baseUrl = 'https://note-app-server-44hm.onrender.com';
      const response = await fetch(
        `${baseUrl}/api/transcript?videoId=${videoId}`
      )
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Transkript alınamadı (API Hatası)')
      }
      
      return await response.json()
   } catch (error) {
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        throw new Error('SUNUCU_KAPALI')
      }
      throw error
    }
  }

  const generateVideoQuiz = async (transcriptText) => {
    const prompt = `Aşağıdaki metne dayanarak B1-B2 zorluğunda 5-10 soruluk bir İngilizce test hazırla ve metinde geçen B2 seviyesi ve üstü (B2, C1, C2) önemli kelimeleri listele. Çıktıyı kesinlikle şu JSON formatında ver: 
{
  "questions": [ { "question": "", "options": ["", "", "", ""], "answer": "", "explanation": "Neden bu cevap doğru?" } ],
  "advancedWords": [ { "word": "", "turkishMeaning": "", "type": "Noun|Verb|Adjective|Phrasal Verb", "contextSentence": "" } ]
}
Metin: ${transcriptText}`;
    
    const content = await fetchAI(prompt, true);
    const data = parseAIJson(content);
    
    return {
      questions: (data.questions || []).map((q, idx) => ({ id: idx + 1, type: idx === 0 ? 'comprehension' : 'grammar', question: q.question, options: q.options || [], correct: q.options ? Math.max(0, q.options.indexOf(q.answer)) : 0, explanation: q.explanation })),
      advancedWords: data.advancedWords || []
    };
  }

  // --- Buton Handler'ları ---
  const handleGenerateQuiz = async () => {
    if (transcriptData.length === 0) return
    setIsQuizLoading(true)
    try {
      const rawText = transcriptData.map(t => t.text).join(' ')
      const data = await generateVideoQuiz(rawText)
      setQuizData(data)
    } catch (error) {
      console.error(error)
      alert(`Quiz Üretim Hatası: ${error.message}\n(API anahtarınızı veya internet bağlantınızı kontrol edin.)`)
    } finally {
      setIsQuizLoading(false)
    }
  }

  // AI Bağlamsal Analiz (Contextual LLM)
  const handleWordAnalysis = async (e, word, fullSentence) => {
    e.stopPropagation()
    setSelectedSentenceAnalysis(null) // Diğer açık paneli kapat
    const cleanWord = word.replace(/[^a-zA-ZğüşöçİĞÜŞÖÇ'-]/g, '').toLowerCase()
    if (!cleanWord) return
    
    setSelectedAnalysis({ word: cleanWord, sentence: fullSentence, isLoading: true, data: null, error: null })
    
    const prompt = `Şu an B1-B2 seviyesinde İngilizce öğrenen bir kullanıcı şu cümleyi inceliyor: '${fullSentence}'. Kullanıcı cümleden '${cleanWord}' kelimesini seçti. 1) Bu kelimenin bu cümledeki tam Türkçe anlamını, 2) Cümlede geçen ana gramer yapısını (Örn: Present Perfect, Passive), 3) Bu kelimeyle kurulmuş örnek bir B2 seviyesi cümleyi bana JSON formatında dön: { "translation": "", "grammar_structure": "", "example_sentence": "" }`;
    
    try {
      const content = await fetchAI(prompt, true);
      const data = parseAIJson(content);
      setSelectedAnalysis({ word: cleanWord, sentence: fullSentence, isLoading: false, data, error: null })
    } catch (err) {
      console.error("Contextual Analysis Error:", err)
      setSelectedAnalysis({ word: cleanWord, sentence: fullSentence, isLoading: false, data: null, error: err.message || 'Analiz tamamlanamadı.' })
    }
  }

  // Uzman Gramer Cümle Analizi (Expert Grammar Teacher)
  const handleSentenceAnalysis = async (e, sentenceItem, index) => {
    e.stopPropagation()
    setSelectedAnalysis(null) // Kelime panelini kapat
    
    // Bağlam (Context) oluşturmak için bir önceki ve bir sonraki cümleyi yakala
    const prevSentence = index > 0 ? transcriptData[index - 1].text : ''
    const nextSentence = index < transcriptData.length - 1 ? transcriptData[index + 1].text : ''
    const context = `${prevSentence} ${sentenceItem.text} ${nextSentence}`.trim()
    
    setSelectedSentenceAnalysis({ sentence: sentenceItem.text, isLoading: true, data: null, error: null })
    
    const prompt = `You are an expert English grammar teacher. Your job is to analyze a single English sentence from a YouTube transcript and explain its grammar structure clearly to a Turkish-speaking learner.

---

# TASK
When given a sentence, you will:

1. Identify the tense and sentence structure
2. Break down each grammatical component
3. Explain why this structure is used in this context
4. Point out any advanced or unusual grammar patterns
5. Give a similar example sentence the learner can use themselves

---

# INPUT FORMAT
You will receive:
- SENTENCE: "${sentenceItem.text}"
- CONTEXT: "${context}"

---

# OUTPUT FORMAT
Return ONLY a valid JSON object. No explanation, no markdown, no backticks. Start directly with { and end with }.

{ "sentence": "the original sentence", "tense": "e.g. Present Perfect, Past Simple, etc.", "structure": "e.g. Subject + have/has + past participle", "components": [ { "part": "the word or phrase from the sentence", "role": "e.g. subject, verb, object, adverbial clause", "explanation": "what it does in this sentence in Turkish" } ], "whyThisStructure": "Explanation in Turkish — why this tense/structure was chosen here", "advancedPattern": "If there is an advanced or unusual grammar pattern, explain it in Turkish. If not, set this to null.", "similarExample": "A new example sentence using the same grammar structure", "difficulty": "B2 or C1 or C2" }

---

# RULES
- All explanations inside whyThisStructure and components must be in Turkish
- similarExample must be in English
- Keep explanations short and clear — this is for a language learner, not a linguist
- Focus on practical understanding, not academic terminology
- If the sentence contains multiple grammar points, focus on the most advanced or most useful one
- Never fabricate grammar rules — if something is informal or colloquial, say so`

    try {
      const content = await fetchAI(prompt, true);
      const data = parseAIJson(content);
      setSelectedSentenceAnalysis({ sentence: sentenceItem.text, isLoading: false, data, error: null })
    } catch (err) {
      console.error("Sentence Analysis Error:", err)
      setSelectedSentenceAnalysis({ sentence: sentenceItem.text, isLoading: false, data: null, error: err.message || 'Analiz tamamlanamadı.' })
    }
  }

  // Kelime Hasadı (Vocabulary Harvesting)
  const handleHarvestWord = () => {
    if (!selectedAnalysis || !selectedAnalysis.data) return

    const isDuplicate = words.some(w => w.english.toLowerCase() === selectedAnalysis.word.toLowerCase());
    if (isDuplicate) {
      return alert("This word is already in your list!");
    }

    const payload = {
      english: selectedAnalysis.word,
      turkish: selectedAnalysis.data.translation,
      type: 'Other',
      sentence: selectedAnalysis.data.example_sentence,
      collocation: '',
      ipa: ''
    }
    if (addWord) {
      addWord(payload)
      alert(`"${payload.english}" başarıyla kelime deponuza eklendi!`)
    } else {
      console.log('Listeye Gönderilecek Sözlük Verisi:', payload)
      alert(`"${payload.english}" başarıyla kelime deponuza eklendi! (Detaylar konsolda)`)
    }
    setSelectedAnalysis(null)
  }

  const handleAddAdvancedWord = (wordData) => {
    const isDuplicate = words.some(w => w.english.toLowerCase() === wordData.word.toLowerCase());
    if (isDuplicate) {
      return alert("This word is already in your list!");
    }

    if (addWord) {
      addWord({ english: wordData.word, turkish: wordData.turkishMeaning, type: wordData.type || 'Other', sentence: wordData.contextSentence || '', collocation: '', ipa: '' })
      alert(`"${wordData.word}" kelimesi defterinize eklendi!`)
    } else {
      console.log('Listeye Gönderilecek Sözlük Verisi:', wordData)
      alert(`"${wordData.word}" başarıyla kelime deponuza eklendi! (Detaylar konsolda)`)
    }
  }

  // YouTube Iframe API ile Videoyu İstenen Saniyeye Sarma
  const seekTo = (seconds) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true]
      }), '*');
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    }
  }

  const playerOrigin = (typeof window !== 'undefined' && window.location.origin !== 'null' && !window.location.origin.includes('file://')) ? window.location.origin : 'https://www.youtube.com';

  return (
    <div className="space-y-6">
      {/* URL Giriş Alanı */}
      <form onSubmit={handlePlay} className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
        <div className="flex flex-1 items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-2 border border-zinc-100 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all dark:bg-zinc-900 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="YouTube veya MP4 linkini buraya yapıştırın..."
            className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500 eye-care:text-[#3B2F2F] eye-care:placeholder:text-[#8C7A6B]"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
            Çalıştır
          </button>
          <button 
            type="button" 
            onClick={() => {
              const safeUrl = formatUrl(inputValue);
              if (safeUrl) {
                window.open(safeUrl, 'MiniPlayer', 'width=800,height=450,top=100,left=100,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
              } else {
                alert('Lütfen önce geçerli bir URL girin');
              }
            }}
className="whitespace-nowrap rounded-2xl border px-6 py-3 text-sm font-semibold transition hover:opacity-90"
style={{ backgroundColor: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}          >
            📺 Mini Pencerede Aç
          </button>
        </div>
      </form>

      {/* Ana Çalışma Alanı (Grid Layout) */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* SOL KOLON: Oynatıcı ve Çalışma Alanı */}
        <div className="flex flex-col gap-6">
          
          {/* 3. Doğrudan YouTube Ekranı veya Native Video */}
          <div className="relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-2xl">
            {isMounted && activeUrl ? (
              getYouTubeId(activeUrl) ? (
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube.com/embed/${getYouTubeId(activeUrl)}?autoplay=1&enablejsapi=1&origin=${playerOrigin}&widgetid=1`}
                  className="absolute top-0 left-0 w-full h-full bg-black"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                  allowFullScreen
                ></iframe>
              ) : (
                <video
                  src={activeUrl}
                  controls
                  autoPlay
                  className="absolute top-0 left-0 w-full h-full bg-black"
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">Video linki yapıştırın ve Çalıştır'a basın</div>
            )}
          </div>
        </div>

        {/* SAĞ KOLON: Dil Laboratuvarı Kontrol Paneli */}
        <div className="flex h-[600px] flex-col rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
          
          {/* Tabs Header */}
          <div className="flex border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3]">
            <button onClick={() => setRightTab('transcript')}
  className="flex-1 py-4 text-sm font-bold transition-colors"
  style={rightTab === 'transcript'
    ? { borderBottom: '2px solid #4f46e5', color: '#4f46e5' }
    : { color: '#6b7280' }
  }
>
  Transkript
</button>
<button onClick={() => setRightTab('quiz')}
  className="flex-1 py-4 text-sm font-bold transition-colors"
  style={rightTab === 'quiz'
    ? { borderBottom: '2px solid #4f46e5', color: '#4f46e5' }
    : { color: '#6b7280' }
  }
>
  AI Quiz & Kelimeler
</button>
          </div>
          
          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative bg-white dark:bg-zinc-800 eye-care:bg-[#F4EAD5]">
            
            {/* 1. Transkript Sekmesi */}
            {rightTab === 'transcript' && (
              <div className="space-y-4 pb-32">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 eye-care:text-amber-800/70 uppercase tracking-widest">Etkileşimli Metin Motoru</p>
                </div>

                {isTranscriptLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-indigo-600 animate-pulse">
                    <svg className="mb-4 h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-semibold text-slate-600 dark:text-zinc-300 eye-care:text-[#3B2F2F]">YouTube transkripti çekiliyor...</p>
                  </div>
                ) : transcriptData.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:bg-zinc-900/50 dark:border-zinc-700 dark:text-zinc-400 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-amber-800/70">
                    Video transkripti burada görünecek.
                  </div>
                ) : transcriptData.map((item, idx) => {
                  const isActive = currentTime >= item.start && currentTime <= item.end;
                  return (
                    <div 
                      key={`ts-${item.id}-${idx}`} 
                      className={`group flex gap-4 rounded-2xl p-3 transition border ${isActive ? 'border-yellow-300 bg-yellow-100 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-zinc-700/30 eye-care:hover:bg-[#FDF6E3]'}`}
                    >
                      <span 
                        onClick={() => seekTo(item.start)} 
                        title="Videoyu bu saniyeye sar"
                        className={`shrink-0 pt-0.5 font-mono text-xs font-bold cursor-pointer transition hover:scale-105 hover:text-indigo-600 ${isActive ? 'text-yellow-700 opacity-100' : 'text-indigo-400 opacity-50 group-hover:opacity-100'}`}
                      >
                        {Math.floor(item.start / 60)}:{String(Math.floor(item.start % 60)).padStart(2, '0')}
                      </span>
                      <div className="flex flex-col items-start gap-1">
                        <p className={`text-base leading-relaxed cursor-pointer ${isActive ? 'text-slate-900 font-bold dark:text-white eye-care:text-amber-950' : 'text-slate-700 dark:text-zinc-300 eye-care:text-[#3B2F2F]'}`}>
                          {item.text.split(' ').map((word, wIdx) => (
                            <span 
                              key={`w-${idx}-${wIdx}`} 
                              onClick={(e) => handleWordAnalysis(e, word, item.text)}
                              className={`transition-colors rounded px-0.5 ${isActive ? 'hover:bg-yellow-300' : 'hover:bg-yellow-200 hover:text-slate-900 dark:hover:bg-yellow-500/30 dark:hover:text-yellow-100 eye-care:hover:bg-yellow-300/50'}`}
                            >
                              {word}{' '}
                            </span>
                          ))}
                        </p>
                        <button 
                          onClick={(e) => handleSentenceAnalysis(e, item, idx)}
                          className="mt-1 flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600 opacity-0 transition-opacity hover:bg-indigo-100 group-hover:opacity-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-800/50 eye-care:bg-indigo-50/50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Uzman Gramer Analizi
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* AI Analiz Paneli (Contextual LLM) */}
                {selectedAnalysis && (
                  <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl animate-fade-in z-30 max-h-[70vh] overflow-y-auto custom-scrollbar dark:bg-zinc-800 dark:border-emerald-800 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Bağlamsal AI Analizi
                      </span>
                      <button onClick={() => setSelectedAnalysis(null)} className="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 eye-care:text-amber-800/70">✕</button>
                    </div>
                    
                    {selectedAnalysis.isLoading ? (
                      <div className="flex items-center gap-3 py-4 text-emerald-600">
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-semibold">Gemini cümleyi ve kelimeyi inceliyor...</span>
                      </div>
                    ) : selectedAnalysis.error ? (
                      <p className="text-sm text-rose-500 py-2">{selectedAnalysis.error}</p>
                    ) : selectedAnalysis.data ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-2xl font-black text-slate-900 capitalize dark:text-white eye-care:text-[#3B2F2F]">{selectedAnalysis.word}</p>
                          <p className="text-lg font-medium text-emerald-600">{selectedAnalysis.data.translation}</p>
                        </div>
                        
                        <div className="rounded-xl bg-slate-50 p-3 text-sm border border-slate-100 dark:bg-zinc-900 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
                          <p className="text-slate-500 italic mb-2 dark:text-zinc-400 eye-care:text-amber-800/70">"{selectedAnalysis.sentence}"</p>
                          <p className="font-semibold text-slate-800 dark:text-zinc-200 eye-care:text-[#3B2F2F]">📌 Gramer: <span className="font-normal text-slate-600 dark:text-zinc-300 eye-care:text-[#3B2F2F]">{selectedAnalysis.data.grammar_structure}</span></p>
                        </div>
                        
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 dark:text-zinc-500 eye-care:text-amber-800/70">Örnek Cümle (B2)</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-zinc-300 eye-care:text-[#3B2F2F]">{selectedAnalysis.data.example_sentence}</p>
                        </div>

                        <button onClick={handleHarvestWord} className="mt-2 w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 px-4 rounded-xl shadow-sm transition">
                          💾 Kelime Listeme Kaydet
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* AI Uzman Gramer Analiz Paneli (Sentence Level) */}
                {selectedSentenceAnalysis && (
                  <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-indigo-200 bg-white p-5 shadow-2xl animate-fade-in z-30 max-h-[75vh] overflow-y-auto custom-scrollbar dark:bg-zinc-800 dark:border-indigo-800 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Cümle Gramer Analizi
                      </span>
                      <button onClick={() => setSelectedSentenceAnalysis(null)} className="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 eye-care:text-amber-800/70">✕</button>
                    </div>
                    
                    {selectedSentenceAnalysis.isLoading ? (
                      <div className="flex items-center gap-3 py-4 text-indigo-600">
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-semibold">Uzman AI cümleyi inceliyor...</span>
                      </div>
                    ) : selectedSentenceAnalysis.error ? (
                      <p className="text-sm text-rose-500 py-2">{selectedSentenceAnalysis.error}</p>
                    ) : selectedSentenceAnalysis.data ? (
                      <div className="space-y-4 mt-2">
                        <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 dark:bg-zinc-900 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
                          <p className="text-lg font-bold text-slate-900 mb-2 dark:text-white eye-care:text-[#3B2F2F]">"{selectedSentenceAnalysis.data.sentence}"</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">{selectedSentenceAnalysis.data.tense}</span>
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">{selectedSentenceAnalysis.data.difficulty}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-600 mt-3 font-mono bg-white p-2.5 rounded-lg border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F]">{selectedSentenceAnalysis.data.structure}</p>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5 dark:text-zinc-200 eye-care:text-[#3B2F2F]"><span className="text-lg">📌</span> Neden bu yapı kullanıldı?</h4>
                          <p className="text-sm text-slate-600 leading-relaxed dark:text-zinc-400 eye-care:text-amber-800/70">{selectedSentenceAnalysis.data.whyThisStructure}</p>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5 dark:text-zinc-200 eye-care:text-[#3B2F2F]"><span className="text-lg">🧩</span> Cümlenin Öğeleri</h4>
                          <div className="space-y-2">
                            {selectedSentenceAnalysis.data.components.map((comp, i) => (
                              <div key={i} className="text-sm bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex flex-col gap-1.5 dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-indigo-700 text-base">{comp.part}</span>
                                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md dark:bg-zinc-700 dark:text-zinc-300 eye-care:bg-[#F4EAD5] eye-care:text-amber-800/70">{comp.role}</span>
                                </div>
                                <span className="text-slate-600 dark:text-zinc-400 eye-care:text-amber-800/70">{comp.explanation}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {selectedSentenceAnalysis.data.advancedPattern && (
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl dark:bg-amber-900/20 dark:border-amber-800/50 eye-care:bg-amber-100/50">
                            <h4 className="font-bold text-amber-900 text-sm mb-1 flex items-center gap-1.5 dark:text-amber-100"><span className="text-lg">✨</span> İleri Seviye Kullanım</h4>
                            <p className="text-sm text-amber-800 leading-relaxed dark:text-amber-200">{selectedSentenceAnalysis.data.advancedPattern}</p>
                          </div>
                        )}

                        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                          <h4 className="font-bold text-indigo-900 text-xs uppercase tracking-wider mb-2">Benzer Örnek Cümle</h4>
                          <p className="text-base font-medium text-indigo-800 italic">"{selectedSentenceAnalysis.data.similarExample}"</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* 2. AI Quiz Sekmesi */}
            {rightTab === 'quiz' && (
              <div className="space-y-6 animate-fade-in">
                {isQuizLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-indigo-600 animate-pulse">
                    <svg className="mb-4 h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-semibold text-slate-600 dark:text-zinc-300 eye-care:text-[#3B2F2F]">B1-B2 seviyesinde 10-20 soru ve kelimeler hazırlanıyor...</p>
                  </div>
                ) : !quizData ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:bg-zinc-900/50 dark:border-zinc-700 dark:text-zinc-400 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-amber-800/70">
                    <p className="mb-4">Mühendislik veya profesyonel hayata uygun B1-B2 zorluğunda 10-20 soruluk quiz ve ileri seviye kelime listesi üretin.</p>
                    <button onClick={handleGenerateQuiz} disabled={transcriptData.length === 0} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
                      ✨ Quiz ve Kelimeleri Üret
                    </button>
                    {transcriptData.length === 0 && <p className="mt-3 text-xs font-semibold text-rose-500">Önce transkript oluşturmalısınız.</p>}
                  </div>
                ) : (
                  <>
                    {quizData.advancedWords?.length > 0 && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm mb-6 dark:bg-emerald-900/20 dark:border-emerald-800/50 eye-care:bg-emerald-50/50">
                        <h3 className="font-bold text-emerald-900 mb-4 text-lg flex items-center gap-2 dark:text-emerald-100">📚 B2+ Seviye Kelimeler</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {quizData.advancedWords.map((word, i) => {
                            const isWordAdded = words.some(w => w.english.toLowerCase() === word.word.toLowerCase());
                            return (
                            <div key={`aw-${i}`} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm flex flex-col justify-between dark:bg-zinc-800 dark:border-emerald-800/50 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold text-emerald-700 text-lg dark:text-emerald-400">{word.word}</span>
                                  <button 
                                    disabled={isWordAdded}
                                    onClick={() => handleAddAdvancedWord(word)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition shadow-sm ${isWordAdded ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                  >
                                    {isWordAdded ? 'Eklendi ✓' : '+ Ekle'}
                                  </button>
                                </div>
                                <p className="text-sm font-medium text-slate-700 mb-2 dark:text-zinc-300 eye-care:text-[#3B2F2F]">{word.turkishMeaning}</p>
                                <p className="text-xs italic text-slate-500 dark:text-zinc-400 eye-care:text-amber-800/70">"{word.contextSentence}"</p>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 dark:text-zinc-500 eye-care:text-amber-800/70">Video Bağlamlı Sorular</p>
                    {quizData.questions.map((quiz, qIndex) => (
                  <div key={`q-${quiz.id || qIndex}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider dark:bg-zinc-700 eye-care:bg-amber-900">
                        Soru {qIndex + 1}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 mb-4 whitespace-pre-wrap dark:text-zinc-100 eye-care:text-[#3B2F2F]">{quiz.question}</p>
                    <div className="space-y-2">
                      {quiz.options.map((opt, oIndex) => {
                        const isSelected = quizAnswers[quiz.id] === oIndex;
                        const isRevealed = showExplanations[quiz.id];
                        const isCorrect = quiz.correct === oIndex;
                        
                        let btnClass = "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-zinc-900/50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F] eye-care:hover:bg-[#EAE0C8]"
                        if (isRevealed) {
                          if (isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-500"
                          else if (isSelected) btnClass = "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-500"
                          else btnClass = "border-slate-100 bg-slate-50 text-slate-400 opacity-50 dark:bg-zinc-900/30 dark:text-zinc-600 dark:border-zinc-800 eye-care:bg-[#F4EAD5]/50 eye-care:text-amber-900/50 eye-care:border-[#EAE0C8]/50"
                        } else if (isSelected) {
                          btnClass = "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-500"
                        }

                        return (
                          <button key={`opt-${qIndex}-${oIndex}`} disabled={isRevealed} onClick={() => setQuizAnswers({...quizAnswers, [quiz.id]: oIndex})} className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${btnClass}`}>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    
                    {quizAnswers[quiz.id] !== undefined && !showExplanations[quiz.id] && (
                      <button onClick={() => setShowExplanations({...showExplanations, [quiz.id]: true})} className="mt-4 text-sm font-bold text-indigo-600 hover:text-indigo-800 underline dark:text-indigo-400 dark:hover:text-indigo-300">
                        Cevabı Kontrol Et ve Açıklamayı Göster
                      </button>
                    )}
                    
                    {showExplanations[quiz.id] && (
                      <div className={`mt-4 p-4 rounded-xl text-sm leading-relaxed ${quizAnswers[quiz.id] === quiz.correct ? 'bg-emerald-50 border border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-200' : 'bg-rose-50 border border-rose-100 text-rose-800 dark:bg-rose-900/20 dark:border-rose-800/50 dark:text-rose-200'}`}>
                        <p className="font-bold mb-1">{quizAnswers[quiz.id] === quiz.correct ? '🎉 Doğru!' : '❌ Yanlış!'}</p>
                        <p>{quiz.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
                  </>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Floating Action Button (Notepad Trigger) */}
      <button
        onClick={() => setIsNotesOpen(!isNotesOpen)}
        className="fixed right-6 bottom-[104px] z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 transition-all duration-300 hover:scale-110 hover:bg-indigo-500 group"
        title="Video Notes"
      >
        <PenTool size={24} />
        <span className="absolute -top-10 right-0 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">Not Defteri</span>
      </button>

      {/* Slide-over Floating Notepad */}
      {isNotesOpen && (
        <div className="fixed top-0 right-0 z-[100] h-full w-80 md:w-96 border-l border-slate-200 bg-white dark:bg-zinc-900 eye-care:bg-sepia-surface shadow-2xl animate-fade-in">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-zinc-700 eye-care:border-[#EAE0C8]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 eye-care:text-[#3B2F2F]">📝 Video Notes</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setNoteTab(noteTab === 'write' ? 'archive' : 'write')} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 eye-care:bg-[#EAE0C8] eye-care:text-amber-900 eye-care:hover:bg-[#D5C6A8]">
                {noteTab === 'write' ? '🗂️ Arşiv' : '✏️ Yaz'}
              </button>
              <button onClick={() => setIsNotesOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white eye-care:bg-[#EAE0C8] eye-care:text-amber-800/70 eye-care:hover:bg-[#D5C6A8] eye-care:hover:text-[#3B2F2F]">
                <X size={18} />
              </button>
            </div>
          </div>
          
          {noteTab === 'write' ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Videoyu izlerken notlarınızı buraya alın..."
                className="flex-1 resize-none bg-transparent p-6 font-serif text-lg text-slate-800 placeholder:text-slate-400 outline-none leading-relaxed custom-scrollbar focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500 eye-care:text-[#3B2F2F] eye-care:placeholder:text-amber-800/50"
              />
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:bg-zinc-900 dark:border-zinc-800 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 eye-care:text-amber-800/70">✓ Autosaved</span>
                <button onClick={handleSaveVideoNote} disabled={!notes.trim()} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
                  💾 Arşive Kaydet
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar space-y-4 dark:bg-zinc-900 eye-care:bg-[#F4EAD5]">
              {savedVideoNotes.length === 0 ? (
                <div className="text-center text-slate-500 py-10 dark:text-zinc-400 eye-care:text-amber-800/70">
                  <span className="text-4xl mb-3 block opacity-50">📂</span>
                  <p className="text-sm font-semibold">Henüz kaydedilmiş not yok.</p>
                </div>
              ) : (
                savedVideoNotes.map(note => (
                  <div key={note.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-slate-100 dark:text-zinc-500 dark:border-zinc-700 eye-care:text-amber-800/70 eye-care:border-[#EAE0C8]">{new Date(note.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                      <button onClick={() => handleDeleteVideoNote(note.id)} className="text-rose-400 hover:text-rose-600 transition" title="Sil"><X size={14} /></button>
                    </div>
                    {note.url && <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline mb-2 block truncate font-medium">🔗 {note.url}</a>}
                    <p className="text-sm text-slate-700 font-serif whitespace-pre-wrap leading-relaxed line-clamp-6 dark:text-zinc-300 eye-care:text-[#3B2F2F]">{note.content}</p>
                    <button onClick={() => { setNotes(note.content); setNoteTab('write'); }} className="mt-4 w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 eye-care:bg-[#EAE0C8] eye-care:text-amber-900 eye-care:hover:bg-[#D5C6A8]">✏️ Düzenle / Devam Et</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
