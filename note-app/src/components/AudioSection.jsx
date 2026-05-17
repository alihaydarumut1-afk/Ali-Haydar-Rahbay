import { useEffect, useMemo, useRef, useState } from 'react'
import useAudioFiles from '../hooks/useAudioFiles.js'
import useAudioStorage from './useAudioStorage.js'
import useWords from '../hooks/useWords.js'

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

async function transcribeAudioWithAI(blob) {
  const base64Audio = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(blob)
  })
  const response = await fetch(`${getBaseUrl()}/api/ai/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type, apiKey: getUserApiKey() })
  })

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
    throw new Error(data.error || 'Transcription Hatası');
  }
  return data.text;
}

// Yapay zekadan dönen kelime türünü uygulamanın kategorilerine uyduran yardımcı fonksiyon
const mapPartOfSpeech = (pos) => {
  if (!pos) return 'Other'
  const lower = pos.toLowerCase()
  if (lower.includes('phrasal') || lower.includes('verb phrase')) return 'Phrasal Verb'
  if (lower.includes('verb')) return 'Verb'
  if (lower.includes('adj')) return 'Adjective'
  if (lower.includes('noun')) return 'Noun'
  return 'Other'
}

const renderScoreRing = (score, label) => {
  const color = score < 50 ? '#E24B4A' : score < 75 ? '#EF9F27' : '#22c55e';
  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${score}%, #e5e7eb ${score}%)` }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </div>
  )
}

