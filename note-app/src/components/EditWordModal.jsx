import { useState, useEffect } from 'react'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

async function fetchAI(prompt) {
  const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, expectJson: true })
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429) alert(data.error);
    throw new Error(data.error || 'AI Hatası');
  }
  return JSON.parse(data.content);
}

export default function EditWordModal({ isOpen, onClose, word, onUpdate }) {
  const [english, setEnglish] = useState('')
  const [turkish, setTurkish] = useState('')
  const [type, setType] = useState('')
  const [sentence, setSentence] = useState('')
  const [collocation, setCollocation] = useState('')
  const [isAutoFilling, setIsAutoFilling] = useState(false)

  useEffect(() => {
    if (word) {
      setEnglish(word.english || '')
      setTurkish(word.turkish || '')
      setType(word.type || '')
      setSentence(word.sentence || '')
      setCollocation(word.collocation || '')
    }
  }, [word])

  const handleAutoFill = async () => {
    if (!english.trim()) return alert('Lütfen önce İngilizce kelimeyi yazın.')
    setIsAutoFilling(true)
    try {
      const prompt = `Analyze the English word "${english}". Return ONLY valid JSON: {"type": "Noun|Verb|Adjective|Phrasal Verb|Other", "meaning": "Turkish meaning", "example": "An English example sentence", "collocation": "A common collocation (e.g. make a mistake)"}`
      const enriched = await fetchAI(prompt)
      
      let parsedType = enriched.type || 'Other'
      const lower = String(parsedType).toLowerCase()
      if (lower.includes('phrasal')) parsedType = 'Phrasal Verb'
      else if (lower.includes('verb')) parsedType = 'Verb'
      else if (lower.includes('adj')) parsedType = 'Adjective'
      else if (lower.includes('noun')) parsedType = 'Noun'
      else parsedType = 'Other'

      if (enriched.meaning) setTurkish(enriched.meaning)
      if (enriched.type) setType(parsedType)
      if (enriched.example) setSentence(enriched.example)
      if (enriched.collocation) setCollocation(enriched.collocation)
    } catch (e) {
      alert('Otomatik doldurma başarısız oldu.')
    } finally {
      setIsAutoFilling(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!english.trim() || !turkish.trim() || !type.trim()) {
      alert('Lütfen tüm zorunlu alanları doldurun.')
      return
    }
    onUpdate(word.id, {
      english: english.trim(),
      turkish: turkish.trim(),
      type: type.trim(),
      sentence: sentence.trim(),
      collocation: collocation.trim(),
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#F4EAD5] eye-care:border-[#EAE0C8]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 eye-care:text-[#3B2F2F]">Kelimeyi Düzenle</h2>
          <button type="button" onClick={handleAutoFill} disabled={isAutoFilling} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50">
            {isAutoFilling ? 'AI Düzeltiyor...' : '✨ Eksikleri Düzelt'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">İngilizce Kelime</label>
            <input
              type="text"
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Türkçe Anlam</label>
            <input
              type="text"
              value={turkish}
              onChange={(e) => setTurkish(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Kelime Tipi</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F]"
              required
            >
              <option value="">Seçin</option>
              <option value="Noun">Noun</option>
              <option value="Verb">Verb</option>
              <option value="Adjective">Adjective</option>
              <option value="Phrasal Verb">Phrasal Verb</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
        <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Collocation (Opsiyonel)</label>
        <input
          type="text"
          value={collocation}
          onChange={(e) => setCollocation(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B]"
        />
      </div>
      <div>
            <label className="block text-sm font-semibold text-zinc-600 dark:text-zinc-300 eye-care:text-[#5C4B37]">Örnek Cümle</label>
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:focus:ring-indigo-900 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] eye-care:text-[#3B2F2F] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 eye-care:placeholder:text-[#8C7A6B]"
              rows="3"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}