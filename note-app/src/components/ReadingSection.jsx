import { useMemo, useState } from 'react'
import useReadings from '../hooks/useReadings.js'
import ReadingView from './ReadingView.jsx'
import ActionsDropdown from './ActionsDropdown.jsx'
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx'
import useSavedCreations from '../hooks/useSavedCreations.js'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

const buildPrompt = (text, level) => `You are an IELTS/TOEFL reading comprehension test creator. 

Given the following text and proficiency level (${level}), create:
1. 5 multiple-choice questions (4 options each). Mark the correct answer index (0-3).
2. 5 true/false questions. Mark if the statement is true or false.
3. 5-8 advanced vocabulary words from the text with their Turkish meanings.

Format your response ONLY as valid JSON without any additional text:
{
  "questions": [
    { "id": "mc-0", "type": "multiple-choice", "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": 0 },
    { "id": "tf-0", "type": "true-false", "question": "...", "correctAnswer": true }
  ],
  "advancedVocab": [
    { "word": "example", "meaning": "örnek (Turkish)", "type": "noun" }
  ]
}

Text to analyze:
"${text}"`

const buildMockQuestions = (text) => {
  const sentences = text.split(/[.?!]\s*/).map((s) => s.trim()).filter(Boolean)
  const questions = []
  sentences.slice(0, 5).forEach((sentence, index) => {
    const excerpt = sentence.slice(0, 80).replace(/"/g, '')
    questions.push({
      id: `mc-${index}`, type: 'multiple-choice',
      question: `In the context of the passage, what is the most accurate interpretation of the following sentence? "${excerpt}..."`,
      options: ['A. It describes a general trend in the passage.', 'B. It provides a specific example supporting the main idea.', 'C. It draws a contrast between two viewpoints.', 'D. It introduces an unrelated detail.'],
      correctAnswer: 0,
    })
  })
  sentences.slice(5, 10).forEach((sentence, index) => {
    const excerpt = sentence.slice(0, 80).replace(/"/g, '')
    questions.push({
      id: `tf-${index}`, type: 'true-false',
      question: `The following statement is true according to the passage: "${excerpt}..."`,
      correctAnswer: true,
    })
  })
  const words = Array.from(new Set((text.match(/\b[a-zA-Z]{5,}\b/g) || []).map((w) => w.toLowerCase())))
  return { questions, advancedVocab: words.slice(0, 5).map((word) => ({ word, meaning: 'Türkçe anlamını buraya ekleyin', type: 'noun' })) }
}

export default function ReadingSection({ updateReading }) {
  const { readings, addReading, deleteReading } = useReadings()
  const { readingMaterials } = useSavedCreations()
  const [selectedId, setSelectedId] = useState(null)
  const [text, setText] = useState('')
  const [isSavedOpen, setIsSavedOpen] = useState(false)
  const [isLabOpen, setIsLabOpen] = useState(false)
  const [level, setLevel] = useState('B1')
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [deleteReadingId, setDeleteReadingId] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingReadingId, setEditingReadingId] = useState(null)
  const [editedText, setEditedText] = useState('')
  const [editedLevel, setEditedLevel] = useState('B1')
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedReading = readings.find(r => r.id === selectedId) || null

  const handleSave = async () => {
    if (!text.trim()) return
    setIsGenerating(true)

    const addFallback = (reason) => {
      console.warn('Falling back to local question generation:', reason)
      const content = buildMockQuestions(text)
      addReading({
        text,
        level,
        questions: content.questions,
        advancedVocab: content.advancedVocab,
      })
      setText('')
      setLevel('B1')
      setIsGenerating(false)
      alert('Gemini API failed. Local mock questions were used instead.')
    }

    try {
      const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt(text, level), expectJson: true })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) alert(data.error);
        throw new Error(data.error || 'AI Hatası');
      }
      
      const parsed = JSON.parse(data.content.replace(/```json/g, '').replace(/```/g, '').trim())

      addReading({
        text,
        level,
        questions: parsed.questions || [],
        advancedVocab: parsed.advancedVocab || [],
      })
      
      setText('')
      setLevel('B1')
    } catch (error) {
      console.error('Gemini API hata:', error)
      addFallback(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleCheckAnswers = () => {
    setShowResults(true)
  }

  const score = useMemo(() => {
    if (!selectedReading) return 0
    return (selectedReading.questions || []).reduce((total, question) => {
      const userAnswer = answers[question.id]
      if (userAnswer === undefined) return total
      return total + (userAnswer === question.correctAnswer ? 1 : 0)
    }, 0)
  }, [selectedReading, answers])

  // Eğer bir metin seçildiyse ReadingView'i göster
  if (selectedReading) {
    return (
      <ReadingView
        reading={selectedReading}
        onExit={() => setSelectedId(null)}
        onUpdate={updateReading}
        onDelete={(id) => {
          deleteReading(id)
          setSelectedId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6 font-sans text-zinc-900">
      
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400 eye-care:text-[#8C7A6B]">Reading Center</p>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Upload text and generate questions</h2>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isGenerating || !text.trim()}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isGenerating ? 'AI is Generating Questions...' : 'Save Text & Generate Questions'}
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <div className="w-full sm:w-1/3 lg:w-1/4">
              <label className="mb-2 block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Select Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3] eye-care:text-[#3B2F2F]"
              >
                {LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
          </div>
          <div className="w-full">
              <label className="mb-2 block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Reading Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows="14"
                placeholder="Paste reading text here..."
                className="w-full rounded-3xl border border-zinc-200 bg-white px-5 py-5 text-lg leading-relaxed text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B] custom-scrollbar"
              />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
          {/* Saved Articles Accordion */}
          <div className="mb-4">
            <button
              onClick={() => setIsSavedOpen(!isSavedOpen)}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100"
            >
              <span className="text-lg font-bold text-slate-900">Saved Readings <span className="ml-2 text-sm text-slate-500">({readings.length})</span></span>
              <svg className={`h-5 w-5 text-slate-500 transition-transform ${isSavedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isSavedOpen && (
              <div className="mt-4 animate-fade-in">
                {readings.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50 text-slate-500">
                    No reading articles added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readings.map((reading) => {
                      if (editingReadingId === reading.id) {
                        return (
                          <div key={reading.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                              <h3 className="text-lg font-semibold text-slate-950">Edit Text</h3>
                              <div className="flex gap-3">
                                <button onClick={() => { updateReading(reading.id, { text: editedText, level: editedLevel }); setEditingReadingId(null); }} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Save</button>
                                <button onClick={() => setEditingReadingId(null)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</button>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Level</label>
                                <select value={editedLevel} onChange={(e) => setEditedLevel(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200">
                                  {LEVELS.map(lvl => (<option key={lvl} value={lvl}>{lvl}</option>))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Reading Text</label>
                                <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} rows="6" className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200" placeholder="Edit text..."/>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={reading.id} onClick={() => { setSelectedId(reading.id); setAnswers({}); setShowResults(false); }} className="w-full rounded-3xl border px-4 py-4 text-left transition cursor-pointer border-slate-200 bg-white text-slate-950 hover:border-slate-300">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-semibold">{reading.level} Level</p>
                              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{reading.text}</p>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <ActionsDropdown
                                onEdit={() => { setEditedText(reading.text); setEditedLevel(reading.level); setEditingReadingId(reading.id); }}
                                onDelete={() => { setDeleteReadingId(reading.id); setIsDeleteModalOpen(true); }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* My Lab Creations Accordion */}
          <div>
            <button
              onClick={() => setIsLabOpen(!isLabOpen)}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100"
            >
              <span className="text-lg font-bold text-indigo-700 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                My Lab Creations <span className="ml-2 text-sm text-indigo-400">({readingMaterials.length})</span>
              </span>
              <svg className={`h-5 w-5 text-indigo-400 transition-transform ${isLabOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {isLabOpen && (
              <div className="mt-4 animate-fade-in">
                {readingMaterials.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50 text-slate-500">
                    No reading materials in your lab archive yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readingMaterials.map((material) => (
                      <div key={material.id} className="group rounded-3xl border border-indigo-100 bg-indigo-50/30 p-4 transition hover:border-indigo-300 hover:bg-indigo-50">
                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-lg bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">{material.type}</span>
                              <span className="text-sm font-medium text-slate-900">{material.title || 'Untitled Text'}</span>
                            </div>
                            <p className="line-clamp-2 text-sm text-slate-600">{material.text || material.content}</p>
                          </div>
                          <button
                            onClick={() => { setText(material.text || material.content || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="whitespace-nowrap rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                          >
                            Generate Questions
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {selectedReading && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-slate-950">Sorular</h3>
              <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                Skor: {showResults ? `${score} / ${selectedReading.questions.length}` : '—'}
              </span>
            </div>

            <div className="space-y-6">
              {selectedReading.questions.map((question) => (
                <div key={question.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 font-semibold text-slate-900">{question.question}</p>

                  {question.type === 'multiple-choice' ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, index) => {
                        const isSelected = answers[question.id] === index
                        const isCorrect = showResults && index === question.correctAnswer
                        const isWrong = showResults && isSelected && index !== question.correctAnswer
                        const baseClasses = 'rounded-3xl border px-4 py-3 text-left transition'
                        const stateClasses = isCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : isWrong
                          ? 'border-rose-300 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 text-slate-900'

                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAnswer(question.id, index)}
                            disabled={showResults}
                            className={`${baseClasses} ${stateClasses}`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {['True', 'False'].map((option, index) => {
                        const isSelected = answers[question.id] === (index === 0)
                        const isCorrect = showResults && (index === 0) === question.correctAnswer
                        const isWrong = showResults && isSelected && (index === 0) !== question.correctAnswer
                        const baseClasses = 'rounded-3xl border px-5 py-3 text-sm font-semibold transition'
                        const stateClasses = isCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : isWrong
                          ? 'border-rose-300 bg-rose-50 text-rose-900'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100 text-slate-900'

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleAnswer(question.id, index === 0)}
                            disabled={showResults}
                            className={`${baseClasses} ${stateClasses}`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3">
                {!showResults ? (
                  <button
                    type="button"
                    onClick={handleCheckAnswers}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Cevapları Kontrol Et
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswers({})
                      setShowResults(false)
                    }}
                    className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Tekrar Çöz
                  </button>
                )}
              </div>
            </div>

            {selectedReading.advancedVocab?.length > 0 && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Advanced Vocabulary</p>
                <div className="flex flex-wrap gap-2">
                  {selectedReading.advancedVocab.map((vocab, index) => (
                    <span key={index} className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800">
                      {vocab.word || vocab}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deleteReadingId) {
            deleteReading(deleteReadingId)
            setDeleteReadingId(null)
          }
          setIsDeleteModalOpen(false)
        }}
        itemName="Bu okuma metni"
        customMessage="Bu okuma parçasını ve tüm sorularını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </div>
  )
}
