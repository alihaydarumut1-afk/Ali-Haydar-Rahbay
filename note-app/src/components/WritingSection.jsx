import { useMemo, useState } from 'react'
import { Plus, Save, RotateCcw, Trash2, BookOpen, PenTool, CheckCircle, FileText } from 'lucide-react'
import useWords from '../hooks/useWords.js'
import useWritingHabits from '../hooks/useWritingHabits.js'
import UniversalFocusMode from './UniversalFocusMode.jsx'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

// Yapay zekadan dönen kelime türünü WordList sekmeleriyle tam eşleştiren güvenli filtreleyici
const mapPartOfSpeech = (pos) => {
  if (!pos) return 'Other'
  const lower = String(pos).toLowerCase()
  if (lower.includes('phrasal') || lower.includes('verb phrase')) return 'Phrasal Verb'
  if (lower.includes('verb')) return 'Verb'
  if (lower.includes('adj')) return 'Adjective'
  if (lower.includes('noun')) return 'Noun'
  return 'Other'
}

async function fetchAI(prompt, expectJson = false) {
  const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, expectJson, maxTokens: 1500 })
  });
  
  const textRaw = await response.text();
  let data;
  try {
    data = textRaw ? JSON.parse(textRaw) : {};
  } catch (err) {
    throw new Error('Sunucu boş veya geçersiz yanıt döndürdü');
  }

  if (!response.ok) {
    if (response.status === 429) alert(data.error);
    throw new Error(data.error || 'AI Hatası');
  }
  if (expectJson) {
    try {
      let cleanJson = data.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleanJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (match) cleanJson = match[0];
      return JSON.parse(cleanJson);
    } catch (e) {
      throw new Error('Yapay zeka eksik veya hatalı veri döndürdü.');
    }
  }
  return data.content;
}

async function evaluateEssayWithAI(essay, topic, examType) {
  const prompt = `You are an official ${examType} examiner. Evaluate the following essay written by a B1-B2 level student. The essay topic was: '${topic}'. The student's essay is: '${essay}'.
  Evaluate strictly based on the official ${examType} rubrics (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
  You MUST output a valid JSON with this exact structure:
  {
    "estimated_score": "Band 6.5 (for IELTS) or 22/30 (for TOEFL)",
    "overall_feedback": "A short paragraph summarizing strengths and weaknesses",
    "grammar_analysis": "Specific grammatical corrections",
    "vocabulary_suggestions": [{"used": "bad word", "better": "advanced word", "type": "Noun|Verb|Adjective|Phrasal Verb", "meaning": "Turkish meaning", "example": "English example sentence"}],
    "structure_tips": "Advice on paragraphing and cohesion"
  }`
  return await fetchAI(prompt, true)
}