export default function AudioSection() {
  const { audioFiles, loading, addAudioFile, deleteAudioFile } = useAudioFiles()
  const { storedAudios, deleteAudioFromDB } = useAudioStorage()
  const { words = [], addWord } = useWords() || {}
  const safeAudioFiles = Array.isArray(audioFiles) ? audioFiles : []
  const [selectedId, setSelectedId] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState('')
  
  const [audioQuizAnswers, setAudioQuizAnswers] = useState({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  const allFiles = useMemo(() => {
    return [...safeAudioFiles.map(f => ({ ...f, type: 'Audio File' })), ...storedAudios]
  }, [safeAudioFiles, storedAudios])

  const selectedFile = useMemo(
    () => allFiles.find((item) => item.id === selectedId) || allFiles[0] || null,
    [allFiles, selectedId],
  )

  useEffect(() => {
    if (selectedFile?.blob) {
      try {
        const url = URL.createObjectURL(selectedFile.blob)
        setCurrentAudioUrl(url)
        return () => URL.revokeObjectURL(url)
      } catch (err) {
        setCurrentAudioUrl('')
      }
    } else {
      setCurrentAudioUrl('')
    }
  }, [selectedFile])

  useEffect(() => {
    if (!selectedId && allFiles.length > 0) {
      setSelectedId(allFiles[0].id)
    }
  }, [allFiles, selectedId])

  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement) return

    const handleEnded = () => setIsPlaying(false)
    const handlePause = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)

    audioElement.addEventListener('ended', handleEnded)
    audioElement.addEventListener('pause', handlePause)
    audioElement.addEventListener('play', handlePlay)

    return () => {
      audioElement.removeEventListener('ended', handleEnded)
      audioElement.removeEventListener('pause', handlePause)
      audioElement.removeEventListener('play', handlePlay)
    }
  }, [selectedFile])

  const handleFileChange = async (event) => {
    setUploadError(null)
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please upload only MP3 or audio files.')
      return
    }

    try {
      await addAudioFile(file)
      setSelectedId(null)
      event.target.value = ''
    } catch (error) {
      setUploadError('An error occurred while uploading the audio file.')
    }
  }

  const handlePlayToggle = () => {
    const audioElement = audioRef.current
    if (!audioElement) return

    if (audioElement.paused) {
      audioElement.play().catch((err) => {
        console.warn('Otomatik oynatma engellendi veya dosya oynatılamıyor:', err)
      })
    } else {
      audioElement.pause()
    }
  }

  const handleDelete = (id, type) => {
    if (type === 'Voice Note') {
      deleteAudioFromDB(id)
    } else {
      deleteAudioFile(id)
    }
    if (selectedId === id) setSelectedId(null)
    setAnalysisResult(null)
  }

  const handleAnalyzeAudio = async () => {
    if (!selectedFile?.blob) return
    setIsAnalyzing(true)
    setAnalysisResult(null)
    setAudioQuizAnswers({})
    try {
      const text = await transcribeAudioWithAI(selectedFile.blob)
      const prompt = `You are an expert English language coach and linguist. The following text is a transcription of a user's spoken English audio recording. Perform a comprehensive analysis and return ONLY valid JSON with no markdown, no preamble, no explanation.

{
  "transcript": "exact transcription here",
  "speakingFeedback": {
    "overall": { "score": 0-100, "comment": "English comment" },
    "pronunciation": { "score": 0-100, "comment": "English comment", "problematicWords": ["word1", "word2"], "tip": "English improvement tip" },
    "fluency": { "score": 0-100, "comment": "English comment", "fillerWords": ["uh", "um"], "tip": "English tip" },
    "intonation": { "score": 0-100, "comment": "English comment", "tip": "English tip" },
    "vocabulary": { "score": 0-100, "comment": "English comment", "tip": "English tip" },
    "strengths": ["English strength 1", "English strength 2"],
    "improvements": ["English improvement 1", "English improvement 2"]
  },
  "vocabularyAnalysis": {
    "b2PlusWords": [
      { "word": "string", "level": "B2|C1|C2", "turkishMeaning": "string", "contextSentence": "string from transcript", "partOfSpeech": "noun|verb|adjective|adverb|phrase" }
    ],
    "suggestedUpgrades": [
      { "simpleWord": "string used in transcript", "advancedAlternative": "string", "turkishMeaning": "string" }
    ]
  },
  "grammarAnalysis": {
    "overallLevel": "A2|B1|B2|C1|C2",
    "structuresUsed": ["Past Simple", "Relative Clause"],
    "findings": [
      { "type": "good|improve|error", "structure": "Grammar structure name", "explanation": "English explanation", "original": "exact quote from transcript", "suggestion": "corrected version if improve or error" }
    ]
  },
  "questions": [
    { "question": "string", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": 0 }
  ]
}

Transcript to analyze:
${text}`
      
      const rawResponse = await fetchAI(prompt)
      const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanJson)
      setAnalysisResult(parsed)
    } catch (e) {
      console.error(e)
      throw e // Analiz esnasında sorun çıkarsa alert gösterme, işlemi durdur
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSaveWord = (v) => {
    const isDuplicate = words.some(w => w.english.toLowerCase() === v.word.toLowerCase());
    if (isDuplicate) {
      return alert("This word is already in your list!");
    }

    if (addWord) {
      addWord({
        english: v.word,
        turkish: v.turkishTranslation || v.turkishMeaning,
        type: mapPartOfSpeech(v.partOfSpeech),
        sentence: v.exampleSentence || v.contextSentence || '',
        collocation: '',
        ipa: ''
      })
      alert(`"${v.word}" kelimesi defterinize eklendi!`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400 eye-care:text-[#8C7A6B]">Audio Lab</p>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Ses dosyalarınızı yükleyin ve çalın</h2>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-3xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Upload File
            <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {uploadError && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{uploadError}</p>}

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_0.95fr]">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 dark:bg-zinc-900 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400 eye-care:text-[#8C7A6B]">Audio Files</p>
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : allFiles.length === 0 ? (
              <p className="text-sm text-slate-500">No audio files or voice notes added yet.</p>
            ) : (
              <div className="space-y-3">
                {allFiles.map((file) => (
                  <div key={file.id} className={`rounded-3xl border px-4 py-4 transition ${file.id === selectedFile?.id ? 'border-slate-950 bg-slate-100' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => { setSelectedId(file.id); setAnalysisResult(null); }}
                        className="text-left text-sm font-semibold text-slate-950"
                      >
                        {file.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id, file.type)}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">{new Date(file.date || file.createdAt).toLocaleString('tr-TR')}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${file.type === 'Voice Note' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                        {file.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400 eye-care:text-[#8C7A6B]">Player</p>
            {selectedFile ? (
              <>
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="font-semibold text-slate-950">{selectedFile.name}</p>
                  <p className="mt-2 text-sm text-slate-500">{selectedFile.type}</p>
                </div>
                <audio
                  ref={audioRef}
                  src={currentAudioUrl}
                  controls
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-3"
                />
                <button
                  type="button"
                  onClick={handlePlayToggle}
                  className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                
                {!isAnalyzing && (
                  <button
                    type="button"
                    onClick={handleAnalyzeAudio}
                    className="ml-3 inline-flex items-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    ✨ Start Diction Analysis & Quiz
                  </button>
                )}
              </div>
              
              {isAnalyzing && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="animate-pulse space-y-8">
                    <div className="h-6 w-1/3 rounded-lg bg-slate-200"></div>
                    <div className="flex flex-wrap justify-around gap-4">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 w-24 rounded-full bg-slate-200"></div>)}
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-200"></div>)}
                    </div>
                  </div>
                  <div className="mt-8 text-center text-sm font-semibold text-indigo-600 animate-pulse">
                    ✨ AI is analyzing your voice and speech in detail...
                  </div>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div className="mt-6 space-y-6">
                  {/* Transcript */}
                  <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
                    <h3 className="font-bold text-indigo-900 mb-2">Transcript</h3>
                    <p className="italic text-slate-700">"{analysisResult.transcript}"</p>
                  </div>

                  {/* Speaking Feedback */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-xl font-bold text-slate-900">Speech Analysis</h3>
                    
                    {/* Rings */}
                    <div className="mb-8 flex flex-wrap justify-around gap-4 rounded-2xl bg-slate-50 p-6 border border-slate-100">
                      {renderScoreRing(analysisResult.speakingFeedback.overall.score, "Overall Score")}
                      {renderScoreRing(analysisResult.speakingFeedback.pronunciation.score, "Pronunciation")}
                      {renderScoreRing(analysisResult.speakingFeedback.fluency.score, "Fluency")}
                      {renderScoreRing(analysisResult.speakingFeedback.intonation.score, "Intonation")}
                      {renderScoreRing(analysisResult.speakingFeedback.vocabulary.score, "Vocabulary")}
                    </div>

                    {/* Cards */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Pronunciation */}
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                          <h4 className="font-bold text-indigo-900 mb-2">🗣️ Pronunciation</h4>
                          <p className="text-sm text-slate-700 mb-3">{analysisResult.speakingFeedback.pronunciation.comment}</p>
                          {analysisResult.speakingFeedback.pronunciation.problematicWords?.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {analysisResult.speakingFeedback.pronunciation.problematicWords.map((w,i) => <span key={i} className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{w}</span>)}
                            </div>
                          )}
                          <p className="text-xs italic text-indigo-700 bg-white p-2 rounded-lg border border-indigo-100">💡 {analysisResult.speakingFeedback.pronunciation.tip}</p>
                      </div>
                      {/* Fluency */}
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
                          <h4 className="font-bold text-emerald-900 mb-2">🌊 Fluency</h4>
                          <p className="text-sm text-slate-700 mb-3">{analysisResult.speakingFeedback.fluency.comment}</p>
                          {analysisResult.speakingFeedback.fluency.fillerWords?.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5">
                                {analysisResult.speakingFeedback.fluency.fillerWords.map((w,i) => <span key={i} className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{w}</span>)}
                            </div>
                          )}
                          <p className="text-xs italic text-emerald-700 bg-white p-2 rounded-lg border border-emerald-100">💡 {analysisResult.speakingFeedback.fluency.tip}</p>
                      </div>
                      {/* Intonation */}
                      <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-5">
                          <h4 className="font-bold text-purple-900 mb-2">🎵 Intonation</h4>
                          <p className="text-sm text-slate-700 mb-3">{analysisResult.speakingFeedback.intonation.comment}</p>
                          <p className="text-xs italic text-purple-700 bg-white p-2 rounded-lg border border-purple-100">💡 {analysisResult.speakingFeedback.intonation.tip}</p>
                      </div>
                      {/* Vocabulary */}
                      <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-5">
                          <h4 className="font-bold text-sky-900 mb-2">📚 Vocabulary</h4>
                          <p className="text-sm text-slate-700 mb-3">{analysisResult.speakingFeedback.vocabulary.comment}</p>
                          <p className="text-xs italic text-sky-700 bg-white p-2 rounded-lg border border-sky-100">💡 {analysisResult.speakingFeedback.vocabulary.tip}</p>
                      </div>
                    </div>

                    {/* Strengths & Improvements */}
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-emerald-200 p-5">
                          <h4 className="font-bold text-slate-900 mb-3">🌟 Your Strengths</h4>
                          <ul className="flex flex-wrap gap-2">
                            {analysisResult.speakingFeedback.strengths?.map((s,i) => <li key={i} className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full">✓ {s}</li>)}
                          </ul>
                      </div>
                      <div className="rounded-xl border border-amber-200 p-5">
                          <h4 className="font-bold text-slate-900 mb-3">📈 Areas for Improvement</h4>
                          <ul className="flex flex-wrap gap-2">
                            {analysisResult.speakingFeedback.improvements?.map((s,i) => <li key={i} className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">🎯 {s}</li>)}
                          </ul>
                      </div>
                    </div>
                  </div>

                  {/* Vocabulary Analysis */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-xl font-bold text-slate-900">Vocabulary Analysis</h3>
                    
                    <h4 className="font-semibold text-slate-800 mb-3">B2+ Words</h4>
                    <div className="grid gap-3 md:grid-cols-2 mb-8">
                      {analysisResult.vocabularyAnalysis?.b2PlusWords?.map((w, i) => {
                          const isWordAdded = words.some(existing => existing.english.toLowerCase() === w.word.toLowerCase());
                          return (
                          <div key={i} className="border border-slate-100 bg-slate-50 p-4 rounded-xl flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-indigo-700 text-lg">{w.word}</span>
                                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{w.level} • {w.partOfSpeech}</span>
                                  </div>
                                  <button 
                                    disabled={isWordAdded}
                                    onClick={() => handleSaveWord({ word: w.word, turkishMeaning: w.turkishMeaning, partOfSpeech: w.partOfSpeech, contextSentence: w.contextSentence })}
                                    className={`text-xs font-semibold py-1 px-2.5 rounded-lg transition ${isWordAdded ? 'bg-emerald-500 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                  >
                                    {isWordAdded ? 'Added ✓' : '+ Add'}
                                  </button>
                                </div>
                                <p className="text-sm font-medium text-slate-700 mb-2">{w.turkishMeaning}</p>
                                <p className="text-xs italic text-slate-500">"{w.contextSentence}"</p>
                            </div>
                          </div>
                          )
                      })}
                      {(!analysisResult.vocabularyAnalysis?.b2PlusWords || analysisResult.vocabularyAnalysis.b2PlusWords.length === 0) && (
                          <p className="text-sm text-slate-500">No advanced words found.</p>
                      )}
                    </div>

                    <h4 className="font-semibold text-slate-800 mb-3">Vocabulary Upgrade Suggestions</h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Word Used</th>
                                <th className="px-4 py-3 font-semibold">Better Alternative</th>
                                <th className="px-4 py-3 font-semibold">Meaning</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {analysisResult.vocabularyAnalysis?.suggestedUpgrades?.map((u, i) => (
                                <tr key={i}>
                                  <td className="px-4 py-3 text-slate-500">"{u.simpleWord}"</td>
                                  <td className="px-4 py-3 font-bold text-emerald-600">{u.advancedAlternative}</td>
                                  <td className="px-4 py-3 text-slate-600">{u.turkishMeaning}</td>
                                </tr>
                            ))}
                            {(!analysisResult.vocabularyAnalysis?.suggestedUpgrades || analysisResult.vocabularyAnalysis.suggestedUpgrades.length === 0) && (
                                <tr><td colSpan="3" className="px-4 py-3 text-slate-500 text-center">No suggestions found.</td></tr>
                            )}
                          </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Grammar Analysis */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-900">Grammar Analysis</h3>
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-sm font-bold shadow-sm">Level: {analysisResult.grammarAnalysis?.overallLevel || '?'}</span>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Structures Used</h4>
                      <div className="flex flex-wrap gap-2">
                          {analysisResult.grammarAnalysis?.structuresUsed?.map((s, i) => (
                            <span key={i} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">{s}</span>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Grammar Findings</h4>
                      <div className="space-y-3">
                          {analysisResult.grammarAnalysis?.findings?.map((f, i) => {
                            const isGood = f.type === 'good';
                            const isImprove = f.type === 'improve';
                            const isError = f.type === 'error';
                            
                            const borderColor = isGood ? 'border-emerald-500' : isImprove ? 'border-amber-500' : 'border-rose-500';
                            const bgColor = isGood ? 'bg-emerald-50/50' : isImprove ? 'bg-amber-50/50' : 'bg-rose-50/50';
                            const icon = isGood ? '✓' : isImprove ? '→' : '✗';
                            const iconColor = isGood ? 'text-emerald-600' : isImprove ? 'text-amber-600' : 'text-rose-600';

                            return (
                                <div key={i} className={`flex items-start gap-3 rounded-r-xl border-l-4 p-4 shadow-sm border border-y-slate-100 border-r-slate-100 ${borderColor} ${bgColor}`}>
                                  <span className={`text-lg font-black ${iconColor} mt-0.5`}>{icon}</span>
                                  <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-slate-800">{f.structure}</span>
                                      </div>
                                      <p className="text-sm text-slate-700 mb-2">{f.explanation}</p>
                                      <div className="rounded border border-white/40 bg-white/60 p-2 text-xs">
                                        <p className="italic text-slate-600">"{f.original}"</p>
                                        {(isImprove || isError) && f.suggestion && (
                                            <p className="mt-1 font-semibold text-emerald-700">Suggestion: "{f.suggestion}"</p>
                                        )}
                                      </div>
                                  </div>
                                </div>
                            )
                          })}
                          {(!analysisResult.grammarAnalysis?.findings || analysisResult.grammarAnalysis.findings.length === 0) && (
                            <p className="text-sm text-slate-500">No significant findings recorded.</p>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Quiz */}
                  {analysisResult.questions?.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="mb-6 text-xl font-bold text-slate-900">Listening Comprehension Quiz</h3>
                      <div className="space-y-6">
                          {analysisResult.questions.map((q, i) => (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                                <p className="font-bold text-slate-800 mb-4">{i + 1}. {q.question}</p>
                                <div className="space-y-2">
                                  {q.options.map((opt, oIdx) => {
                                      const isSelected = audioQuizAnswers[i] === oIdx;
                                      const isCorrect = q.answer === oIdx;
                                      const hasAnswered = audioQuizAnswers[i] !== undefined;

                                      let btnClass = "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";
                                      
                                      if (hasAnswered) {
                                        if (isSelected && isCorrect) {
                                            btnClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold";
                                        } else if (isSelected && !isCorrect) {
                                            btnClass = "border-rose-500 bg-rose-50 text-rose-700 font-bold";
                                        } else if (!isSelected && isCorrect) {
                                            btnClass = "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold";
                                        } else {
                                            btnClass = "border-slate-100 bg-slate-50 text-slate-400 opacity-50";
                                        }
                                      }

                                      return (
                                        <button 
                                            key={oIdx} 
                                            disabled={hasAnswered}
                                            onClick={() => setAudioQuizAnswers(prev => ({...prev, [i]: oIdx}))} 
                                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition ${btnClass}`}
                                        >
                                            {opt}
                                        </button>
                                      )
                                  })}
                                </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Bir ses dosyası seçin veya yeni dosya yükleyin.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
