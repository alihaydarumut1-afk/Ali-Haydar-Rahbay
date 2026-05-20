import { useState as useStateForm } from 'react'
import { useMemo, useState, useEffect } from 'react'
import EditWordModal from './EditWordModal.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'
import PronunciationButton from './PronunciationButton.jsx'
import KnowledgeValidationEngine from './KnowledgeValidationEngine.jsx'

const FILTER_TYPES = ['All', 'Noun', 'Verb', 'Adjective', 'Phrasal Verb', 'Other']
const TYPE_LABELS = {
  Noun: 'Nouns',
  Verb: 'Verbs',
  Adjective: 'Adjectives',
  'Phrasal Verb': 'Phrasal Verbs',
  Other: 'Others',
}
const BADGE_STYLES = {
  Noun: 'bg-emerald-100 text-emerald-800',
  Verb: 'bg-sky-100 text-sky-800',
  Adjective: 'bg-violet-100 text-violet-800',
  'Phrasal Verb': 'bg-orange-100 text-orange-800',
  Other: 'bg-slate-100 text-slate-800',
}
function WordForm({ onSave, words = [] }) {
  const [english, setEnglish] = useStateForm('')
  const [entries, setEntries] = useStateForm([{ turkish: '', type: 'Noun', sentence: '', collocation: '' }])
  const [error, setError] = useStateForm('')

  const addEntry = () => setEntries(prev => [...prev, { turkish: '', type: 'Noun', sentence: '', collocation: '' }])
  const removeEntry = (index) => { if (entries.length > 1) setEntries(prev => prev.filter((_, i) => i !== index)) }
  const updateEntry = (index, field, value) => setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    if (!english.trim()) return setError('Please enter an English word.')
    const validEntries = entries.filter(e => e.turkish.trim())
    if (validEntries.length === 0) return setError('Please enter at least one Turkish meaning.')
    const isDuplicate = words.some(w => w.english.toLowerCase().trim() === english.toLowerCase().trim())
    if (isDuplicate) return setError(`"${english.trim()}" is already in your list. Use Edit to modify it.`)
    validEntries.forEach(entry => onSave({ english, turkish: entry.turkish, type: entry.type, sentence: entry.sentence, collocation: entry.collocation }))
    setEnglish('')
    setEntries([{ turkish: '', type: 'Noun', sentence: '', collocation: '' }])
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-600">
      <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">Add New Word</h2>
      {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <label className="mb-2 block text-sm font-bold text-black dark:text-white">English Word</label>
      <input value={english} onChange={(e) => setEnglish(e.target.value)} placeholder="English word" className="mb-6 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 dark:border-slate-500 dark:bg-black dark:text-white" />
      <div className="mb-4 space-y-4">
        {entries.map((entry, index) => (
          <div key={index} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Meaning {index + 1}</span>
              {entries.length > 1 && <button type="button" onClick={() => removeEntry(index)} className="text-rose-400 hover:text-rose-600 text-xs font-semibold">✕ Remove</button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Turkish Meaning</label>
                <input value={entry.turkish} onChange={(e) => updateEntry(index, 'turkish', e.target.value)} placeholder="Turkish meaning" className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-black dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Word Type</label>
                <select value={entry.type} onChange={(e) => updateEntry(index, 'type', e.target.value)} className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-black dark:text-white">
                  <option>Noun</option><option>Verb</option><option>Adjective</option><option>Phrasal Verb</option><option>Other</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Collocation (Optional)</label>
                <input value={entry.collocation} onChange={(e) => updateEntry(index, 'collocation', e.target.value)} placeholder="e.g. make a mistake" className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-black dark:text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Example Sentence (Optional)</label>
                <input value={entry.sentence} onChange={(e) => updateEntry(index, 'sentence', e.target.value)} placeholder="Example sentence" className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-sm text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-black dark:text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addEntry} className="mb-4 w-full rounded-2xl border-2 border-dashed border-indigo-300 px-4 py-2.5 text-sm font-semibold text-indigo-500 hover:border-indigo-500 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400">
        + Add Another Meaning
      </button>
      <button type="submit" className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-black">
        Save Word
      </button>
    </form>
  )
}
export default function WordTable({ words = [], onAddWord, onUpdateWord, onDeleteWord }) {
  const [filterType, setFilterType] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [editingWord, setEditingWord] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteWordId, setDeleteWordId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [expandedWordId, setExpandedWordId] = useState(null)
  const [testingWords, setTestingWords] = useState(null)

  const [pokAnalyses, setPokAnalyses] = useState(() => {
    try {
      const saved = localStorage.getItem('pok_saved_analyses')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [isAnalysesModalOpen, setIsAnalysesModalOpen] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState(null)

  const [isBlurEnabled, setIsBlurEnabled] = useState(() => {
    const saved = localStorage.getItem('noteapp_blur_enabled')
    return saved !== null ? JSON.parse(saved) : true
  })

  useEffect(() => {
    const handleBlurChange = () => {
      const saved = localStorage.getItem('noteapp_blur_enabled')
      setIsBlurEnabled(saved !== null ? JSON.parse(saved) : true)
    }
    window.addEventListener('blur_setting_changed', handleBlurChange)
    return () => window.removeEventListener('blur_setting_changed', handleBlurChange)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const filteredAndSortedWords = useMemo(() => {
    let filtered = words

    if (filterType !== 'All') {
      filtered = filtered.filter((word) => {
        if (word.entries && word.entries.length > 0) {
          return word.entries.some(e => e.partOfSpeech === filterType)
        }
        return word.type === filterType
      })
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((word) => {
        const englishMatch = word.english.toLowerCase().includes(q)
        const turkishMatch = word.entries && word.entries.length > 0
          ? word.entries.some(e => e.turkish && e.turkish.toLowerCase().includes(q))
          : (word.turkish || '').toLowerCase().includes(q)
        return englishMatch || turkishMatch
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      switch (sortBy) {
        case 'a-z': return a.english.toLowerCase().localeCompare(b.english.toLowerCase())
        case 'z-a': return b.english.toLowerCase().localeCompare(a.english.toLowerCase())
        case 'oldest': return dateA !== dateB ? dateA - dateB : String(a.id).localeCompare(String(b.id))
        default: return dateB !== dateA ? dateB - dateA : String(b.id).localeCompare(String(a.id))
      }
    })

    return sorted
  }, [words, filterType, searchQuery, sortBy])

 const groupedWords = useMemo(() => {
  const result = {}
  FILTER_TYPES.slice(1).forEach(type => {
    result[type] = []
  })

  filteredAndSortedWords.forEach(word => {
    const entries = word.entries && word.entries.length > 0
      ? word.entries
      : [{ partOfSpeech: word.type || 'Other', turkish: word.turkish, sentence: word.sentence, collocation: word.collocation }]
    
    const addedTypes = new Set()
    entries.forEach(entry => {
      const t = FILTER_TYPES.includes(entry.partOfSpeech) ? entry.partOfSpeech : 'Other'
      if (!addedTypes.has(t)) {
        addedTypes.add(t)
        const relevantEntries = entries.filter(e => (FILTER_TYPES.includes(e.partOfSpeech) ? e.partOfSpeech : 'Other') === t)
        result[t].push({ ...word, _displayEntries: relevantEntries })
      }
    })
  })

  return result
}, [filteredAndSortedWords])

  const handleStartCrossExam = () => {
    let pool = words.filter(w => !w.isMastered)
    if (pool.length < 3) pool = words
    if (words.length < 4) return alert("Sinavi baslatabilmek icin kelime deponuzda en az 4 kelime bulunmalidir. Lutfen once birkac kelime daha ekleyin!")
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(5, Math.max(3, pool.length)))
    setTestingWords(selected)
  }

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-[0.95fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-400">Vocabulary Book</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-zinc-50">Added Words</h2>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              Total: {words.length}
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              <button type="button" onClick={() => setIsAnalysesModalOpen(true)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700">
                My Analyses
              </button>
              <button type="button" onClick={handleStartCrossExam} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Start Cross Exam
              </button>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Search Words</label>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search English word or Turkish meaning..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Sort by:</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSortBy(sortBy === 'a-z' ? 'z-a' : 'a-z')} className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${sortBy === 'a-z' || sortBy === 'z-a' ? 'border-slate-950 bg-slate-950 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}>
                  Alphabetical {sortBy === 'a-z' ? 'A-Z' : sortBy === 'z-a' ? 'Z-A' : ''}
                </button>
                <button type="button" onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')} className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${sortBy === 'newest' || sortBy === 'oldest' ? 'border-slate-950 bg-slate-950 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}>
                  Date {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : ''}
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-3">
              {FILTER_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => setFilterType(type)} className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${filterType === type ? 'border-slate-950 bg-slate-950 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
            {filteredAndSortedWords.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500 shadow-sm shadow-slate-200/70 dark:bg-zinc-900/80 dark:border-zinc-700 dark:text-zinc-400 dark:shadow-none">
                <p className="text-lg font-medium text-slate-700 dark:text-zinc-300">No words found matching the selected criteria.</p>
                <p className="mt-3 text-sm">Fill the list by adding new words.</p>
              </div>
            ) : (
              FILTER_TYPES.slice(1).map((type) => {
                const wordsForType = groupedWords[type] || []
                if (wordsForType.length === 0) return null
                const groupTypeKey = type === 'Phrasal Verb' ? 'phrasalverb' : type.toLowerCase()

                return (
                  <div key={type} className="relative mb-8 last:mb-0">
                    {filterType === 'All' && (
                      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-2xl p-4 shadow-sm backdrop-blur-md border border-slate-200 dark:border-zinc-700" style={{ backgroundColor: `var(--bg-${groupTypeKey}-header, #f1f5f9)`, color: `var(--text-${groupTypeKey}-header, #0f172a)` }}>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold" style={{ color: 'inherit' }}>{TYPE_LABELS[type]}</h3>
                          <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-semibold" style={{ color: 'inherit' }}>{wordsForType.length} Words</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {wordsForType.map((word) => {
                        const isExpanded = expandedWordId === word.id
                        const wordEntries = word.entries && Array.isArray(word.entries) ? word.entries : []
                        const hasEntries = word._displayEntries && word._displayEntries.length > 0

                        return (
                          <article
                            key={word.id}
                            style={{ borderRadius: 'var(--card-radius, 1.5rem)' }}
                            onClick={() => setExpandedWordId(isExpanded ? null : word.id)}
                            className="group flex cursor-pointer flex-col sm:flex-row justify-between gap-4 p-5 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-md dark:shadow-black/40 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:ring-2 hover:ring-black/5 dark:hover:bg-zinc-750 dark:hover:ring-white/10"
                          >
                            {/* Sol Bolge */}
                            <div className="flex w-full sm:w-1/3 shrink-0 items-start gap-3 min-w-0">
                              <div className="mt-1 shrink-0">
                                <PronunciationButton text={word.english} />
                              </div>
                              <div className="flex flex-col items-start gap-1.5 min-w-0 w-full">
                                <div className="flex flex-wrap items-baseline gap-2 min-w-0 w-full">
                                  <span className="text-xl font-bold leading-tight break-words max-w-full text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950 transition-colors duration-300" style={{ wordBreak: 'break-word' }}>{word.english}</span>
                                  {word.isMastered && (
                                    <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 text-[10px] font-bold shadow-sm shrink-0 transition-colors duration-300">Passed Exam</span>
                                  )}
                                  {wordEntries.length > 1 && (
                                    <span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold shrink-0">
                                      {wordEntries.length} meanings
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Orta Bolge: Nested Entries */}
                            <div className="flex flex-1 flex-col gap-3 border-l-2 border-zinc-200 dark:border-zinc-700 eye-care:border-[#EAE0C8] pl-4 sm:pl-6 text-sm min-w-0 transition-colors duration-300">
                              {hasEntries ? (
                                word._displayEntries.map((entry, i) => (
                                  <div key={i} className="flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {entry.partOfSpeech && (
                                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${BADGE_STYLES[entry.partOfSpeech] || BADGE_STYLES['Other']}`}>
                                          {entry.partOfSpeech}
                                        </span>
                                      )}
                                      {/* 🔴 DÜZELTİLDİ: Türkçe anlam rengi koyulaştırıldı */}
                                      {isBlurEnabled ? (
                                        <div className="relative inline-block w-fit cursor-help max-w-full group/blur">
                                          <span className="invisible font-semibold break-words">{entry.turkish}</span>
                                          <span className="absolute inset-0 select-none font-semibold blur-[6px] transition-all duration-300 group-hover/blur:select-text group-hover/blur:blur-none break-words overflow-hidden text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950">
                                            {entry.turkish}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold break-words text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950">{entry.turkish}</span>
                                      )}
                                    </div>
                                    {entry.sentence && (
                                      <p className={`italic text-zinc-600 dark:text-zinc-300 eye-care:text-amber-800 pl-1 ${isExpanded ? '' : 'line-clamp-1'}`}>"{entry.sentence}"</p>
                                    )}
                                    {entry.collocation && (
                                      <p className={`text-zinc-600 dark:text-zinc-300 eye-care:text-amber-800 pl-1 ${isExpanded ? '' : 'line-clamp-1'}`}><strong>Col:</strong> {entry.collocation}</p>
                                    )}
                                    {i < word._displayEntries.length - 1 && (
                                      <hr className="mt-1 border-zinc-100 dark:border-zinc-700 eye-care:border-amber-200" />
                                    )}
                                  </div>
                                ))
                              ) : (
                                <>
                                  <div className="flex items-start gap-2 min-w-0">
                                    <strong className="mt-0.5 shrink-0 text-zinc-700 dark:text-zinc-300 eye-care:text-amber-900 transition-colors duration-300">Meaning:</strong>
                                    {/* 🔴 DÜZELTİLDİ: Türkçe anlam rengi koyulaştırıldı */}
                                    {isBlurEnabled ? (
                                      <div className="relative inline-block w-fit cursor-help max-w-full group/blur">
                                        <span className={`invisible font-semibold break-words ${isExpanded ? '' : 'line-clamp-1'}`}>{word.turkish}</span>
                                        <span className={`absolute inset-0 select-none font-semibold blur-[6px] transition-all duration-300 group-hover/blur:select-text group-hover/blur:blur-none break-words overflow-hidden text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950 ${isExpanded ? '' : 'line-clamp-1'}`}>
                                          {word.turkish}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className={`font-semibold break-words max-w-full text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950 transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>{word.turkish}</span>
                                    )}
                                  </div>
                                  {word.collocation && (
                                    <div className="flex items-start gap-2 min-w-0">
                                      <strong className="shrink-0 text-zinc-700 dark:text-zinc-300 eye-care:text-amber-900 transition-colors duration-300">Collocation:</strong>
                                      <span className={`font-semibold break-words max-w-full text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950 transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>{word.collocation}</span>
                                    </div>
                                  )}
                                  {word.sentence && (
                                    <div className="flex items-start gap-2 min-w-0">
                                      <strong className="shrink-0 text-zinc-700 dark:text-zinc-300 eye-care:text-amber-900 transition-colors duration-300">Example:</strong>
                                      <span className={`italic break-words max-w-full text-zinc-700 dark:text-zinc-300 eye-care:text-amber-900 transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>"{word.sentence}"</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Sag Bolge: Aksiyon Ikonlari */}
                            <div className="relative flex shrink-0 items-start sm:items-center opacity-100 transition-opacity duration-200 sm:opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === word.id ? null : word.id) }}
                                className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700 eye-care:text-amber-800 eye-care:hover:bg-amber-100 transition-colors duration-300"
                                title="Actions"
                              >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              {openDropdownId === word.id && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 eye-care:bg-[#FDF6E3] border border-zinc-200 dark:border-zinc-700 eye-care:border-[#EAE0C8] rounded-xl shadow-xl z-50 py-1 overflow-hidden transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => { setEditingWord(word); setIsModalOpen(true); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 eye-care:text-amber-900 hover:bg-zinc-50 dark:hover:bg-zinc-700 eye-care:hover:bg-amber-100 transition-colors duration-300 flex items-center gap-2">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Edit
                                  </button>
                                  <button onClick={() => { setDeleteWordId(word.id); setIsDeleteModalOpen(true); setOpenDropdownId(null) }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors duration-300 flex items-center gap-2">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <WordForm onSave={onAddWord} words={words} key="word-form" />
        </aside>

        <EditWordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} word={editingWord} onUpdate={onUpdateWord} />
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => {
            if (deleteWordId) { onDeleteWord(deleteWordId); setDeleteWordId(null) }
            setIsDeleteModalOpen(false)
          }}
          itemName={editingWord ? editingWord.english : ''}
        />

        {testingWords && testingWords.length > 0 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6">
            <div className="w-full max-w-2xl my-auto">
              <KnowledgeValidationEngine
                words={testingWords}
                allWords={words}
                onComplete={(scoreMap) => {
                  Object.entries(scoreMap).forEach(([id, score]) => {
                    onUpdateWord(id, { masteryScore: score, isMastered: score >= 90 })
                  })
                  const newAnalysis = {
                    id: Date.now(),
                    date: new Date().toISOString(),
                    testedWords: testingWords.map(w => ({ id: w.id, english: w.english, turkish: w.turkish, score: scoreMap[w.id] || 0 }))
                  }
                  const updatedAnalyses = [newAnalysis, ...pokAnalyses]
                  setPokAnalyses(updatedAnalyses)
                  localStorage.setItem('pok_saved_analyses', JSON.stringify(updatedAnalyses))
                  setTestingWords(null)
                }}
                onCancel={() => setTestingWords(null)}
              />
            </div>
          </div>
        )}

        {isAnalysesModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6" onClick={() => setIsAnalysesModalOpen(false)}>
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-zinc-800">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50">Cross Exam Analyses</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Your past test results and word success rates.</p>
                </div>
                <button onClick={() => setIsAnalysesModalOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                {pokAnalyses.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 dark:text-zinc-400">You don't have any saved exam analyses yet.</div>
                ) : (
                  pokAnalyses.map(analysis => {
                    const avgScore = Math.round(analysis.testedWords.reduce((acc, w) => acc + w.score, 0) / analysis.testedWords.length) || 0
                    return (
                      <div key={analysis.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:bg-zinc-800 dark:border-zinc-700">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-slate-700 dark:text-zinc-300">{new Date(analysis.date).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          <span className={`font-bold px-3 py-1 rounded-full text-xs ${avgScore >= 80 ? 'bg-emerald-100 text-emerald-700' : avgScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>Average: {avgScore}%</span>
                        </div>
                        <div className="space-y-2 mt-4 border-t border-slate-200 pt-4 dark:border-zinc-700">
                          {analysis.testedWords.map(w => (
                            <div key={w.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 dark:bg-zinc-900 dark:border-zinc-800">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-zinc-100">{w.english}</span>
                                <span className="text-slate-600 dark:text-zinc-300 ml-2 text-sm font-semibold">{w.turkish}</span>
                              </div>
                              <span className={`font-bold ${w.score >= 90 ? 'text-emerald-500' : w.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{w.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}