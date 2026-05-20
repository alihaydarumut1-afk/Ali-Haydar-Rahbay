import { useMemo, useState } from 'react'
import { Plus, Save, RotateCcw, Trash2, BookOpen, PenTool, CheckCircle, FileText } from 'lucide-react'
import useWords from '../hooks/useWords.js'
import useWritingHabits from '../hooks/useWritingHabits.js'
import UniversalFocusMode from './UniversalFocusMode.jsx'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

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
    body: JSON.stringify({ prompt, expectJson, maxTokens: 1500, apiKey: getUserApiKey() })
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
  const isIELTS = examType.includes('IELTS')

  const prompt = `You are a strict, professional ${examType} examiner. Evaluate the following essay using the official ${examType} writing rubric.

Essay Topic: "${topic}"

Student Essay:
"${essay}"

SCORING RULES — Follow official rubric precisely:
${isIELTS ? `- Task Response (Band 1-9): Does the essay fully address all parts of the task? Is the position clear and well-developed?
- Coherence & Cohesion (Band 1-9): Is the essay logically organized? Are cohesive devices used effectively?
- Lexical Resource (Band 1-9): Range and accuracy of vocabulary. Are words used appropriately?
- Grammatical Range & Accuracy (Band 1-9): Range of structures, frequency of errors.
- Overall Band Score: Mean of 4 criteria, rounded to nearest 0.5 (e.g. 6.0, 6.5, 7.0).` : `- Task Response (0-5): Does it answer the prompt fully?
- Development & Organization (0-5): Is the essay well-structured with clear paragraphs?
- Lexical Resource (0-5): Range and accuracy of vocabulary.
- Grammatical Range & Accuracy (0-5): Range of structures, frequency of errors.
- Overall Score: Sum of 4 criteria out of 20.`}

Respond ONLY with a valid JSON object, no markdown, no extra text:
{
  "estimated_score": "${isIELTS ? 'IELTS Band 6.5' : 'TOEFL 16/20'}",
  "band_breakdown": {
    ${isIELTS ? `"task_response": 6.5,
    "coherence_cohesion": 6.0,
    "lexical_resource": 6.5,
    "grammatical_range": 6.0` : `"task_response": 4,
    "development_organization": 3,
    "lexical_resource": 4,
    "grammatical_range": 3`}
  },
  "overall_feedback": "2-3 sentence summary: what was done well and the primary weakness.",
  "task_response_feedback": "Specific feedback on how well the task/prompt was addressed. Quote from the essay.",
  "coherence_feedback": "Specific feedback on structure, paragraphing, and linking words used or missing.",
  "grammar_analysis": "Quote 2-3 actual errors from the essay with corrections and rule explanations.",
  "lexical_feedback": "Quote weak word choices. Suggest 2-3 advanced alternatives with context.",
  "structure_tips": "One concrete tip to improve essay organization or argument development.",
  "vocabulary_suggestions": [{"used": "simple word from essay", "better": "advanced C1 word", "type": "Noun|Verb|Adjective|Phrasal Verb", "meaning": "Turkish meaning", "example": "Example sentence using the better word"}]
}`

  const rawText = await fetchAI(prompt, false)
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('JSON bulunamadı')
  } catch (e) {
    throw new Error('Değerlendirme verisi ayrıştırılamadı.')
  }
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
    if (isDuplicate) return alert("This word is already in your list!");

    let wordType = mapPartOfSpeech(v.type);
    let meaning = v.meaning;
    let example = v.example;

    if (!v.type || !v.meaning || !v.example) {
      setEnrichingWord(v.better);
      try {
        const prompt = `Analyze the English word "${v.better}". Return ONLY valid JSON with no markdown: {"type": "Noun|Verb|Adjective|Phrasal Verb|Other", "meaning": "Turkish meaning", "example": "An English example sentence"}`;
        const rawText = await fetchAI(prompt, false);
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          const enriched = JSON.parse(match[0]);
          wordType = mapPartOfSpeech(enriched.type);
          meaning = enriched.meaning || meaning;
          example = enriched.example || example;
        }
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

  const isIELTS = examType.includes('IELTS')

  const bandCriteria = isIELTS ? [
    { key: 'task_response', label: 'Task Response', icon: '📝', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-900/20', darkBorder: 'dark:border-indigo-800/50', darkText: 'dark:text-indigo-400', feedbackKey: 'task_response_feedback' },
    { key: 'coherence_cohesion', label: 'Coherence & Cohesion', icon: '🔗', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/20', darkBorder: 'dark:border-emerald-800/50', darkText: 'dark:text-emerald-400', feedbackKey: 'coherence_feedback' },
    { key: 'lexical_resource', label: 'Lexical Resource', icon: '📚', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', darkBg: 'dark:bg-sky-900/20', darkBorder: 'dark:border-sky-800/50', darkText: 'dark:text-sky-400', feedbackKey: 'lexical_feedback' },
    { key: 'grammatical_range', label: 'Grammar Range', icon: '✍️', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', darkBg: 'dark:bg-rose-900/20', darkBorder: 'dark:border-rose-800/50', darkText: 'dark:text-rose-400', feedbackKey: 'grammar_analysis' },
  ] : [
    { key: 'task_response', label: 'Task Response', icon: '📝', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', darkBg: 'dark:bg-indigo-900/20', darkBorder: 'dark:border-indigo-800/50', darkText: 'dark:text-indigo-400', feedbackKey: 'task_response_feedback' },
    { key: 'development_organization', label: 'Development & Organization', icon: '🔗', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/20', darkBorder: 'dark:border-emerald-800/50', darkText: 'dark:text-emerald-400', feedbackKey: 'coherence_feedback' },
    { key: 'lexical_resource', label: 'Lexical Resource', icon: '📚', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', darkBg: 'dark:bg-sky-900/20', darkBorder: 'dark:border-sky-800/50', darkText: 'dark:text-sky-400', feedbackKey: 'lexical_feedback' },
    { key: 'grammatical_range', label: 'Grammar Range', icon: '✍️', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', darkBg: 'dark:bg-rose-900/20', darkBorder: 'dark:border-rose-800/50', darkText: 'dark:text-rose-400', feedbackKey: 'grammar_analysis' },
  ]

  return (
    <div className="space-y-8 font-sans text-slate-900">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT PANEL */}
        <section className="flex flex-col gap-6">
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

          <div className="flex flex-col flex-1 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Your Essay</h2>
              <span className={`rounded-lg px-3 py-1 text-xs font-bold ${wordCount < (isIELTS ? 250 : 300) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {wordCount} words {isIELTS ? '(min 250)' : '(min 300)'}
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

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-6">
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
              <div className="space-y-5 animate-fade-in">

                {/* Score Badge */}
                <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner shrink-0">
                    <span className="text-lg font-black">🎓</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{aiFeedback.estimated_score}</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Official {isIELTS ? 'IELTS' : 'TOEFL'} Examiner Score</p>
                  </div>
                </div>

                {/* Band Breakdown Grid */}
                {aiFeedback.band_breakdown && (
                  <div className="grid grid-cols-2 gap-3">
                    {bandCriteria.map(({ key, label, icon, bg, border, text, darkBg, darkBorder, darkText }) => (
                      <div key={key} className={`rounded-2xl ${bg} ${border} ${darkBg} ${darkBorder} border p-3 text-center`}>
                        <div className="text-xl mb-1">{icon}</div>
                        <div className={`text-2xl font-black ${text} ${darkText}`}>
                          {aiFeedback.band_breakdown[key] ?? '—'}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wide ${text} ${darkText} mt-1 opacity-80 leading-tight`}>
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overall Feedback — 🔴 DÜZELTİLDİ */}
                <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-5">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-400 mb-2 flex items-center gap-2"><CheckCircle size={16} /> Overall Feedback</h4>
                  <p className="text-sm text-slate-900 dark:text-zinc-100 leading-relaxed font-semibold">{aiFeedback.overall_feedback}</p>
                </div>

                {/* Criterion-specific feedback cards — 🔴 DÜZELTİLDİ */}
                {bandCriteria.map(({ key, label, icon, bg, border, text, darkBg, darkBorder, darkText, feedbackKey }) => (
                  aiFeedback[feedbackKey] && (
                    <div key={key} className={`rounded-2xl ${bg} ${border} ${darkBg} ${darkBorder} border p-5`}>
                      <h4 className={`font-bold ${text} ${darkText} mb-2 flex items-center gap-2`}>
                        <span>{icon}</span> {label}
                        {aiFeedback.band_breakdown?.[key] && (
                          <span className={`ml-auto text-sm font-black ${text} ${darkText}`}>
                            {isIELTS ? `Band ${aiFeedback.band_breakdown[key]}` : `${aiFeedback.band_breakdown[key]}/5`}
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-900 dark:text-zinc-100 leading-relaxed font-semibold">{aiFeedback[feedbackKey]}</p>
                    </div>
                  )
                ))}

                {/* Structure Tips — 🔴 DÜZELTİLDİ */}
                {aiFeedback.structure_tips && (
                  <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                    <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-2 flex items-center gap-2"><FileText size={16} /> Structure Tips</h4>
                    <p className="text-sm text-slate-900 dark:text-zinc-100 leading-relaxed font-semibold">{aiFeedback.structure_tips}</p>
                  </div>
                )}

                {/* Vocabulary Upgrades */}
                {aiFeedback.vocabulary_suggestions && aiFeedback.vocabulary_suggestions.length > 0 && (
                  <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-5">
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-400 mb-4 flex items-center gap-2"><Plus size={16} /> Vocabulary Upgrades</h4>
                    <div className="space-y-3">
                      {aiFeedback.vocabulary_suggestions.map((v, i) => {
                        const isWordAdded = addedWords[v.better] || words.some(w => w.english.toLowerCase() === v.better.toLowerCase());
                        return (
                          <div key={i} className="flex flex-col gap-2 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-emerald-100 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-500 line-through truncate">{v.used}</span>
                              <span className="text-slate-300">→</span>
                              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{v.better}</span>
                            </div>
                            {(v.meaning || v.example) && (
                              <div className="mt-1 flex flex-col gap-1 text-sm">
                                {/* 🔴 DÜZELTİLDİ: Türkçe anlam ve örnek cümle koyu renk */}
                                {v.meaning && <p className="text-slate-900 dark:text-zinc-100 font-semibold"><span className="font-bold">Meaning:</span> {v.meaning}</p>}
                                {v.example && <p className="italic text-slate-800 dark:text-zinc-200 font-medium"><span className="font-bold not-italic">Ex:</span> "{v.example}"</p>}
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
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
            <button
              onClick={() => setIsSavedOpen(!isSavedOpen)}
              className="flex w-full items-center justify-between rounded-2xl bg-slate-50 dark:bg-zinc-900 px-5 py-4 text-left transition hover:bg-slate-100"
            >
              <span className="text-lg font-bold text-slate-900 dark:text-zinc-50">Saved Writings <span className="ml-2 text-sm text-slate-500">({writings.length})</span></span>
              <svg className={`h-5 w-5 text-slate-500 transition-transform ${isSavedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isSavedOpen && (
              <div className="mt-4 animate-fade-in">
                {writings.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No essays saved yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {writings.map((entry) => (
                      <div key={entry.id} onClick={() => handleLoadWriting(entry)} className={`group cursor-pointer rounded-2xl border p-4 transition-all ${selectedId === entry.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 bg-white dark:bg-zinc-800 hover:border-indigo-300'}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">{entry.mode || 'IELTS'}</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{entry.analysis?.estimated_score || 'Not Scored'}</span>
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