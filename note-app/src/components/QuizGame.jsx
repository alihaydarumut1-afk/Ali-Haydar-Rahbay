import { useEffect, useMemo, useState, useRef } from 'react'
import shuffleArray from '../utils/shuffle.js'
import SynonymQuiz from './SynonymQuiz.jsx'
import { ChevronDown, Loader2 } from 'lucide-react'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

async function fetchAI(prompt) {
  const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, expectJson: false, apiKey: getUserApiKey() })
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
  return data.content;
}

function buildUnifiedDeck(targetWords, allWords) {
  const shuffledWords = shuffleArray(targetWords)
  return shuffledWords.map((word) => {
    const wrongAnswers = shuffleArray(allWords.filter((item) => item.id !== word.id)).slice(0, 3)
    const options = shuffleArray([word, ...wrongAnswers])
    
    let hiddenSentence = ''
    let scrambledSentence = []
    if (word.sentence && word.sentence.trim()) {
      const cleanWord = word.english.trim()
      const escapedWord = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // 1. Önce kelime sınırları ile tam eşleşme aranır
      let regex = new RegExp(`\\b${escapedWord}\\b`, 'gi')
      hiddenSentence = word.sentence.replace(regex, '_____')
      
      // 2. Eğer tam eşleşme bulunamazsa (kelime cümlede ek almışsa vs.) sınırları kaldırarak daha geniş arama yap
      if (hiddenSentence === word.sentence) {
        regex = new RegExp(escapedWord, 'gi')
        hiddenSentence = word.sentence.replace(regex, '_____')
      }
      
      // 3. STEM EŞLEŞTİRME: Kelimenin kökünü arayarak (örn: decide -> deciding) bulmaya çalış
      if (hiddenSentence === word.sentence && escapedWord.length >= 3) {
        const stem = escapedWord.length > 4 ? escapedWord.substring(0, 4) : escapedWord.substring(0, 3)
        const stemRegex = new RegExp(`\\b${stem}[a-zA-Z]*\\b`, 'gi')
        hiddenSentence = word.sentence.replace(stemRegex, '_____')
      }
      
      // 4. FALLBACK: Hiçbiri eşleşmezse, cümlede kelime eksik demektir. Cevabın görünmemesi için en uzun kelimeyi gizle.
      if (hiddenSentence === word.sentence) {
        const wordsInSentence = word.sentence.split(/\s+/)
        if (wordsInSentence.length > 0) {
          let longest = wordsInSentence[0]
          for (let w of wordsInSentence) { if (w.length > longest.length) longest = w }
          hiddenSentence = word.sentence.replace(longest, '_____')
        }
      }

      scrambledSentence = shuffleArray(word.sentence.split(/\s+/))
    }

    return {
      word,
      options,
      hiddenSentence,
      scrambledSentence
    }
  })
}

const MODES = [
  { id: 'multiple-choice', label: 'Multiple Choice', icon: '🔘' },
  { id: 'gap-fill', label: 'Gap Fill', icon: '📝' },
  { id: 'synonym-match', label: 'Synonym Match', icon: '🔗' },
  { id: 'listening', label: 'Listening', icon: '🎧' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'sentence-builder', label: 'Sentence Builder', icon: '🧩' },
  { id: 'random', label: 'Random Mode', icon: '🎲' },
]

