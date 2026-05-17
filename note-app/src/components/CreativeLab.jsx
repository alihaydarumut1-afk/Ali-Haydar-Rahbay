import { useMemo, useState } from 'react'
import useSavedCreations from '../hooks/useSavedCreations.js'
import SavedCreationsDrawer from './SavedCreationsDrawer.jsx'

const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CreativeLab({ words = [], onPractice }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [format, setFormat] = useState('dialogue')
  const [selectedLevel, setSelectedLevel] = useState('B1-B2')
  const [output, setOutput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { creations, addCreation, removeCreation } = useSavedCreations()
  const safeCreations = Array.isArray(creations) ? creations : []
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isPracticeOpen, setIsPracticeOpen] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

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

  const aiPrompt = useMemo(() => {
    if (selectedWords.length === 0) return 'Please select words from above to generate content.'
    const wordList = selectedWords.map((w) => w.english).join(', ')
    const levelInstruction = `Please generate this content strictly in accordance with the CEFR ${selectedLevel} English proficiency level, using the grammar structures and vocabulary appropriate for this level.`
    switch (format) {
      case 'dialogue': return `Create a natural, everyday conversation between two people using the following words: ${wordList}. The tone should be casual. ${levelInstruction}`
      case 'academic': return `Write a short, formal reading passage. Seamlessly incorporate the following words: ${wordList}. ${levelInstruction}`
      case 'news': return `Write a short newspaper article snippet reporting on a fictional event. Use journalistic language and include the following words: ${wordList}. ${levelInstruction}`
      default: return ''
    }
  }, [selectedWords, format, selectedLevel])

  const handleGenerate = async () => {
    if (selectedWords.length === 0) return
    setIsGenerating(true)
    try {
      const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, expectJson: false })
      })
      const textRaw = await response.text()
      let data
      try { data = textRaw ? JSON.parse(textRaw) : {} } catch { throw new Error('Sunucu boş veya geçersiz yanıt döndürdü') }
      if (!response.ok) { if (response.status === 429) alert(data.error); throw new Error(data.error || 'AI Hatası') }
      setOutput(data.content)
    } catch (error) {
      console.error('Creative generation error:', error)
      setOutput(`Error: ${error.message}. Please try again.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const isCurrentSaved = useMemo(() => safeCreations.some(c => c.content === output), [safeCreations, output])

  const handleSaveCreation = () => {
    if (!output) return
    addCreation({ type: format, content: output, targetWords: selectedWords.map((w) => w.english) })
  }

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

  const renderHighlightedOutput = () => {
    if (!output) return <p style={{ color: 'var(--text-muted)' }} className="text-sm leading-relaxed">Select words, choose a format, and click 'Generate Content'. The AI output will appear here.</p>
    const englishWords = selectedWords.map(w => w.english.toLowerCase())
    if (englishWords.length === 0) return <div style={{ color: 'var(--text-main)' }} className="whitespace-pre-wrap text-[15px] leading-relaxed">{output}</div>
    const regex = new RegExp(`\\b(${englishWords.join('|')})\\b`, 'gi')
    const parts = output.split(regex)
    return (
      <div style={{ color: 'var(--text-main)' }} className="whitespace-pre-wrap text-[15px] leading-relaxed">
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
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-12">
        
        {/* Sol: Word Arsenal */}
        <div className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border p-6 shadow-sm lg:sticky lg:top-6 lg:col-span-4 xl:col-span-3"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="mb-4 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Word Arsenal</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Selection Board</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Select words from categories.</p>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto pr-2">
            {['Noun', 'Verb', 'Adjective', 'Phrasal Verb'].map((category) => {
              const categoryWords = groupedWords[category] || []
              if (categoryWords.length === 0) return null
              return (
                <div key={category}>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{category}s</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {categoryWords.map((word) => {
                      const isSelected = selectedIds.includes(word.id)
                      return (
                        <button
                          key={word.id}
                          onClick={() => toggleWord(word.id)}
                          className="rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all"
                          style={isSelected
                            ? { backgroundColor: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }
                            : { backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }
                          }
                        >
                          {word.english}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {words.length === 0 && <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>You have no words in your vocabulary book yet.</p>}
          </div>
        </div>

        {/* Sağ: Creation Studio */}
        <div className="flex flex-col gap-6 lg:col-span-8 xl:col-span-9">
          
          {/* Seçilen Kelimeler */}
          <div className="rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Selected Words</h3>
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                {selectedWords.length} Selected
              </span>
            </div>
            <div className="flex min-h-[64px] flex-wrap items-start gap-2 rounded-xl border p-3" style={{ backgroundColor: 'var(--hover-bg)', borderColor: 'var(--border-color)' }}>
              {selectedWords.length === 0 ? (
                <p className="p-2 text-sm" style={{ color: 'var(--text-muted)' }}>Start selecting words from the left board.</p>
              ) : (
                selectedWords.map((word) => (
                  <div key={word.id} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold shadow-sm"
                    style={{ backgroundColor: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}>
                    <span>{word.english}</span>
                    <button onClick={() => toggleWord(word.id)}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded transition-colors"
                      style={{ backgroundColor: '#c7d2fe', color: '#4338ca' }}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CEFR Seviye */}
          <div className="flex w-full flex-col gap-1 rounded-xl p-1 shadow-inner sm:flex-row sm:items-center" style={{ backgroundColor: 'var(--hover-bg)' }}>
            {[
              { id: 'A1-A2', label: 'A1-A2 (Beginner)' },
              { id: 'B1-B2', label: 'B1-B2 (Intermediate/Advanced)' },
              { id: 'C1-C2', label: 'C1-C2 (Academic/Native)' },
            ].map((lvl) => (
              <button key={lvl.id} onClick={() => setSelectedLevel(lvl.id)}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all"
                style={selectedLevel === lvl.id
                  ? { backgroundColor: 'var(--card-bg)', color: '#4f46e5', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                  : { backgroundColor: 'transparent', color: 'var(--text-muted)' }
                }>
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Format Seçimi */}
          <div className="grid gap-4 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <button key={f.id} onClick={() => setFormat(f.id)}
                className="flex flex-col items-center justify-center rounded-xl border p-5 text-center transition-all duration-200"
                style={format === f.id
                  ? { backgroundColor: '#eef2ff', color: '#4338ca', borderColor: '#6366f1', boxShadow: '0 0 0 1px #6366f1' }
                  : { backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }
                }>
                {f.icon}
                <span className="mt-1 font-semibold">{f.title}</span>
              </button>
            ))}
          </div>

          {/* Üretim Alanı */}
          <div className="rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="mb-5 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Creation Studio</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Create your text with AI.</p>
              </div>
              <button type="button" onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 text-sm font-medium transition"
                style={{ color: 'var(--text-muted)' }}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                My Archive ({safeCreations.length})
              </button>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={handleGenerate}
                disabled={selectedWords.length === 0 || isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 sm:w-auto">
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
                <button type="button" onClick={() => navigator.clipboard.writeText(output)}
                  disabled={!output}
                  className="flex-1 rounded-xl border px-5 py-3 text-sm font-medium transition disabled:opacity-50 sm:flex-none"
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                  Copy Output
                </button>
                <button type="button" onClick={handlePracticeClick}
                  disabled={selectedWords.length === 0}
                  className="flex-1 rounded-xl border px-5 py-3 text-sm font-medium transition disabled:opacity-50 sm:flex-none"
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                  Practice
                </button>
              </div>
            </div>

            {/* Çıktı Paneli */}
            <div className="relative rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--hover-bg)', borderColor: 'var(--border-color)' }}>
              <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>AI Output</span>
                {output && (
                  <button onClick={handleSaveCreation} disabled={isCurrentSaved}
                    className="flex items-center gap-1.5 bg-transparent text-sm font-medium transition-colors"
                    style={{ color: isCurrentSaved ? '#059669' : 'var(--text-muted)' }}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    {isCurrentSaved ? 'Archived' : 'Archive'}
                  </button>
                )}
              </div>
              <div className="min-h-[150px]">{renderHighlightedOutput()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Focus Session Modal */}
      {isPracticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm sm:p-6">
          <div className="w-full max-w-lg rounded-[2rem] border p-8 shadow-2xl" data-modal
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Focus Session
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                Word {practiceIndex + 1} / {selectedWords.length}
              </span>
            </div>
            <div onClick={() => setIsFlipped(!isFlipped)}
              className="group relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] border p-6 text-center shadow-inner transition-all duration-300 hover:border-indigo-300 hover:bg-indigo-50"
              style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              {!isFlipped ? (
                <>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-500 opacity-80">Target Word</p>
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900 transition-transform group-hover:scale-105">{selectedWords[practiceIndex]?.english}</h2>
                  <p className="absolute bottom-6 text-xs font-semibold text-slate-400 transition-opacity group-hover:text-slate-600">Click the card to see the translation</p>
                </>
              ) : (
                <>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-500 opacity-80">Translation</p>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">{selectedWords[practiceIndex]?.turkish || 'Translation not found'}</h2>
                  <p className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">{selectedWords[practiceIndex]?.type || 'Word'}</p>
                </>
              )}
            </div>
            <div className="mt-8 flex gap-4">
              <button onClick={() => setIsPracticeOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                Cancel Task
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextCard(); }}
                className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700">
                {practiceIndex < selectedWords.length - 1 ? 'Next Word ➔' : 'Complete Task ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SavedCreationsDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} creations={safeCreations} onDelete={removeCreation} />
    </div>
  )
}