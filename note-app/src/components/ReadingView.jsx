import { useMemo, useState } from 'react'
import UniversalFocusMode from './UniversalFocusMode.jsx'

// Metin içindeki kelimeleri vurgulama fonksiyonu
function highlightVocabulary(text, vocabulary) {
  if (!vocabulary || !vocabulary.length) return text

  const vocabWords = vocabulary
    .map(v => (typeof v === 'string' ? v : v?.word))
    .filter(Boolean)
    .map(w => w.toLowerCase())

  if (!vocabWords.length) return text

  const regex = new RegExp(`\\b(${vocabWords.join('|')})\\b`, 'gi')

  return text.replace(regex, (match) => {
    return `<span class="font-bold text-blue-600">${match}</span>`
  })
}

export default function ReadingView({ reading, onExit, onUpdate, onDelete }) {
  const [answers, setAnswers] = useState({})
  const [showResults, setShowResults] = useState(false)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editedText, setEditedText] = useState(reading.text)
  const [editedQuestions, setEditedQuestions] = useState(reading.questions)
  const [isZenModeOpen, setIsZenModeOpen] = useState(false)

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleCheckAnswers = () => {
    setShowResults(true)
  }

  const score = useMemo(() => {
    return (reading.questions || []).reduce((total, question) => {
      const userAnswer = answers[question.id]
      if (userAnswer === undefined) return total
      return total + (userAnswer === question.correctAnswer ? 1 : 0)
    }, 0)
  }, [reading.questions, answers])

  const highlightedText = useMemo(() => {
    return highlightVocabulary(reading.text, reading.advancedVocab)
  }, [reading.text, reading.advancedVocab])

  return (
    <div className="min-h-screen animate-fade-in pb-24 bg-slate-50">
      {/* Header */}
      <div className="mx-auto max-w-4xl w-full pt-8 pb-4 px-6 sm:px-0">
        <button
          onClick={onExit}
          className="flex w-fit items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition mb-6"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Articles
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reading Exercise</h1>
            <p className="text-sm font-semibold text-slate-500 mt-2">{reading.level} Level • {reading.questions.length} Questions</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsZenModeOpen(true)}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              📖 Focus Mode
            </button>
            <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">
              Score: {showResults ? `${score} / ${reading.questions.length}` : '—'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditingText(!isEditingText)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {isEditingText ? 'Done Editing' : 'Edit Text'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this reading text?')) {
                  onDelete(reading.id)
                }
              }}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Focused Center Column */}
      <div className="mx-auto max-w-4xl w-full mt-6 space-y-12 px-6 sm:px-0">
        
        {/* Reading Text Container */}
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 sm:p-14 shadow-sm">
          {isEditingText && (
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900">Editing Mode</h2>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(reading.id, { text: editedText })
                    setIsEditingText(false)
                  }}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Save Text
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedText(reading.text)
                    setEditedQuestions(reading.questions)
                    setIsEditingText(false)
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {isEditingText ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[500px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-6 font-serif text-lg leading-loose outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          ) : (
            <div
              className="font-serif text-[19px] leading-[2.2] text-zinc-800 dark:text-zinc-200 eye-care:text-sepia-text whitespace-pre-wrap selection:bg-indigo-100"
              dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
          )}
        </div>

        {/* Advanced Vocabulary Panel */}
        {reading.advancedVocab?.length > 0 && (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
            <h3 className="mb-6 text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Advanced Vocabulary</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reading.advancedVocab.map((vocab, index) => (
                <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-indigo-700 text-lg capitalize">{typeof vocab === 'string' ? vocab : vocab.word}</span>
                    {typeof vocab !== 'string' && vocab.type && (
                      <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                        {vocab.type}
                      </span>
                    )}
                  </div>
                  {typeof vocab !== 'string' && vocab.meaning && <p className="text-sm font-medium text-slate-600">{vocab.meaning}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions Area */}
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
            <h2 className="text-2xl font-black text-slate-900">Comprehension Questions</h2>
            {isEditingText && (
              <button onClick={() => { onUpdate(reading.id, { questions: editedQuestions }); setIsEditingText(false); }} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
                Save Questions
              </button>
            )}
          </div>
          
          <div className="space-y-8">
            {(isEditingText ? editedQuestions : reading.questions || []).map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-6 sm:p-8">
                {isEditingText ? (
                  <div className="space-y-5">
                     <label className="block text-sm font-bold text-slate-700">Question {index + 1}</label>
                     <textarea value={question.question} onChange={e => { const n = [...editedQuestions]; n[index].question = e.target.value; setEditedQuestions(n) }} className="w-full rounded-xl p-4 border border-slate-200 bg-white outline-none" rows="2" />
                     {question.type === 'multiple-choice' && (
                       <div className="space-y-3 mt-4">
                         {question.options.map((opt, oIdx) => (
                           <div key={oIdx} className="flex gap-3 items-center">
                             <input type="radio" className="h-5 w-5" checked={question.correctAnswer === oIdx} onChange={() => { const n = [...editedQuestions]; n[index].correctAnswer = oIdx; setEditedQuestions(n) }} />
                             <input value={opt} onChange={e => { const n = [...editedQuestions]; n[index].options[oIdx] = e.target.value; setEditedQuestions(n) }} className="flex-1 rounded-xl p-3 border border-slate-200 bg-white outline-none" />
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                ) : (
                  <>
                    <div className="mb-6 flex items-start gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 shadow-inner mt-0.5">
                        {index + 1}
                      </span>
                      <p className="font-bold text-lg text-slate-900 leading-relaxed">{question.question}</p>
                    </div>

                    {question.type === 'multiple-choice' ? (
                      <div className="ml-0 sm:ml-12 grid gap-3 sm:grid-cols-2">
                        {(question.options || []).map((option, optionIndex) => {
                          const isSelected = answers[question.id] === optionIndex
                          const isCorrect = showResults && optionIndex === question.correctAnswer
                          const isWrong = showResults && isSelected && optionIndex !== question.correctAnswer
                          const baseClasses = 'rounded-2xl border px-6 py-4 text-left text-[15px] font-medium transition-all duration-200'
                          const stateClasses = isCorrect
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/50'
                            : isWrong
                            ? 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-400/50'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'

                          return (
                            <button
                              key={optionIndex}
                              onClick={() => handleAnswer(question.id, optionIndex)}
                              disabled={showResults}
                              className={`${baseClasses} ${stateClasses}`}
                            >
                              <span className="font-bold mr-2 opacity-70">{String.fromCharCode(65 + optionIndex)}.</span> {option.replace(/^[A-D]\.\s*/, '')}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="ml-0 sm:ml-12 flex flex-wrap gap-4">
                        {['True', 'False'].map((option, optionIndex) => {
                          const isSelected = answers[question.id] === (optionIndex === 0)
                          const isCorrect = showResults && (optionIndex === 0) === question.correctAnswer
                          const isWrong = showResults && isSelected && (optionIndex === 0) !== question.correctAnswer
                          const baseClasses = 'rounded-2xl border px-10 py-4 text-base font-bold transition-all duration-200'
                          const stateClasses = isCorrect
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/50'
                            : isWrong
                            ? 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-400/50'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'

                          return (
                            <button
                              key={option}
                              onClick={() => handleAnswer(question.id, optionIndex === 0)}
                              disabled={showResults}
                              className={`${baseClasses} ${stateClasses}`}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-end gap-4 border-t border-slate-100 pt-8">
            {!showResults ? (
              <button onClick={handleCheckAnswers} className="rounded-2xl bg-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:-translate-y-1">
                Submit Answers
              </button>
            ) : (
              <button onClick={() => { setAnswers({}); setShowResults(false); window.scrollTo({top: 0, behavior: 'smooth'}) }} className="rounded-2xl border border-slate-200 bg-white px-8 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:-translate-y-1">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>

    <UniversalFocusMode
      isOpen={isZenModeOpen}
      content={reading.text}
      title={`${reading.level} Seviye Okuma Metni`}
      onClose={() => setIsZenModeOpen(false)}
      mode="read"
    />
    </div>
  )
}