export default function WritingSection() {
  const { writings, addWriting, updateWriting, removeWriting } = useWritingHabits()
  const { words = [], addWord } = useWords() || {}
  
  const [examType, setExamType] = useState('IELTS Academic (Task 2)')
  const [generatedTopic, setGeneratedTopic] = useState('')
  const [userEssay, setUserEssay] = useState('')
  const [aiFeedback, setAiFeedback] = useState(null)
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [isZenModeOpen, setIsZenModeOpen] = useState(false)
  const [addedWords, setAddedWords] = useState({})
  const [enrichingWord, setEnrichingWord] = useState(null)
  const [isSavedOpen, setIsSavedOpen] = useState(false)

  const selectedWriting = useMemo(
    () => writings.find((entry) => entry.id === selectedId) || null,
    [selectedId, writings]
  )

  const wordCount = useMemo(() => {
    return userEssay.trim() ? userEssay.trim().split(/\s+/).length : 0
  }, [userEssay])

  const handleGenerateTopic = async () => {
    setIsGeneratingTopic(true)
    try {
      const prompt = `You are an expert English examiner. Generate a single, highly realistic essay topic for the ${examType} exam. The difficulty should be suitable for a B1-B2 level English learner. Return ONLY the topic text, nothing else.`
      const result = await fetchAI(prompt, false)
      setGeneratedTopic(result.trim())
      setUserEssay('')
      setAiFeedback(null)
      setSelectedId(null)
    } catch (err) {
      alert("Failed to generate topic. Please try again.")
    } finally {
      setIsGeneratingTopic(false)
    }
  }

  const handleEvaluateEssay = async () => {
    if (!userEssay.trim() || !generatedTopic.trim()) {
      return alert("Please generate a topic and write your essay first.")
    }
    setIsEvaluating(true)
    try {
      const result = await evaluateEssayWithAI(userEssay, generatedTopic, examType)
      setAiFeedback(result)
      addWriting({ text: userEssay, analysis: result, mode: examType, topic: generatedTopic })
      setSelectedId(null)
    } catch (error) {
      alert('An error occurred during evaluation.')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleLoadWriting = (entry) => {
    setUserEssay(entry.text || '')
    setAiFeedback(entry.analysis || null)
    setExamType(entry.mode || 'IELTS Academic (Task 2)')
    setGeneratedTopic(entry.topic || '')
    setSelectedId(entry.id)
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this essay record?')) return
    removeWriting(id)
    if (selectedId === id) {
      setSelectedId(null)
      setAiFeedback(null)
      setUserEssay('')
      setGeneratedTopic('')
    }
  }

  const handleUpdate = async () => {
    if (!selectedWriting) return
    setIsEvaluating(true)
    try {
      const updatedAnalysis = await evaluateEssayWithAI(userEssay, generatedTopic, examType)
      updateWriting(selectedWriting.id, { text: userEssay, analysis: updatedAnalysis, mode: examType, topic: generatedTopic })
      setAiFeedback(updatedAnalysis)
      alert('Your essay and evaluation have been updated successfully.')
    } catch (error) {
      alert('An error occurred during the update.')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleAddSuggestedWord = async (v) => {
    const isDuplicate = words.some(w => w.english.toLowerCase() === v.better.toLowerCase());
    if (isDuplicate) {
      return alert("This word is already in your list!");
    }

    let wordType = mapPartOfSpeech(v.type);
    let meaning = v.meaning;
    let example = v.example;

    if (!v.type || !v.meaning || !v.example) {
      setEnrichingWord(v.better);
      try {
        const prompt = `Analyze the English word "${v.better}". Return ONLY valid JSON with no markdown: {"type": "Noun|Verb|Adjective|Phrasal Verb|Other", "meaning": "Turkish meaning", "example": "An English example sentence"}`;
        const enriched = await fetchAI(prompt, true);
        wordType = mapPartOfSpeech(enriched.type);
        meaning = enriched.meaning || meaning;
        example = enriched.example || example;
      } catch (e) {
        console.error("Enrichment failed", e);
      } finally {
        setEnrichingWord(null);
      }
    }

    if (addWord) {
      addWord({
        english: v.better,
        turkish: meaning || 'N/A',
        type: wordType,
        sentence: example || `Instead of using "${v.used}", I can use "${v.better}".`,
        collocation: '',
        ipa: ''
      });
    } else {
      const current = JSON.parse(localStorage.getItem('word-book-entries') || '[]');
      const newEntry = {
        id: Date.now().toString(),
        english: v.better,
        turkish: meaning || 'N/A',
        type: wordType,
        sentence: example || `Instead of using "${v.used}", I can use "${v.better}".`,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('word-book-entries', JSON.stringify([newEntry, ...current]));
      window.dispatchEvent(new Event('words-updated'));
    }
    setAddedWords(prev => ({ ...prev, [v.better]: true }));
  }

  return (
    <div className="space-y-8 font-sans text-slate-900">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT PANEL - Editor & Setup */}
        <section className="flex flex-col gap-6">
          {/* Setup Card */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">AI Exam Simulator</p>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F] mt-1">Writing Lab</h2>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Exam Type</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                  <button 
                    onClick={() => setExamType('IELTS Academic (Task 2)')} 
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${examType === 'IELTS Academic (Task 2)' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    IELTS Academic
                  </button>
                  <button 
                    onClick={() => setExamType('TOEFL iBT (Independent)')} 
                    className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${examType === 'TOEFL iBT (Independent)' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    TOEFL iBT
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Topic Generator</label>
                <button 
                  onClick={handleGenerateTopic} 
                  disabled={isGeneratingTopic} 
                  className="flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {isGeneratingTopic ? <RotateCcw size={16} className="animate-spin" /> : <FileText size={16} />}
                  {isGeneratingTopic ? 'Generating...' : 'Generate Random Topic'}
                </button>
              </div>

              {generatedTopic && (
                <div className="mt-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 p-5 animate-fade-in">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Assigned Topic</p>
                  <p className="text-indigo-950 font-medium leading-relaxed">{generatedTopic}</p>
                </div>
              )}
            </div>
          </div>

          {/* Editor Card */}
          <div className="flex flex-col flex-1 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Your Essay</h2>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {wordCount} words
              </span>
            </div>

            <textarea
              value={userEssay}
              onChange={(e) => setUserEssay(e.target.value)}
              rows="16"
              placeholder="Start writing your essay here..."
              className="w-full flex-1 resize-none rounded-2xl border-2 border-zinc-200 bg-white p-5 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B] custom-scrollbar"
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsZenModeOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <BookOpen size={16} /> Focus Mode
              </button>
              
              <div className="flex items-center gap-3">
                {selectedId && (
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isEvaluating || !userEssay.trim()}
                    className="flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Save size={16} /> Update Saved
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleEvaluateEssay}
                  disabled={isEvaluating || !userEssay.trim() || !generatedTopic.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {isEvaluating ? <RotateCcw size={16} className="animate-spin" /> : <PenTool size={16} />}
                  {isEvaluating ? 'Evaluating...' : 'Submit for Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL - Report & History */}
        <div className="flex flex-col gap-6">
          {/* Report Card */}
          <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Evaluation Report</h2>
            </div>

            {isEvaluating ? (
              <div className="flex flex-col items-center justify-center py-16 animate-pulse">
                <RotateCcw size={32} className="text-indigo-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-500 text-center px-6">AI is reading and grading your essay based on official rubrics...</p>
              </div>
            ) : aiFeedback ? (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner">
                    <span className="text-lg font-black">{String(aiFeedback.estimated_score).replace(/[^0-9.]/g, '') || '-'}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{aiFeedback.estimated_score}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Estimated Score</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-5">
                  <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><CheckCircle size={16} /> Overall Feedback</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{aiFeedback.overall_feedback}</p>
                </div>

                <div className="rounded-2xl bg-rose-50/50 border border-rose-100 p-5">
                  <h4 className="font-bold text-rose-900 mb-2 flex items-center gap-2"><PenTool size={16} /> Grammar Analysis</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{aiFeedback.grammar_analysis}</p>
                </div>

                <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                  <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2"><FileText size={16} /> Structure Tips</h4>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{aiFeedback.structure_tips}</p>
                </div>

                {aiFeedback.vocabulary_suggestions && aiFeedback.vocabulary_suggestions.length > 0 && (
                  <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-5">
                    <h4 className="font-bold text-emerald-900 mb-4 flex items-center gap-2"><Plus size={16} /> Vocabulary Upgrades</h4>
                    <div className="space-y-3">
                      {aiFeedback.vocabulary_suggestions.map((v, i) => {
                        const isWordAdded = addedWords[v.better] || words.some(w => w.english.toLowerCase() === v.better.toLowerCase());
                        return (
                        <div key={i} className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-500 line-through truncate">{v.used}</span>
                            <span className="text-slate-300">→</span>
                            <span className="text-base font-bold text-emerald-700">{v.better}</span>
                          </div>
                          {(v.meaning || v.example) && (
                            <div className="mt-1 flex flex-col gap-1 text-sm text-slate-600">
                              {v.meaning && <p><span className="font-semibold">Meaning:</span> {v.meaning}</p>}
                              {v.example && <p className="italic"><span className="font-semibold not-italic">Ex:</span> "{v.example}"</p>}
                            </div>
                          )}
                          <button 
                            onClick={() => handleAddSuggestedWord(v)} 
                            disabled={isWordAdded || enrichingWord === v.better} 
                            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${isWordAdded ? 'bg-emerald-500 text-white cursor-not-allowed' : enrichingWord === v.better ? 'bg-emerald-200 text-emerald-800 cursor-wait' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                          >
                            {isWordAdded ? 'Added to List ✓' : enrichingWord === v.better ? 'Fixing & Adding...' : '+ Add to List'}
                          </button>
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Submit your essay to see detailed evaluation and estimated scores.</p>
              </div>
            )}
          </aside>

          {/* History Card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <button
              onClick={() => setIsSavedOpen(!isSavedOpen)}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100"
            >
              <span className="text-lg font-bold text-slate-900">Saved Writings <span className="ml-2 text-sm text-slate-500">({writings.length})</span></span>
              <svg className={`h-5 w-5 text-slate-500 transition-transform ${isSavedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isSavedOpen && (
              <div className="mt-4 animate-fade-in">
                {writings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No essays saved yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {writings.map((entry) => (
                      <div key={entry.id} onClick={() => handleLoadWriting(entry)} className={`group cursor-pointer rounded-2xl border p-4 transition-all ${selectedId === entry.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">{entry.mode || 'IELTS'}</span>
                            <span className="font-bold text-slate-800">{entry.analysis?.estimated_score ? entry.analysis.estimated_score.match(/\d+(\.\d+)?/)?.[0] || 'Scored' : 'Not Scored'}</span>
                          </div>
                          <button type="button" onClick={(e) => handleDelete(entry.id, e)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600" title="Delete"><Trash2 size={16} /></button>
                        </div>
                        <p className="text-xs font-bold text-indigo-600 mb-1 line-clamp-1">{entry.topic || 'Custom Topic'}</p>
                        <p className="line-clamp-2 text-xs text-slate-500 font-medium">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <UniversalFocusMode
        isOpen={isZenModeOpen}
        onClose={() => setIsZenModeOpen(false)}
        content={userEssay}
        mode="write"
        onChange={setUserEssay}
      />
    </div>
  )
}
