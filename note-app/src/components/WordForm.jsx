import { useState } from 'react'

export default function WordForm({ onSave, words = [] }) {
  const [english, setEnglish] = useState('')
  const [entries, setEntries] = useState([{ turkish: '', type: 'Noun', sentence: '', collocation: '' }])
  const [error, setError] = useState('')

  const addEntry = () => {
    setEntries(prev => [...prev, { turkish: '', type: 'Noun', sentence: '', collocation: '' }])
  }

  const removeEntry = (index) => {
    if (entries.length === 1) return
    setEntries(prev => prev.filter((_, i) => i !== index))
  }

  const updateEntry = (index, field, value) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!english.trim()) {
      setError('Please enter an English word.')
      return
    }

    const validEntries = entries.filter(e => e.turkish.trim())
    if (validEntries.length === 0) {
      setError('Please enter at least one Turkish meaning.')
      return
    }

    const isDuplicate = words.some(w =>
      w.english.toLowerCase().trim() === english.toLowerCase().trim()
    )
    if (isDuplicate) {
      setError(`"${english.trim()}" is already in your list. Use the Edit button to modify it.`)
      return
    }

    validEntries.forEach(entry => {
      onSave({ english, turkish: entry.turkish, type: entry.type, sentence: entry.sentence, collocation: entry.collocation })
    })

    setEnglish('')
    setEntries([{ turkish: '', type: 'Noun', sentence: '', collocation: '' }])
  }

  const labelStyle = { color: 'var(--text-main)' }
  const inputClass = "w-full rounded-xl border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500"
  const inputStyle = { borderColor: 'var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)' }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border p-6 shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
      <h2 className="mb-4 text-2xl font-bold" style={labelStyle}>Add New Word</h2>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <label className="mb-2 block text-sm font-bold" style={labelStyle}>English Word</label>
      <input
        value={english}
        onChange={(e) => setEnglish(e.target.value)}
        placeholder="English word"
        className="mb-6 w-full rounded-2xl border-2 px-4 py-3 outline-none transition focus:border-indigo-500"
        style={inputStyle}
      />

      <div className="mb-4 space-y-4">
        {entries.map((entry, index) => (
          <div key={index} className="rounded-2xl border-2 p-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                Meaning {index + 1}
              </span>
              {entries.length > 1 && (
                <button type="button" onClick={() => removeEntry(index)} className="text-rose-400 hover:text-rose-600 text-xs font-semibold transition">
                  ✕ Remove
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              <div>
                <label className="mb-1 block text-xs font-bold" style={labelStyle}>Turkish Meaning</label>
                <input
                  value={entry.turkish}
                  onChange={(e) => updateEntry(index, 'turkish', e.target.value)}
                  placeholder="Turkish meaning"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold" style={labelStyle}>Word Type</label>
                <select
                  value={entry.type}
                  onChange={(e) => updateEntry(index, 'type', e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option>Noun</option>
                  <option>Verb</option>
                  <option>Adjective</option>
                  <option>Phrasal Verb</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold" style={labelStyle}>Collocation (Optional)</label>
                <input
                  value={entry.collocation}
                  onChange={(e) => updateEntry(index, 'collocation', e.target.value)}
                  placeholder="e.g. make a mistake"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold" style={labelStyle}>Example Sentence (Optional)</label>
                <input
                  value={entry.sentence}
                  onChange={(e) => updateEntry(index, 'sentence', e.target.value)}
                  placeholder="Example sentence"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addEntry}
        className="mb-4 w-full rounded-2xl border-2 border-dashed border-indigo-300 px-4 py-2.5 text-sm font-semibold text-indigo-500 transition hover:border-indigo-500 hover:bg-indigo-50"
      >
        + Add Another Meaning
      </button>

      <button
        type="submit"
        className="inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-bold text-white transition"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        Save Word
      </button>
    </form>
  )
}