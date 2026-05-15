import { useState, useRef, useMemo, useEffect } from 'react'
import useSavedCreations from '../hooks/useSavedCreations.js'
import UniversalFocusMode from './UniversalFocusMode.jsx'

export default function GrammarAnalyzer({ initialText, initialId, initialTitle, onBack, onUpdateDraft, onDeleteDraft }) {
  const { creations, removeCreation } = useSavedCreations() || {}
  const safeCreations = Array.isArray(creations) ? creations : []
  
  // Kaydedilmiş analizleri localStorage'dan çek
  const [savedAnalyses, setSavedAnalyses] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('grammar_saved_analyses') || '{}')
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}
    } catch {
      return {}
    }
  })

  // Düzenlenen taslak metin ile Lab arşivini birleştir
  const allItems = useMemo(() => {
    const manual = String(initialText || '').trim() ? { 
      id: initialId || 'manual', 
      title: initialTitle || (initialId ? 'Kayıtlı Not' : 'Taslak Not'), 
      type: initialId ? 'Grammar Note' : 'Manuel Not', 
      content: String(initialText || ''), 
      createdAt: new Date().toISOString() 
    } : null
    
    const validCreations = safeCreations.filter(Boolean).map(c => ({...c, content: String(c.text || c.content || '')}))
    
    const savedItems = Object.values(savedAnalyses || {}).filter(a => a && !Array.isArray(a) && a.id).map(a => ({
      id: a.id,
      title: a.title,
      type: 'Kayıtlı Analiz',
      content: a.content,
      createdAt: a.createdAt
    }))

    const merged = []
    if (manual) merged.push(manual)
    
    for (const c of validCreations) { if (c.id !== initialId) merged.push(c) }
    for (const s of savedItems) { if (!merged.some(m => m.id === s.id)) merged.push(s) }
    
    return merged
  }, [initialText, initialId, initialTitle, creations, savedAnalyses])

  const [expandedId, setExpandedId] = useState(allItems[0]?.id || null)
  const [grammarAnalysis, setGrammarAnalysis] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeGrammar, setActiveGrammar] = useState(null)
  const sentenceRefs = useRef({})

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false)
  
  const defaultKey = ''

  const currentItem = allItems.find(i => i.id === expandedId) || null

  const sentences = useMemo(() => {
    if (!currentItem) return []
    const matches = String(currentItem.content || '').match(/[^.!?]+[.!?]*/g) || []
    return matches.map(s => s.trim()).filter(Boolean)
  }, [currentItem])

  useEffect(() => {
    if (currentItem) {
      const saved = savedAnalyses[currentItem.id]
      if (saved) {
        const analysisData = Array.isArray(saved) ? saved : saved.analysis;
        setGrammarAnalysis(Array.isArray(analysisData) ? analysisData : [])
      } else {
        setGrammarAnalysis([])
      }
      setActiveGrammar(null)
      sentenceRefs.current = {}
    }
  }, [expandedId, currentItem, savedAnalyses])

  const handleAnalyze = async () => {
    if (!currentItem || !String(currentItem.content || '').trim()) return
    setIsAnalyzing(true)

    const prompt = `Aşağıdaki metni analiz et ve içindeki önemli İngilizce gramer yapılarını (tenses, conditionals, passives, relative clauses vb.) bul.
SADECE VE SADECE aşağıdaki formatta geçerli bir JSON dizisi dön. Kod bloğu (\`\`\`json) KULLANMA, düz metin EKLEME:
[
  { "grammar_type": "Third Conditional", "exact_sentence": "If I had known, I would have gone." },
  { "grammar_type": "Present Perfect", "exact_sentence": "I have lived here for 5 years." }
]

Analiz edilecek metin:
"${currentItem.content}"`

    try {
      const key = localStorage.getItem('geminiApiKey') || defaultKey
      let response;
      if (key.startsWith('sk-')) {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: prompt }],
            temperature: 0.3,
          })
        })
      } else {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`
        response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
        })
      }

      if (!response.ok) throw new Error('API yanıt vermedi')
      
      const data = await response.json()
      const content = key.startsWith('sk-') ? (data.choices?.[0]?.message?.content || '') : (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
      
      let jsonStr = content.replace(/```json/gi, '').replace(/```/g, '').trim()
      const jsonMatch = jsonStr.match(/\[\s*\{.*?\}\s*\]/s)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
      
      let parsed = []
      try {
        parsed = JSON.parse(jsonStr)
        if (!Array.isArray(parsed)) parsed = Object.values(parsed).find(Array.isArray) || []
      } catch (e) {
        throw new Error('Yapay zeka geçerli bir veri döndürmedi.')
      }
      
      setGrammarAnalysis(Array.isArray(parsed) ? parsed : [])
      setActiveGrammar(null)
    } catch (error) {
      console.error('Analiz hatası:', error)
      alert('Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSaveAnalysis = () => {
    if (!currentItem || grammarAnalysis.length === 0) return
    
    const saveId = currentItem.id === 'manual' ? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()) : currentItem.id;

    const newSaved = { 
      ...savedAnalyses, 
      [saveId]: {
        id: saveId,
        title: currentItem.title || 'Analiz Notu',
        content: currentItem.content,
        analysis: grammarAnalysis,
        createdAt: new Date().toISOString()
      }
    }
    setSavedAnalyses(newSaved)
    localStorage.setItem('grammar_saved_analyses', JSON.stringify(newSaved))

    if (currentItem.id === 'manual') {
      setExpandedId(saveId)
    }
  }

  const handleEditClick = (item) => {
    setEditingId(item.id)
    setEditTitle(item.title || item.type || 'İsimsiz Metin')
    setEditContent(item.content || '')
  }

  const handleSaveEdit = (item) => {
    const isContentChanged = String(item.content || '') !== editContent;

    if (item.id === initialId || item.id === 'manual') {
      if (onUpdateDraft) onUpdateDraft(editTitle, editContent);
    }


    if (savedAnalyses[item.id]) {
      const newSaved = { ...savedAnalyses };
      newSaved[item.id] = {
        ...newSaved[item.id],
        title: editTitle,
        content: editContent,
      };
      if (isContentChanged) {
        newSaved[item.id].analysis = [];
      }
      setSavedAnalyses(newSaved);
      localStorage.setItem('grammar_saved_analyses', JSON.stringify(newSaved));
      if (isContentChanged && expandedId === item.id) {
        setGrammarAnalysis([]);
      }
    }
    setEditingId(null);
  }

  const handleDelete = () => {
    if (!currentItem) return
    const newSaved = { ...savedAnalyses }
    delete newSaved[currentItem.id]
    setSavedAnalyses(newSaved)
    localStorage.setItem('grammar_saved_analyses', JSON.stringify(newSaved))
    
    if (currentItem.id !== 'manual' && currentItem.id !== initialId) {
      removeCreation(currentItem.id)
      setExpandedId(null)
    } else {
      if (onDeleteDraft) onDeleteDraft(currentItem.id);
    }
    setGrammarAnalysis([])
  }

  const handleGrammarClick = (item, index) => {
    setActiveGrammar(index)
    
    if (!item || !item.exact_sentence) return

    // Cümleyi bul (Noktalama işaretlerini ve büyük/küçük harfi göz ardı et)
    const cleanExact = String(item.exact_sentence || '').replace(/[^\w\s]/gi, '').toLowerCase().trim()
    const targetSentenceIndex = sentences.findIndex(s => {
      const cleanS = String(s || '').replace(/[^\w\s]/gi, '').toLowerCase().trim()
      return cleanS && cleanExact && (cleanS.includes(cleanExact) || cleanExact.includes(cleanS))
    })

    if (targetSentenceIndex !== -1 && sentenceRefs.current[targetSentenceIndex]) {
      sentenceRefs.current[targetSentenceIndex].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const activeExactSentence = (activeGrammar !== null && grammarAnalysis[activeGrammar]) 
    ? grammarAnalysis[activeGrammar].exact_sentence 
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3] eye-care:text-[#5C4B37]">
            ← Geri Dön
          </button>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">İnteraktif Gramer Analizi</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Metindeki gramer yapılarını analiz edin ve haritalandırın.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsFocusModeOpen(true)}
          className="rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Odaklı Analiz
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">İçe Aktarılan Metinler</h3>
          <div className="h-[500px] space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {allItems.length === 0 ? (
              <p className="text-slate-400">Analiz edilecek metin bulunamadı.</p>
            ) : (
              allItems.map((item) => {
                const isExpanded = expandedId === item.id
                const isSaved = !!savedAnalyses[item.id]

                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all duration-300">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className={`flex w-full items-center justify-between p-4 transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'bg-slate-50 hover:bg-slate-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-800">{item.title || item.type || 'İsimsiz Metin'}</span>
                        <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString('tr-TR')}</span>
                        {isSaved && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            ✓ Kaydedildi
                          </span>
                        )}
                      </div>
                      <svg className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="border-t border-slate-100 p-4">
                        <div className="custom-scrollbar mb-4 max-h-64 overflow-y-auto pr-2 text-lg leading-relaxed text-slate-700">
                          {isExpanded && sentences.map((sentence, i) => {
                            let isActive = false
                            if (activeGrammar !== null && grammarAnalysis[activeGrammar]) {
                              const exact = grammarAnalysis[activeGrammar].exact_sentence;
                              if (exact) {
                                const cleanExact = String(exact || '').replace(/[^\w\s]/gi, '').toLowerCase().trim()
                                const cleanS = String(sentence || '').replace(/[^\w\s]/gi, '').toLowerCase().trim()
                                if (cleanS && cleanExact && (cleanS.includes(cleanExact) || cleanExact.includes(cleanS))) {
                                  isActive = true
                                }
                              }
                            }
                            return (
                              <span key={i} ref={el => sentenceRefs.current[i] = el} className={`transition-all duration-500 ${isActive ? 'rounded bg-indigo-200 px-1.5 py-0.5 text-indigo-900 shadow-sm' : ''}`}>
                                {sentence}{' '}
                              </span>
                            )
                          })}
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-3">
                          {!isSaved && grammarAnalysis.length === 0 && (
                            <button onClick={handleAnalyze} disabled={isAnalyzing} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
                              {isAnalyzing ? 'Analiz Ediliyor...' : '✨ Analiz Et'}
                            </button>
                          )}
                          {(grammarAnalysis.length > 0 || isSaved) && (
                            <>
                              {!isSaved && (
                                <button onClick={handleSaveAnalysis} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                                  💾 Sonucu Kaydet
                                </button>
                              )}
                              <button onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100">
                                🗑️ Sil
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Gramer Haritası</h3>
          <div className="custom-scrollbar h-[500px] space-y-3 overflow-y-auto pr-2">
            {!currentItem ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <p>Analiz haritasını görmek için listeden bir metin açın.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <svg className="mb-3 h-8 w-8 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>Yapay Zeka metni analiz ediyor...</p>
              </div>
            ) : (!Array.isArray(grammarAnalysis) || grammarAnalysis.length === 0) ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p>Gramer haritasını çıkarmak için metnin altındaki "Analiz Et" butonuna basın.</p>
              </div>
            ) : (
              grammarAnalysis.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleGrammarClick(item, i)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    activeGrammar === i 
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-500' 
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  <p className={`font-bold ${activeGrammar === i ? 'text-indigo-700' : 'text-slate-800'}`}>{item.grammar_type || 'Bilinmeyen Yapı'}</p>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.exact_sentence || 'Cümle belirtilmemiş.'}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
      `}} />

      <UniversalFocusMode
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        content={currentItem?.content || ''}
        mode="grammar"
        activeSentence={activeExactSentence}
      />
    </div>
  )
}