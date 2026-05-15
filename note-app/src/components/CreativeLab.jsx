import { useMemo, useState } from 'react'
import useSavedCreations from '../hooks/useSavedCreations.js'
import SavedCreationsDrawer from './SavedCreationsDrawer.jsx'

export default function CreativeLab({ words = [], onPractice }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [format, setFormat] = useState('dialogue')
  const [selectedLevel, setSelectedLevel] = useState('B1-B2')
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiWarning, setApiWarning] = useState(null)
  const defaultKey = ''
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || defaultKey)
  const [isEditingKey, setIsEditingKey] = useState(() => !localStorage.getItem('geminiApiKey') && !defaultKey)
  const { creations, addCreation, removeCreation } = useSavedCreations()
  const safeCreations = Array.isArray(creations) ? creations : []
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Practice Mode (Focus Session) State'leri
  const [isPracticeOpen, setIsPracticeOpen] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const saveApiKey = () => {
    localStorage.setItem('geminiApiKey', apiKey)
    setIsEditingKey(false)
  }

  const selectedWords = useMemo(
    () => words.filter((word) => selectedIds.includes(word.id)),
    [words, selectedIds]
  )

  const groupedWords = useMemo(() => {
    return words.reduce((acc, word) => {
      const type = word.type || 'Other'
      if (!acc[type]) acc[type] = []
      acc[type].push(word)
      return acc
    }, {})
  }, [words])

  const toggleWord = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((wId) => wId !== id) : [...prev, id]
    )
  }

  const FORMATS = [
    {
      id: 'dialogue',
      title: 'Daily Dialogue',
      icon: (
        <svg className="mb-3 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'academic',
      title: 'Academic Text',
      icon: (
        <svg className="mb-3 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      ),
    },
    {
      id: 'news',
      title: 'News Snippet',
      icon: (
        <svg className="mb-3 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
  ]

  // Seçilen kelimeler ve formata göre dinamik Sistem Prompt'unu hazırlıyoruz
  const aiPrompt = useMemo(() => {
    if (selectedWords.length === 0) return 'Please select words from above to generate content.'
    const wordList = selectedWords.map((w) => w.english).join(', ')
    const levelInstruction = `Please generate this content strictly in accordance with the CEFR ${selectedLevel} English proficiency level, using the grammar structures and vocabulary appropriate for this level.`
    
    switch (format) {
      case 'dialogue':
        return `Create a natural, everyday conversation between two people using the following words: ${wordList}. The tone should be casual. ${levelInstruction}`
      case 'academic':
        return `Write a short, formal reading passage. Seamlessly incorporate the following words: ${wordList}. ${levelInstruction}`
      case 'news':
        return `Write a short newspaper article snippet reporting on a fictional event. Use journalistic language and include the following words: ${wordList}. ${levelInstruction}`
      default:
        return ''
    }
  }, [selectedWords, format, selectedLevel])

  const handleGenerate = async () => {
    if (selectedWords.length === 0) return
    setIsGenerating(true)

    try {
      const key = localStorage.getItem('geminiApiKey') || defaultKey
      if (!key) {
        const wordList = selectedWords.map(w => w.english).join(', ')
        let fallbackText = ''
        if (format === 'dialogue') {
           fallbackText = `A: Let's discuss this topic today: ${wordList}.\nB: Great idea! These words are really important.\nA: Yes, they make more sense when used together.\nB: I totally agree, shall we practice?`
        } else {
           fallbackText = `[Advanced AI Simulator - ${format} Format]\nSample text generated targeting these words: ${wordList}. Using target words in sentences increases retention.`
        }
        setOutput(fallbackText + "\n\n⚠️ Note: To generate real AI content, please add your API key above.")
        setIsGenerating(false)
        return
      }

      let response;
      if (key.startsWith('sk-')) {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: aiPrompt }],
            temperature: 0.8,
          })
        })
      } else {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`
        response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 1500 } }),
        })
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || 'AI did not respond.')
      }

      const data = await response.json()
      const content = key.startsWith('sk-') ? (data.choices?.[0]?.message?.content || '') : (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
      setOutput(content)
    } catch (error) {
      console.error('Creative generation error:', error)
      setOutput(`Error: ${error.message}. Please try again.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const isCurrentSaved = useMemo(() => {
    return safeCreations.some(c => c.content === output)
  }, [safeCreations, output])

  const handleSaveCreation = () => {
    if (!output) return
    addCreation({
      type: format,
      content: output,
      targetWords: selectedWords.map((w) => w.english)
    })
  }

  // Pratik Yap (Focus Session) Modül Fonksiyonları
  const handlePracticeClick = () => {
    if (selectedWords.length === 0) return
    setPracticeIndex(0)
    setIsFlipped(false)
    setIsPracticeOpen(true)
  }

  const nextCard = () => {
    setIsFlipped(false)
    if (practiceIndex < selectedWords.length - 1) {
      setPracticeIndex(prev => prev + 1)
    } else {
      setIsPracticeOpen(false)
    }
  }

  // Çıktıdaki hedef kelimeleri fosforlu (highlight) yapan fonksiyon
  const renderHighlightedOutput = () => {
    if (!output) return <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 eye-care:text-amber-800/80">Select words, choose a format, and click 'Generate Content'. The AI output will appear here.</p>
    
    const englishWords = selectedWords.map(w => w.english.toLowerCase())
    if (englishWords.length === 0) return <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 eye-care:text-amber-900">{output}</div>
    
    const regex = new RegExp(`\\b(${englishWords.join('|')})\\b`, 'gi')
    const parts = output.split(regex)
    
    return (
      <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 eye-care:text-amber-900">
        {parts.map((part, index) => {
          if (englishWords.includes(part.toLowerCase())) {
            return <strong key={index} className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-900 shadow-sm">{part}</strong>
          }
          return <span key={index}>{part}</span>
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans text-zinc-900 dark:text-zinc-100 eye-care:text-[#5C4B37]">
      {apiWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-amber-800">{apiWarning}</p>
          </div>
        </div>
      )}
      
      {/* Minimal API Key Indicator */}
      <div className="flex justify-end mb-2">
        <div className="flex items-center gap-3 opacity-30 transition-opacity duration-300 hover:opacity-100">
          {isEditingKey ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key..."
                className="w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:placeholder:text-amber-700/60"
              />
              <button
                onClick={saveApiKey}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
              >
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-xs font-medium text-zinc-500">AI Active</span>
              <button onClick={() => setIsEditingKey(true)} className="ml-1 text-xs font-medium text-indigo-600 hover:underline">Change</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Sol Taraf: Word Arsenal */}
        <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-md eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] lg:sticky lg:top-6 lg:col-span-4 xl:col-span-3">
          <div className="mb-4 border-b border-zinc-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Word Arsenal</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 eye-care:text-amber-950">Selection Board</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 eye-care:text-amber-800">Select words from categories.</p>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            {['Noun', 'Verb', 'Adjective', 'Phrasal Verb'].map((category) => {
              const categoryWords = groupedWords[category] || []
              if (categoryWords.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{category}s</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {categoryWords.map((word) => {
                      const isSelected = selectedIds.includes(word.id)

                      return (
                        <button
                          key={word.id}
                          onClick={() => toggleWord(word.id)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all ${
                            isSelected
                              ? 'scale-105 border-indigo-600 bg-indigo-600 text-white shadow-md dark:border-indigo-500 dark:bg-indigo-500'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-indigo-900/30 eye-care:bg-transparent eye-care:border-[#EAE0C8] eye-care:text-amber-900'
                          }`}
                        >
                          {word.english}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {words.length === 0 && (
              <p className="py-10 text-center text-sm text-zinc-500">You have no words in your vocabulary book yet.</p>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Creation Studio */}
        <div className="flex flex-col gap-6 lg:col-span-8 xl:col-span-9">
          {/* Seçilenler Sepeti */}
          <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-md eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-amber-950">Selected Words</h3>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 eye-care:bg-[#EAE0C8]/50">
                {selectedWords.length} Selected
              </span>
            </div>

            <div className="flex min-h-[64px] flex-wrap items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:bg-zinc-900 dark:border-zinc-700 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
              {selectedWords.length === 0 ? (
                <p className="p-2 text-sm text-zinc-400 dark:text-zinc-500">Start selecting words from the left board.</p>
              ) : (
                selectedWords.map((word) => {
                  return (
                    <div
                      key={word.id}
                      className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-2.5 py-1.5 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 dark:bg-zinc-800 dark:border-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/30 eye-care:bg-[#FDF6E3]"
                    >
                      <span>{word.english}</span>
                      <button
                        onClick={() => toggleWord(word.id)}
                        className="ml-1 flex h-4 w-4 items-center justify-center rounded bg-indigo-100 text-indigo-400 transition-colors hover:bg-indigo-200 hover:text-indigo-700"
                        title="Remove"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* CEFR Zorluk Seviyesi Seçimi */}
          <div className="flex w-full flex-col gap-1 rounded-xl bg-zinc-100 p-1 shadow-inner sm:flex-row sm:items-center dark:bg-zinc-900/50 eye-care:bg-[#EAE0C8]/30">
            {[
              { id: 'A1-A2', label: 'A1-A2 (Beginner)' },
              { id: 'B1-B2', label: 'B1-B2 (Intermediate/Advanced)' },
              { id: 'C1-C2', label: 'C1-C2 (Academic/Native)' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  selectedLevel === lvl.id
                    ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-indigo-400 dark:ring-zinc-700 eye-care:bg-[#FDF6E3]'
                    : 'bg-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* AI Format Seçimi */}
          <div className="grid gap-4 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`flex flex-col items-center justify-center rounded-xl border p-5 text-center transition-all duration-200 ${
                  format === f.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-500 dark:bg-indigo-900/40 dark:border-indigo-500 dark:text-indigo-300'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-750 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:hover:bg-[#F4ECD8]'
                }`}
              >
                {f.icon}
                <span className="mt-1 font-semibold">{f.title}</span>
              </button>
            ))}
          </div>

          {/* Üretim ve Sonuç Alanı */}
          <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-md eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            <div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-amber-950">Creation Studio</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create your text with AI.</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  My Archive ({safeCreations.length})
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={selectedWords.length === 0 || isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300 active:scale-95 disabled:opacity-50 sm:w-auto"
              >
                {isGenerating ? (
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {isGenerating ? 'Generating...' : 'Generate Content'}
              </button>
              <div className="flex w-full gap-3 sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(output)}
                  disabled={!output}
                  className="flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 sm:flex-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-750"
                >
                  Copy Output
                </button>
                <button
                  type="button"
                  onClick={handlePracticeClick}
                  disabled={selectedWords.length === 0}
                  className="flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 sm:flex-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-750"
                >
                  Practice
                </button>
              </div>
            </div>

            {/* Çıktı Paneli */}
            <div className="relative rounded-2xl border border-zinc-200 bg-slate-50 p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 eye-care:bg-transparent eye-care:border-[#EAE0C8]">
              <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">AI Output</span>
                {output && (
                  <button
                    onClick={handleSaveCreation}
                    disabled={isCurrentSaved}
                    className={`flex items-center gap-1.5 bg-transparent text-sm font-medium transition-colors ${
                      isCurrentSaved ? 'text-emerald-600' : 'text-zinc-500 hover:text-indigo-600'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {isCurrentSaved ? 'Archived' : 'Archive'}
                  </button>
                )}
              </div>
              <div className="min-h-[150px]">
                {renderHighlightedOutput()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Focus Session (Practice) Modal */}
      {isPracticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm sm:p-6">
          <div className="w-full max-w-lg rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-2xl dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-amber-950">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Focus Session
              </h3>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                Word {practiceIndex + 1} / {selectedWords.length}
              </span>
            </div>

            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="group relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6 text-center shadow-inner transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-zinc-900 dark:border-zinc-700 eye-care:bg-transparent eye-care:border-[#EAE0C8]"
            >
               {!isFlipped ? (
                   <>
                     <p className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-500 opacity-80">Target Word</p>
                     <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 transition-transform group-hover:scale-105">{selectedWords[practiceIndex]?.english}</h2>
                     <p className="absolute bottom-6 text-xs font-semibold text-zinc-400 transition-opacity group-hover:text-zinc-600">Click the card to see the translation</p>
                   </>
               ) : (
                   <>
                     <p className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-500 opacity-80">Translation</p>
                     <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{selectedWords[practiceIndex]?.turkish || 'Translation not found'}</h2>
                     <p className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700">{selectedWords[practiceIndex]?.type || 'Word'}</p>
                   </>
               )}
            </div>

            <div className="mt-8 flex gap-4">
              <button onClick={() => setIsPracticeOpen(false)} className="flex-1 rounded-xl border border-zinc-200 bg-white py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-750">Cancel Task</button>
              <button onClick={(e) => { e.stopPropagation(); nextCard(); }} className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700">
                {practiceIndex < selectedWords.length - 1 ? 'Next Word ➔' : 'Complete Task ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SavedCreationsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        creations={safeCreations}
        onDelete={removeCreation}
      />
    </div>
  )
}
