import { useMemo, useState, useEffect } from 'react'
import WordForm from './WordForm.jsx'
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

export default function WordTable({ words, onAddWord, onUpdateWord, onDeleteWord }) {
  const [filterType, setFilterType] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'a-z', 'z-a'
  const [editingWord, setEditingWord] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteWordId, setDeleteWordId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [expandedWordId, setExpandedWordId] = useState(null)
  const [testingWords, setTestingWords] = useState(null) // Artık Array alıyor

  const [pokAnalyses, setPokAnalyses] = useState(() => {
    try {
      const saved = localStorage.getItem('pok_saved_analyses')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
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

  // Dropdown dışına tıklandığında kapatma
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const filteredAndSortedWords = useMemo(() => {
    let filtered = words

    // Filtreleme
    if (filterType !== 'All') {
      filtered = filtered.filter((word) => word.type === filterType)
    }

    // Arama
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((word) =>
        word.english.toLowerCase().includes(query) ||
        word.turkish.toLowerCase().includes(query)
      )
    }

    // Sıralama
    const sorted = [...filtered].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0

      switch (sortBy) {
        case 'a-z':
          return a.english.toLowerCase().localeCompare(b.english.toLowerCase())
        case 'z-a':
          return b.english.toLowerCase().localeCompare(a.english.toLowerCase())
        case 'oldest':
          return dateA !== dateB ? dateA - dateB : String(a.id).localeCompare(String(b.id))
        case 'newest':
        default:
          return dateB !== dateA ? dateB - dateA : String(b.id).localeCompare(String(a.id))
      }
    })

    return sorted
  }, [words, filterType, searchQuery, sortBy])

  const groupedWords = useMemo(() => {
    return FILTER_TYPES.slice(1).reduce((groups, type) => {
      if (type === 'Other') {
        groups[type] = filteredAndSortedWords.filter((word) => !['Noun', 'Verb', 'Adjective', 'Phrasal Verb'].includes(word.type))
      } else {
        groups[type] = filteredAndSortedWords.filter((word) => word.type === type)
      }
      return groups
    }, {})
  }, [filteredAndSortedWords])

  // Çapraz Sınav Başlatıcı (Interleaved Testing)
  const handleStartCrossExam = () => {
    // Öncelik: Henüz "Mastered" olmayan kelimeler
    let pool = words.filter(w => !w.isMastered)
    if (pool.length < 3) pool = words // Yeterli kelime yoksa tüm listeyi kullan
    if (pool.length === 0) return alert("You must add words to start the exam!")
    
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(5, Math.max(3, pool.length))) // 3 ile 5 arası kelime seç
    setTestingWords(selected)
  }

  return (
    <>
      <div className="grid gap-8 xl:grid-cols-[0.95fr_0.85fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Vocabulary Book</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Added Words</h2>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              Total: {words.length}
            </div>
            <div className="flex items-center gap-3 sm:ml-auto">
              <button
                type="button"
                onClick={() => setIsAnalysesModalOpen(true)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                📊 My Analyses
              </button>
              <button
                type="button"
                onClick={handleStartCrossExam}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                🧠 Start Cross Exam
              </button>
            </div>
          </div>

          {/* Arama ve Sıralama */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Search Words</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search English word or Turkish meaning..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Sort by:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'a-z' ? 'z-a' : 'a-z')}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    sortBy === 'a-z' || sortBy === 'z-a'
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Alphabetical {sortBy === 'a-z' ? 'A-Z' : sortBy === 'z-a' ? 'Z-A' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    sortBy === 'newest' || sortBy === 'oldest'
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Date {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : ''}
                </button>
              </div>
            </div>
          </div>

          {/* Filtre Butonları ve Ayarlar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              {FILTER_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    filterType === type
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

        {/* Horizontal List View - Gruplandırılmış Liste */}
        <div className="mb-8">
          {filteredAndSortedWords.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500 shadow-sm shadow-slate-200/70">
              <p className="text-lg font-medium">No words found matching the selected criteria.</p>
              <p className="mt-3 text-sm text-slate-500">Fill the list by adding new words.</p>
            </div>
          ) : (
            FILTER_TYPES.slice(1).map((type) => {
              const wordsForType = groupedWords[type] || []
              if (wordsForType.length === 0) return null

              const groupTypeKey = type === 'Phrasal Verb' ? 'phrasalverb' : type.toLowerCase()

              return (
                <div key={type} className="relative mb-8 last:mb-0">
                  {filterType === 'All' && (
                    <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-2xl p-4 shadow-sm backdrop-blur-md border border-slate-200" style={{ backgroundColor: `var(--bg-${groupTypeKey}-header, #f1f5f9)`, color: `var(--text-${groupTypeKey}-header, #0f172a)` }}>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold" style={{ color: 'inherit' }}>{TYPE_LABELS[type]}</h3>
                        <span className="rounded-full bg-black/10 px-3 py-1 text-xs font-semibold" style={{ color: 'inherit' }}>
                          {wordsForType.length} Words
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    {wordsForType.map((word) => {
                      const isExpanded = expandedWordId === word.id

                      return (
                        <article
                          key={word.id}
                          style={{ borderRadius: 'var(--card-radius, 1.5rem)' }}
                          onClick={() => setExpandedWordId(isExpanded ? null : word.id)}
                          className="group flex cursor-pointer flex-col sm:flex-row justify-between gap-4 p-5 bg-white border border-zinc-200 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 dark:shadow-md dark:shadow-black/40 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:ring-2 hover:ring-black/5 dark:hover:bg-zinc-750 dark:hover:ring-white/10"
                        >
                  {/* Sol Bölge: İngilizce ve Ses */}
                  <div className="flex w-full sm:w-1/3 shrink-0 items-start gap-3 min-w-0">
                    <div className="mt-1 shrink-0">
                      <PronunciationButton text={word.english} />
                    </div>
                    <div className="flex flex-col items-start gap-1.5 min-w-0 w-full">
                      <div className="flex flex-wrap items-baseline gap-2 min-w-0 w-full">
                        <span className="text-xl font-bold leading-tight break-words max-w-full text-zinc-900 dark:text-zinc-100 eye-care:text-amber-950 transition-colors duration-300" style={{ wordBreak: 'break-word' }}>{word.english}</span>
                        {word.isMastered && (
                          <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 text-[10px] font-bold shadow-sm shrink-0 transition-colors duration-300">
                            🏆 Passed Exam
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Orta Bölge: Tüm Kayıtlı Detaylar */}
                  <div className="flex flex-1 flex-col gap-2 border-l-2 border-zinc-200 dark:border-zinc-700 eye-care:border-[#EAE0C8] pl-4 sm:pl-6 text-sm min-w-0 transition-colors duration-300">
                    <div className="flex items-start gap-2 min-w-0">
                      <strong className="mt-0.5 shrink-0 text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 transition-colors duration-300">Meaning:</strong>
                      {isBlurEnabled ? (
                        <div className="relative inline-block w-fit cursor-help max-w-full group/blur">
                          <span className={`invisible font-medium break-words ${isExpanded ? '' : 'line-clamp-1'}`}>{word.turkish}</span>
                          <span className={`absolute inset-0 select-none font-medium blur-[6px] transition-all duration-300 group-hover/blur:select-text group-hover/blur:blur-none break-words overflow-hidden text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 ${isExpanded ? '' : 'line-clamp-1'}`}>
                            {word.turkish}
                          </span>
                        </div>
                      ) : (
                        <span className={`font-medium break-words max-w-full text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>{word.turkish}</span>
                      )}
                    </div>
                    
                    {word.collocation && (
                      <div className="flex items-start gap-2 min-w-0">
                        <strong className="shrink-0 text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 transition-colors duration-300">Collocation:</strong>
                        <span className={`font-medium break-words max-w-full text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>{word.collocation}</span>
                      </div>
                    )}
                    
                    {word.sentence && (
                      <div className="flex items-start gap-2 min-w-0">
                        <strong className="shrink-0 text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 transition-colors duration-300">Example:</strong>
                        <span className={`italic break-words max-w-full text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800 transition-colors duration-300 ${isExpanded ? '' : 'line-clamp-1'}`}>"{word.sentence}"</span>
                      </div>
                    )}
                  </div>

                  {/* Sağ Bölge: Aksiyon İkonları */}
                  <div className="relative flex shrink-0 items-start sm:items-center opacity-100 transition-opacity duration-200 sm:opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenDropdownId(openDropdownId === word.id ? null : word.id)
                      }}
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
        <WordForm onSave={onAddWord} words={words} />
      </aside>
      <EditWordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        word={editingWord}
        onUpdate={onUpdateWord}
      />
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deleteWordId) {
            onDeleteWord(deleteWordId)
            setDeleteWordId(null)
          }
          setIsDeleteModalOpen(false)
        }}
        itemName={editingWord ? editingWord.english : ''}
      />
      
      {/* Proof of Knowledge (PoK) Test Modalı */}
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
                
                // Test sonucunu analiz geçmişine ekle
                const newAnalysis = {
                  id: Date.now(),
                  date: new Date().toISOString(),
                  testedWords: testingWords.map(w => ({ 
                    id: w.id, 
                    english: w.english, 
                    turkish: w.turkish, 
                    score: scoreMap[w.id] || 0 
                  }))
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

      {/* Analizlerim Modalı */}
      {isAnalysesModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6" onClick={() => setIsAnalysesModalOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Cross Exam Analyses</h2>
                <p className="mt-1 text-sm text-slate-500">Your past test results and word success rates.</p>
              </div>
              <button onClick={() => setIsAnalysesModalOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
              {pokAnalyses.length === 0 ? (
                <div className="text-center py-10 text-slate-500">You don't have any saved exam analyses yet.</div>
              ) : (
                pokAnalyses.map(analysis => {
                  const avgScore = Math.round(analysis.testedWords.reduce((acc, w) => acc + w.score, 0) / analysis.testedWords.length) || 0;
                  return (
                    <div key={analysis.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold text-slate-700">{new Date(analysis.date).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={`font-bold px-3 py-1 rounded-full text-xs ${avgScore >= 80 ? 'bg-emerald-100 text-emerald-700' : avgScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>Average: {avgScore}%</span>
                      </div>
                      <div className="space-y-2 mt-4 border-t border-slate-200 pt-4">
                        {analysis.testedWords.map(w => (
                          <div key={w.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="font-bold text-slate-900">{w.english}</span>
                              <span className="text-slate-500 ml-2 text-sm">{w.turkish}</span>
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
