import { useMemo, useState, useEffect } from 'react'
import useSavedCreations from '../hooks/useSavedCreations.js'
import SavedCreationsDrawer from './SavedCreationsDrawer.jsx'

const getBaseUrl = () => 'https://note-app-server-44hm.onrender.com';

// eye-care modunu DOM'dan okur
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

// eye-care modunda yüksek kontrastlı renkler
const EC = {
  bg:          '#F5EDD8',   // sayfa arka planı
  cardBg:      '#EDE0C4',   // kart arka planı (daha koyu)
  hoverBg:     '#E3D1AC',   // input/hover arka planı (belirgin)
  border:      '#B89C6E',   // border (kahverengi ton, belirgin)
  textMain:    '#2C1E0F',   // ana metin (koyu kahve)
  textMuted:   '#5A3E28',   // ikincil metin (orta kahve)
  label:       '#3B2510',   // üst etiket metni
  accent:      '#4338ca',   // indigo accent (değişmez)
  accentBg:    '#DDD8F5',   // seçili chip arka planı
  accentBorder:'#9F96E0',   // seçili chip border
  accentText:  '#2D2580',   // seçili chip yazısı
}

export default function CreativeLab({ words = [], onPractice }) {
  const isEyeCare = useEyeCare()
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

  // CSS değişken yardımcıları — eye-care modunda override et
  const cv = (varName) => isEyeCare ? (EC[varName] ?? `var(${varName})`) : `var(${varName})`

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
      case 'dialogue': return `Create a natural, everyday conversation between two people using the following words: ${wordList}. The tone should be casual. Reply with ONLY the plain conversation text, no JSON, no code blocks, no extra formatting. Format each line as "Name: dialogue". ${levelInstruction}`
      case 'academic': return `Write a short, formal reading passage. Seamlessly incorporate the following words: ${wordList}. Reply with ONLY the plain passage text, no JSON, no code blocks. ${levelInstruction}`
      case 'news': return `Write a short newspaper article snippet reporting on a fictional event. Use journalistic language and include the following words: ${wordList}. Reply with ONLY the plain article text, no JSON, no code blocks. ${levelInstruction}`
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

  const cleanOutput = (raw) => {
    if (!raw) return ''
    let text = raw.trim()
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    try {
      const parsed = JSON.parse(text)
      if (parsed.conversation && Array.isArray(parsed.conversation)) {
        return parsed.conversation.map(l => `${l.speaker}: ${l.line}`).join('\n')
      }
      if (parsed.text) return parsed.text
      if (parsed.article) return parsed.article
      if (parsed.passage) return parsed.passage
      if (typeof parsed === 'string') return parsed
      return JSON.stringify(parsed, null, 2)
    } catch {
      return text
    }
  }

  const renderHighlightedOutput = () => {
    if (!output) return (
      <p style={{ color: isEyeCare ? EC.textMuted : 'var(--text-muted)' }} className="text-sm leading-relaxed">
        Select words, choose a format, and click 'Generate Content'. The AI output will appear here.
      </p>
    )

    const clean = cleanOutput(output)
    const englishWords = selectedWords.map(w => w.english.toLowerCase())

    if (englishWords.length === 0) return (
      <div style={{ color: isEyeCare ? EC.textMain : 'var(--text-main)' }} className="whitespace-pre-wrap text-[15px] leading-relaxed">{clean}</div>
    )

    const regex = new RegExp(`\\b(${englishWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
    const parts = clean.split(regex)

    return (
      <div style={{ color: isEyeCare ? EC.textMain : 'var(--text-main)' }} className="whitespace-pre-wrap text-[15px] leading-relaxed">
        {parts.map((part, index) => {
          if (englishWords.includes(part.toLowerCase())) {
            return (
              <strong
                key={index}
                style={isEyeCare
                  ? { backgroundColor: '#C8B88A', color: '#2C1E0F', borderRadius: '4px', padding: '1px 6px' }
                  : { backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '4px', padding: '1px 6px' }
                }
              >
                {part}
              </strong>
            )
          }
          return <span key={index}>{part}</span>
        })}
      </div>
    )
  }

  const cardStyle = {
    backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
    borderColor: isEyeCare ? EC.border : 'var(--border-color)',
  }

  const hoverBgStyle = {
    backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)',
  }

  const textMain = { color: isEyeCare ? EC.textMain : 'var(--text-main)' }
  const textMuted = { color: isEyeCare ? EC.textMuted : 'var(--text-muted)' }
  const borderColor = { borderColor: isEyeCare ? EC.border : 'var(--border-color)' }

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-12">

        {/* Sol: Word Arsenal */}
        <div
          className="flex h-[calc(100vh-8rem)] flex-col rounded-2xl border p-6 shadow-sm lg:sticky lg:top-6 lg:col-span-4 xl:col-span-3"
          style={{ ...cardStyle }}
        >
          <div className="mb-4 border-b pb-4" style={borderColor}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={textMuted}>Word Arsenal</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight" style={textMain}>Selection Board</h2>
            <p className="mt-1 text-sm" style={textMuted}>Select words from categories.</p>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto pr-2">
            {['Noun', 'Verb', 'Adjective', 'Phrasal Verb'].map((category) => {
              const categoryWords = groupedWords[category] || []
              if (categoryWords.length === 0) return null
              return (
                <div key={category}>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={textMuted}>{category}s</h3>
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
                            : {
                                backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                                color: isEyeCare ? EC.textMain : 'var(--text-main)',
                                borderColor: isEyeCare ? EC.border : 'var(--border-color)',
                              }
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
            {words.length === 0 && (
              <p className="py-10 text-center text-sm" style={textMuted}>
                You have no words in your vocabulary book yet.
              </p>
            )}
          </div>
        </div>

        {/* Sağ: Creation Studio */}
        <div className="flex flex-col gap-6 lg:col-span-8 xl:col-span-9">

          {/* Seçilen Kelimeler */}
          <div className="rounded-2xl border p-6 shadow-sm" style={cardStyle}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold" style={textMain}>Selected Words</h3>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)', ...textMuted }}
              >
                {selectedWords.length} Selected
              </span>
            </div>
            <div
              className="flex min-h-[64px] flex-wrap items-start gap-2 rounded-xl border p-3"
              style={{ backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)', ...borderColor }}
            >
              {selectedWords.length === 0 ? (
                <p className="p-2 text-sm" style={textMuted}>Start selecting words from the left board.</p>
              ) : (
                selectedWords.map((word) => (
                  <div
                    key={word.id}
                    className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold shadow-sm"
                    style={isEyeCare
                      ? { backgroundColor: EC.accentBg, color: EC.accentText, borderColor: EC.accentBorder }
                      : { backgroundColor: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }
                    }
                  >
                    <span>{word.english}</span>
                    <button
                      onClick={() => toggleWord(word.id)}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded transition-colors"
                      style={isEyeCare
                        ? { backgroundColor: EC.accentBorder, color: EC.accentText }
                        : { backgroundColor: '#c7d2fe', color: '#4338ca' }
                      }
                    >
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
          <div
            className="flex w-full flex-col gap-1 rounded-xl p-1 shadow-inner sm:flex-row sm:items-center"
            style={{ backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)' }}
          >
            {[
              { id: 'A1-A2', label: 'A1-A2 (Beginner)' },
              { id: 'B1-B2', label: 'B1-B2 (Intermediate/Advanced)' },
              { id: 'C1-C2', label: 'C1-C2 (Academic/Native)' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all"
                style={selectedLevel === lvl.id
                  ? {
                      backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                      color: '#4f46e5',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      fontWeight: 700,
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: isEyeCare ? EC.textMuted : 'var(--text-muted)',
                    }
                }
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Format Seçimi */}
          <div className="grid gap-4 sm:grid-cols-3">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className="flex flex-col items-center justify-center rounded-xl border p-5 text-center transition-all duration-200"
                style={format === f.id
                  ? {
                      backgroundColor: isEyeCare ? '#DDD8F5' : '#eef2ff',
                      color: '#4338ca',
                      borderColor: '#6366f1',
                      boxShadow: '0 0 0 1px #6366f1',
                    }
                  : {
                      backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                      color: isEyeCare ? EC.textMain : 'var(--text-main)',
                      borderColor: isEyeCare ? EC.border : 'var(--border-color)',
                    }
                }
              >
                {f.icon}
                <span className="mt-1 font-semibold">{f.title}</span>
              </button>
            ))}
          </div>

          {/* Üretim Alanı */}
          <div className="rounded-2xl border p-6 shadow-sm" style={cardStyle}>
            <div className="mb-5 flex items-center justify-between border-b pb-4" style={borderColor}>
              <div>
                <h3 className="text-lg font-bold" style={textMain}>Creation Studio</h3>
                <p className="mt-1 text-sm" style={textMuted}>Create your text with AI.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 text-sm font-medium transition"
                style={textMuted}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                My Archive ({safeCreations.length})
              </button>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={selectedWords.length === 0 || isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50 sm:w-auto"
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
                  onClick={() => navigator.clipboard.writeText(cleanOutput(output))}
                  disabled={!output}
                  className="flex-1 rounded-xl border px-5 py-3 text-sm font-medium transition disabled:opacity-50 sm:flex-none"
                  style={{
                    backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                    color: isEyeCare ? EC.textMain : 'var(--text-main)',
                    borderColor: isEyeCare ? EC.border : 'var(--border-color)',
                  }}
                >
                  Copy Output
                </button>
                <button
                  type="button"
                  onClick={handlePracticeClick}
                  disabled={selectedWords.length === 0}
                  className="flex-1 rounded-xl border px-5 py-3 text-sm font-medium transition disabled:opacity-50 sm:flex-none"
                  style={{
                    backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                    color: isEyeCare ? EC.textMain : 'var(--text-main)',
                    borderColor: isEyeCare ? EC.border : 'var(--border-color)',
                  }}
                >
                  Practice
                </button>
              </div>
            </div>

            {/* Çıktı Paneli */}
            <div
              className="relative rounded-2xl border p-6 shadow-sm"
              style={{
                backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)',
                borderColor: isEyeCare ? EC.border : 'var(--border-color)',
              }}
            >
              <div className="mb-4 flex items-center justify-between border-b pb-3" style={borderColor}>
                <span className="text-xs font-semibold uppercase tracking-wider" style={textMuted}>AI Output</span>
                {output && (
                  <button
                    onClick={handleSaveCreation}
                    disabled={isCurrentSaved}
                    className="flex items-center gap-1.5 bg-transparent text-sm font-medium transition-colors"
                    style={{ color: isCurrentSaved ? '#059669' : (isEyeCare ? EC.textMuted : 'var(--text-muted)') }}
                  >
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
          <div
            className="w-full max-w-lg rounded-[2rem] border p-8 shadow-2xl"
            style={cardStyle}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold" style={textMain}>
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Focus Session
              </h3>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
                style={{
                  backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)',
                  color: isEyeCare ? EC.textMuted : 'var(--text-muted)',
                }}
              >
                Word {practiceIndex + 1} / {selectedWords.length}
              </span>
            </div>

            {/* Flashcard */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="group relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] border p-6 text-center shadow-inner transition-all duration-300"
              style={{
                backgroundColor: isEyeCare ? EC.hoverBg : 'var(--hover-bg)',
                borderColor: isEyeCare ? EC.border : 'var(--border-color)',
              }}
            >
              {!isFlipped ? (
                <>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-indigo-500">Target Word</p>
                  <h2
                    className="text-4xl font-bold tracking-tight transition-transform group-hover:scale-105"
                    style={textMain}
                  >
                    {selectedWords[practiceIndex]?.english}
                  </h2>
                  <p
                    className="absolute bottom-6 text-xs font-semibold transition-opacity"
                    style={textMuted}
                  >
                    Click the card to see the translation
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4 text-xs font-bold uppercase tracking-widest text-emerald-600">Translation</p>
                  <h2 className="text-3xl font-bold tracking-tight" style={textMain}>
                    {selectedWords[practiceIndex]?.turkish || 'Translation not found'}
                  </h2>
                  <p
                    className="mt-4 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    style={{
                      backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                      borderColor: isEyeCare ? EC.border : 'var(--border-color)',
                      color: isEyeCare ? EC.textMuted : 'var(--text-muted)',
                    }}
                  >
                    {selectedWords[practiceIndex]?.type || 'Word'}
                  </p>
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setIsPracticeOpen(false)}
                className="flex-1 rounded-xl border py-3.5 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isEyeCare ? EC.cardBg : 'var(--card-bg)',
                  borderColor: isEyeCare ? EC.border : 'var(--border-color)',
                  color: isEyeCare ? EC.textMain : 'var(--text-main)',
                }}
              >
                Cancel Task
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextCard(); }}
                className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-700"
              >
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