export default function QuizGame({ words }) {
  const [quizMode, setQuizMode] = useState('multiple-choice')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  const questionDeck = useMemo(() => {
    if (quizMode === 'synonym-match') {
      return []
    }
    
    let targetWords = words
    if (quizMode === 'gap-fill' || quizMode === 'sentence-builder') {
      targetWords = words.filter(w => w.sentence && w.sentence.trim())
    }
    if (targetWords.length === 0) return []
    return buildUnifiedDeck(targetWords, words)
  }, [words, quizMode])

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentQuestionMode, setCurrentQuestionMode] = useState('multiple-choice')
  const [selectedOption, setSelectedOption] = useState(null)
  
  // Unified feedback state: null, true, false, or { isCorrect: boolean, feedback: string }
  const [feedback, setFeedback] = useState(null)
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState(0)
  
  // New interactive states
  const [userInput, setUserInput] = useState('')
  const [availableBuilderWords, setAvailableBuilderWords] = useState([])
  const [builderAnswer, setBuilderAnswer] = useState([])
  const [isEvaluating, setIsEvaluating] = useState(false)

  const preloadedAudio = useRef({})
  const [audioStatus, setAudioStatus] = useState({}) // 'loading' | 'ready'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      Object.values(preloadedAudio.current).forEach(URL.revokeObjectURL)
    }
  }, [])

  useEffect(() => {
    if (questionDeck.length > 0) {
      const preloadAudio = async (text, qId) => {
        if (preloadedAudio.current[qId] || audioStatus[qId]) return
        
        setAudioStatus(prev => ({ ...prev, [qId]: 'loading' }))
        try {
          let blob = null
          
          const res = await fetch(`${getBaseUrl()}/api/ai/speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: 'alloy', apiKey: getUserApiKey() })
          });
          if (res.ok) { blob = await res.blob(); }

          if (blob) {
            const url = URL.createObjectURL(blob)
            preloadedAudio.current[qId] = url
            const audio = new Audio(url)
            audio.preload = 'auto'
            audio.load()
            setAudioStatus(prev => ({ ...prev, [qId]: 'ready' }))
          } else {
            setAudioStatus(prev => ({ ...prev, [qId]: 'error' }))
          }
        } catch (err) {
          setAudioStatus(prev => ({ ...prev, [qId]: 'error' }))
        }
      }

      const indices = [currentQuestionIndex, currentQuestionIndex + 1, currentQuestionIndex + 2]
      indices.forEach(idx => {
        if (idx < questionDeck.length) {
          const q = questionDeck[idx]
          preloadAudio(q.word.english, q.word.id)
        }
      })
    }
  }, [quizMode, currentQuestionIndex, questionDeck])

  const handlePlayAudio = async (text, qId) => {
    setIsPlayingAudio(true)

    try {
      let url = preloadedAudio.current[qId]
      if (!url) {
        let blob = null
        
        const res = await fetch(`${getBaseUrl()}/api/ai/speech`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'alloy', apiKey: getUserApiKey() })
        });
        if (res.ok) { blob = await res.blob(); }

        if (blob && !url) {
          url = URL.createObjectURL(blob)
          preloadedAudio.current[qId] = url
          setAudioStatus(prev => ({ ...prev, [qId]: 'ready' }))
        }
      }
      if (url) {
        const audio = new Audio(url)
        audio.onended = () => setIsPlayingAudio(false)
        audio.onerror = () => setIsPlayingAudio(false)
        await audio.play().catch(() => setIsPlayingAudio(false))
      } else {
        setIsPlayingAudio(false)
      }
    } catch (e) {
      setIsPlayingAudio(false)
    }
  }

  // Soru veya mod değiştiğinde, o soruya ait "currentQuestionMode" değerini ayarla
  useEffect(() => {
    if (quizMode === 'synonym-match' || !questionDeck.length) return;
    
    const currentQ = questionDeck[currentQuestionIndex];
    if (!currentQ) return;

    let mode = quizMode;
    
    if (mode === 'random') {
      const available = ['multiple-choice', 'listening', 'writing'];
      if (currentQ.hiddenSentence) {
        available.push('gap-fill', 'sentence-builder');
      }
      mode = available[Math.floor(Math.random() * available.length)];
    } else if ((mode === 'gap-fill' || mode === 'sentence-builder') && !currentQ.hiddenSentence) {
      mode = 'multiple-choice'; // Cümlesi olmayan kelime için fallback
    }

    setCurrentQuestionMode(mode);
    setUserInput('');
    setBuilderAnswer([]);
    setAvailableBuilderWords(currentQ.scrambledSentence || []);
  }, [currentQuestionIndex, quizMode, questionDeck]);

  const currentQuestion = questionDeck[currentQuestionIndex]

  // EKSİK OLAN AKSİYON FONKSİYONLARI 
  const cleanString = (str) => String(str || '').replace(/[.,!?]/g, '').trim().toLowerCase()

  const handleGapFillSubmit = () => {
    if (!userInput.trim()) return
    const isCorrect = cleanString(userInput) === cleanString(currentQuestion.word.english)
    setFeedback(isCorrect)
    if (isCorrect) setScore(s => s + 1)
  }

  const handleBuilderSubmit = () => {
    if (builderAnswer.length === 0) return
    const isCorrect = cleanString(builderAnswer.join(' ')) === cleanString(currentQuestion.word.sentence)
    setFeedback(isCorrect)
    if (isCorrect) setScore(s => s + 1)
  }

  const handleWritingSubmit = async () => {
    if (!userInput.trim()) return
    setIsEvaluating(true)
    try {
      const prompt = `You are an English teacher evaluating a student's sentence. 
Target word: "${currentQuestion.word.english}" (Meaning: ${currentQuestion.word.turkish}).
Student's sentence: "${userInput}".
Return ONLY a valid JSON object in this format (no markdown):
{"isCorrect": true/false, "feedback": "Short feedback message explaining why it is correct or incorrect."}`
      
      const response = await fetchAI(prompt)
      const parsed = JSON.parse(response.replace(/```json/gi, '').replace(/```/g, '').trim())
      setFeedback(parsed)
      if (parsed.isCorrect) setScore(s => s + 1)
    } catch (e) {
      setFeedback({ isCorrect: true, feedback: 'Sentence received, but AI evaluation is temporarily unavailable.' })
      setScore(s => s + 1)
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleSelect = (option) => {
    if (selectedOption) return
    setSelectedOption(option)
    const isCorrect = quizMode === 'gap-fill' ? option === currentQuestion.word.english : option.id === currentQuestion.word.id
    setFeedback(isCorrect)
    if (isCorrect) setScore(s => s + 1)
  }

  const handleNext = () => {
    if (currentQuestionIndex >= questionDeck.length - 1) {
      setIsFinished(true)
    } else {
      setSelectedOption(null)
      setFeedback(null)
      setCurrentQuestionIndex((current) => current + 1)
    }
  }

  const handleModeChange = (mode) => {
    setQuizMode(mode)
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setFeedback(null)
    setIsFinished(false)
    setScore(0)
  }

  if (!words.length) {
    return (
      <div className="rounded-3xl border border-slate-300 bg-white p-8 text-center shadow-sm dark:bg-slate-900 dark:border-slate-600">
        <p className="text-lg font-bold text-black dark:text-white">Add words first to use Quiz mode.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER & DROPDOWN */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-300 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900 dark:border-slate-600 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em]" style={{ color: '#6366f1' }}>Quiz Engine</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 eye-care:text-amber-950">Interactive Testing</h2>
        </div>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
           className="flex w-full min-w-[220px] items-center justify-between rounded-2xl border-2 px-5 py-3.5 text-sm font-bold transition focus:ring-2 focus:ring-indigo-200 sm:w-auto border-slate-300 bg-white text-slate-900 hover:bg-slate-100 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 eye-care:bg-[#F4ECD8] eye-care:border-amber-200 eye-care:text-amber-950 eye-care:hover:bg-[#EAE0C8]"
          >
            <span className="flex items-center gap-2">
              {MODES.find(m => m.id === quizMode)?.icon} {MODES.find(m => m.id === quizMode)?.label}
            </span>
            <ChevronDown size={18} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-full min-w-[220px] z-50 overflow-hidden rounded-2xl border border-slate-300 bg-white py-2 shadow-xl animate-fade-in dark:bg-slate-900 dark:border-slate-600 dark:shadow-black/50 eye-care:bg-[#FDF6E3] eye-care:border-amber-200 eye-care:shadow-md">
            {MODES.map((mode) => (
  <button
    key={mode.id}
    onClick={() => { handleModeChange(mode.id); setIsDropdownOpen(false); }}
    className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-bold transition hover:bg-slate-100 dark:hover:bg-slate-700"
    style={{ color: quizMode === mode.id ? '#4f46e5' : '#1e293b' }}
  >
    <span className="text-lg">{mode.icon}</span>
    {mode.label}
  </button>
))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-300 bg-white p-8 shadow-sm dark:bg-slate-900 dark:border-slate-600 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
        {quizMode === 'synonym-match' ? (
          <SynonymQuiz words={words} />
        ) : questionDeck.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <span className="text-4xl mb-4">📝</span>
          </div>
      ) : isFinished ? (
          (() => {
            const percentage = Math.round((score / questionDeck.length) * 100);
            let analysis = { title: '', desc: '', color: '' };
            if (percentage >= 90) {
              analysis = { title: 'Outstanding!', desc: 'You have a masterful understanding of the concepts and vocabulary.', color: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300' };
            } else if (percentage >= 70) {
              analysis = { title: 'Great Job!', desc: 'Solid performance, but there is still a little room for improvement.', color: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300' };
            } else if (percentage >= 50) {
              analysis = { title: 'Good Effort!', desc: 'You know the basics, keep practicing your weak points to reach mastery.', color: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300' };
            } else {
              analysis = { title: 'Needs Practice', desc: 'This was a tough one. Review your flashcards and try again. You can do it!', color: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300' };
            }
            
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in w-full max-w-2xl mx-auto">
                <div className="text-7xl mb-4">
                  {percentage >= 80 ? '🏆' : percentage >= 50 ? '👍' : '📚'}
                </div>
                <h3 className="text-3xl font-black text-zinc-900 mb-2 dark:text-zinc-100">Quiz Completed!</h3>
                <p className="text-lg font-medium text-zinc-500 mb-6 dark:text-zinc-400">
                  You scored <span className="font-bold text-indigo-600 dark:text-indigo-400">{score}</span> out of {questionDeck.length} 
                  <span className="ml-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm dark:bg-indigo-900/40 dark:text-indigo-300">
                    %{percentage}
                  </span>
                </p>
                
                <div className={`w-full rounded-2xl border p-5 mb-8 text-left shadow-sm ${analysis.color}`}>
                  <h4 className="font-bold text-lg mb-1">{analysis.title} Performance Analysis</h4>
                  <p className="font-medium opacity-90">{analysis.desc}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
                  <button
                    onClick={() => { setCurrentQuestionIndex(0); setSelectedOption(null); setFeedback(null); setIsFinished(false); setScore(0); }}
                    className="flex-1 rounded-2xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700"
                  >
                    🔄 Restart
                  </button>
                  <button
                    onClick={() => handleModeChange('random')}
                    className="flex-1 rounded-2xl bg-zinc-900 px-6 py-4 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-zinc-800"
                  >
                    🎲 Random Quiz
                  </button>
                </div>
              </div>
            )
          })()
        ) : (
          <>
            {/* PROGRESS BAR */}
            <div className="mb-10">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Question {currentQuestionIndex + 1} / {questionDeck.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / questionDeck.length) * 100}%` }}
                />
              </div>
            </div>

            {currentQuestionMode === 'listening' ? (
              <div className="mb-10 flex flex-col items-center justify-center">
                <h3 className="mb-8 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Choose the word you hear</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePlayAudio(currentQuestion.word.english, currentQuestion.word.id)}
                    disabled={isPlayingAudio}
                    className={`flex items-center gap-3 rounded-2xl bg-indigo-100 px-8 py-4 text-lg font-bold text-indigo-700 transition-all hover:bg-indigo-200 disabled:opacity-70 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 ${
                      isPlayingAudio ? 'animate-pulse scale-105 shadow-lg shadow-indigo-200' : ''
                    }`}
                  >
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    {isPlayingAudio ? 'Listening...' : 'Listen Audio'}
                  </button>
                  {!isPlayingAudio && audioStatus[currentQuestion.word.id] !== 'ready' && (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-300" title="Yükleniyor..." />
                  )}
                  {!isPlayingAudio && audioStatus[currentQuestion.word.id] === 'ready' && (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Hazır" />
                  )}
                </div>
              </div>
            ) : currentQuestionMode === 'gap-fill' ? (
              <div className="mb-10 flex flex-col items-center">
            <div className="w-full rounded-3xl border-2 border-zinc-200 bg-zinc-50 p-8 text-center shadow-inner dark:bg-zinc-800/50 dark:border-zinc-700 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
              <p className="text-xl font-medium leading-relaxed text-zinc-800 dark:text-zinc-200 eye-care:text-[#5C4B37]">{currentQuestion.hiddenSentence}</p>
                </div>
                <div className="mt-6 w-full max-w-md flex gap-3">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={feedback !== null}
                    placeholder="Type the missing word..."
                className="flex-1 rounded-2xl border-2 border-zinc-200 bg-white px-5 py-4 text-lg font-semibold text-zinc-900 outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-600 dark:focus:ring-indigo-500 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-amber-950 eye-care:focus:border-amber-400"
                    onKeyDown={(e) => e.key === 'Enter' && !feedback && handleGapFillSubmit()}
                  />
                  <button onClick={handleGapFillSubmit} disabled={feedback !== null || !userInput.trim()} className="rounded-2xl bg-indigo-600 px-6 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50">
                    Submit
                  </button>
                </div>
              </div>
            ) : currentQuestionMode === 'writing' ? (
              <div className="mb-10 flex flex-col items-center">
                <div className="mb-6 text-center">
              <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950">{currentQuestion.word.english}</h3>
              <p className="text-lg font-medium text-zinc-500 mt-2 dark:text-zinc-400 eye-care:text-amber-800">{currentQuestion.word.turkish}</p>
              <p className="text-sm text-zinc-400 mt-1 dark:text-zinc-500 eye-care:text-amber-700/60">Write an original sentence using this word.</p>
                </div>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={feedback !== null || isEvaluating}
                  rows="3"
                  placeholder="Enter your sentence here..."
              className="w-full max-w-xl resize-none rounded-2xl border-2 border-zinc-200 bg-zinc-50 p-5 text-lg font-medium text-zinc-900 outline-none transition focus:border-indigo-500 focus:bg-white disabled:opacity-50 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-100 dark:focus:bg-zinc-900 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:text-amber-950 eye-care:focus:border-amber-400 eye-care:focus:bg-[#FDF6E3]"
                />
                <button onClick={handleWritingSubmit} disabled={feedback !== null || isEvaluating || !userInput.trim()} className="mt-4 flex items-center gap-2 rounded-2xl bg-zinc-900 px-8 py-4 font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50">
                  {isEvaluating ? <Loader2 size={20} className="animate-spin" /> : '✍️'} 
                  {isEvaluating ? 'Evaluating...' : 'Check Sentence'}
                </button>
              </div>
            ) : currentQuestionMode === 'sentence-builder' ? (
              <div className="mb-10 flex flex-col items-center">
                <div className="mb-6 text-center">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Rebuild the Sentence</h3>
                  <p className="text-sm font-medium text-zinc-500 mt-1 dark:text-zinc-400">Target word: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentQuestion.word.english}</span></p>
                </div>
                
                <div 
                  className="w-full max-w-2xl min-h-[80px] flex flex-wrap content-start gap-2 rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4 mb-6 transition-colors duration-300 dark:border-zinc-700 dark:bg-zinc-800/50"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-zinc-100', 'border-indigo-300', 'dark:bg-zinc-800') }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-zinc-100', 'border-indigo-300', 'dark:bg-zinc-800') }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-zinc-100', 'border-indigo-300');
                    const sourceList = e.dataTransfer.getData('source');
                    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (sourceList === 'available') {
                      const word = availableBuilderWords[sourceIndex];
                      setAvailableBuilderWords(prev => prev.filter((_, i) => i !== sourceIndex));
                      setBuilderAnswer(prev => [...prev, word]);
                    }
                  }}
                >
                  {builderAnswer.map((word, idx) => (
                    <button 
                      key={idx} 
                      draggable={feedback === null}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx);
                        e.dataTransfer.setData('source', 'answer');
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const sourceList = e.dataTransfer.getData('source');
                        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        
                        if (sourceList === 'answer') {
                          const newAnswer = [...builderAnswer];
                          const [removed] = newAnswer.splice(sourceIndex, 1);
                          newAnswer.splice(idx, 0, removed);
                          setBuilderAnswer(newAnswer);
                        } else if (sourceList === 'available') {
                          const word = availableBuilderWords[sourceIndex];
                          setAvailableBuilderWords(prev => prev.filter((_, i) => i !== sourceIndex));
                          const newAnswer = [...builderAnswer];
                          newAnswer.splice(idx, 0, word);
                          setBuilderAnswer(newAnswer);
                        }
                      }}
                      disabled={feedback !== null} 
                      onClick={() => {
                      setBuilderAnswer(prev => prev.filter((_, i) => i !== idx))
                      setAvailableBuilderWords(prev => [...prev, word])
                    }} 
                  className="cursor-grab active:cursor-grabbing rounded-xl bg-white border-2 border-indigo-200 px-4 py-2 text-lg font-bold text-indigo-800 shadow-sm transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-80 dark:bg-zinc-900 dark:border-indigo-900/50 dark:text-indigo-300 dark:hover:bg-rose-900/30 dark:hover:border-rose-800 dark:hover:text-rose-400 eye-care:bg-[#FDF6E3] eye-care:border-amber-300 eye-care:text-amber-900 eye-care:hover:bg-rose-100/50 eye-care:hover:border-rose-300"
                    >
                      {word}
                    </button>
                  ))}
                  {builderAnswer.length === 0 && <span className="text-zinc-400 font-medium m-auto pointer-events-none dark:text-zinc-500">Sürükleyip bırakarak veya tıklayarak cümleyi kurun</span>}
                </div>

                <div 
                  className="w-full max-w-2xl flex flex-wrap justify-center gap-3 p-4"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const sourceList = e.dataTransfer.getData('source');
                    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (sourceList === 'answer') {
                      const word = builderAnswer[sourceIndex];
                      setBuilderAnswer(prev => prev.filter((_, i) => i !== sourceIndex));
                      setAvailableBuilderWords(prev => [...prev, word]);
                    }
                  }}
                >
                  {availableBuilderWords.map((word, idx) => (
                    <button 
                      key={idx} 
                      draggable={feedback === null}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx);
                        e.dataTransfer.setData('source', 'available');
                      }}
                      disabled={feedback !== null} 
                      onClick={() => {
                      setAvailableBuilderWords(prev => prev.filter((_, i) => i !== idx))
                      setBuilderAnswer(prev => [...prev, word])
                    }} 
                  className="cursor-grab active:cursor-grabbing rounded-xl bg-zinc-50 border-2 border-zinc-200 px-4 py-2 text-lg font-bold text-zinc-800 shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/30 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:text-amber-900 eye-care:hover:border-amber-400 eye-care:hover:bg-[#F4ECD8]"
                    >
                      {word}
                    </button>
                  ))}
                </div>
                
                <button onClick={handleBuilderSubmit} disabled={feedback !== null || availableBuilderWords.length > 0} className="mt-8 rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50">
                  Verify Sentence
                </button>
              </div>
            ) : (
              <div className="mb-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-2 dark:text-zinc-500">What is the meaning of</p>
                <h3 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">{currentQuestion.word.english}</h3>
              </div>
            )}

            {/* INTERACTIVE OPTION GRID (Only for Multiple Choice & Listening) */}
            {(currentQuestionMode === 'multiple-choice' || currentQuestionMode === 'listening') && (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
              {currentQuestion.options.map((option) => {
                  const optionId = option.id
                  const optionText = option.turkish
                  
                  const isSelected = selectedOption?.id === option.id
                  const isCorrect = feedback !== null && option.id === currentQuestion.word.id
                const isWrong = isSelected && feedback === false

                let stateClasses = 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300 dark:hover:border-indigo-500 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:text-[#5C4B37] eye-care:hover:bg-[#F4ECD8] eye-care:hover:border-amber-400'
                
                if (feedback !== null) {
                  if (isCorrect) stateClasses = 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 eye-care:bg-emerald-100/50 eye-care:text-emerald-900 eye-care:border-emerald-500'
                  else if (isWrong) stateClasses = 'border-rose-500 bg-rose-50 text-rose-800 shadow-md dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 eye-care:bg-rose-100/50 eye-care:text-rose-900 eye-care:border-rose-500'
                  else stateClasses = 'border-zinc-200 bg-zinc-50 text-zinc-400 opacity-60 cursor-not-allowed dark:bg-zinc-800/50 dark:border-zinc-800 dark:text-zinc-500 eye-care:border-[#EAE0C8] eye-care:bg-transparent eye-care:text-amber-900/50'
                }

                return (
                  <button
                    key={optionId}
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={Boolean(selectedOption)}
                    className={`cursor-pointer rounded-2xl border-2 p-6 text-center text-lg font-medium transition-all duration-200 ${stateClasses}`}
                  >
                    {optionText}
                  </button>
                )
              })}
            </div>
            )}

            {/* DYNAMIC NEXT QUESTION BUTTON */}
            <div className="mt-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex-1 text-center sm:text-left">
                {feedback !== null && (
              <div className={`rounded-2xl p-4 border ${typeof feedback === 'object' ? (feedback.isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 eye-care:bg-emerald-50 eye-care:border-emerald-200' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50 eye-care:bg-rose-50 eye-care:border-rose-200') : (feedback ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 eye-care:bg-emerald-50 eye-care:border-emerald-200' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50 eye-care:bg-rose-50 eye-care:border-rose-200')} animate-fade-in`}>
                <p className={`text-lg font-bold ${typeof feedback === 'object' ? (feedback.isCorrect ? 'text-emerald-700 dark:text-emerald-400 eye-care:text-emerald-700' : 'text-rose-700 dark:text-rose-400 eye-care:text-rose-700') : (feedback ? 'text-emerald-700 dark:text-emerald-400 eye-care:text-emerald-700' : 'text-rose-700 dark:text-rose-400 eye-care:text-rose-700')}`}>
                      {typeof feedback === 'object' 
                        ? (feedback.isCorrect ? '🎉 Brilliant!' : '❌ Needs Improvement') 
                        : (feedback ? '🎉 Correct answer!' : '❌ Wrong answer, try again.')}
                    </p>
                    {typeof feedback === 'object' && feedback.feedback && (
                  <p className="text-sm font-medium mt-1 text-zinc-700 dark:text-zinc-300 eye-care:text-zinc-800">{feedback.feedback}</p>
                    )}
                    {typeof feedback !== 'object' && feedback === false && (
                  <div className="mt-3 inline-block rounded-xl border border-rose-200 bg-white/60 px-4 py-2 text-sm text-rose-900 shadow-sm dark:bg-rose-900/40 dark:border-rose-800/50 dark:text-rose-300 eye-care:bg-rose-100/50 eye-care:border-rose-200 eye-care:text-rose-900">
                    <span className="font-bold uppercase tracking-wider text-rose-700/80 mr-2 text-[11px] dark:text-rose-400/80 eye-care:text-rose-800/80">Correct Answer</span>
                        <span className="font-semibold">
                        {
                          currentQuestionMode === 'gap-fill' ? currentQuestion.word.english :
                          currentQuestionMode === 'sentence-builder' ? currentQuestion.word.sentence :
                          currentQuestion.word.turkish
                        }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleNext}
                disabled={feedback === null}
                className={`w-full rounded-xl py-4 font-semibold transition-all duration-300 md:w-auto md:min-w-[200px] ${
                  feedback === null
                ? 'cursor-not-allowed bg-zinc-900 text-white opacity-50 eye-care:bg-amber-900'
                : 'bg-zinc-900 text-white shadow-lg hover:scale-105 hover:bg-zinc-800 eye-care:bg-amber-900 eye-care:hover:bg-amber-800'
                }`}
              >
                {currentQuestionIndex === questionDeck.length - 1 ? 'Finish Quiz ➔' : 'Next Question ➔'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
