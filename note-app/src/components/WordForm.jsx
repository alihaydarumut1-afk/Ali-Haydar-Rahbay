import { useState } from 'react'

export default function WordForm({ onSave, words = [] }) {
  const [english, setEnglish] = useState('')
  const [turkish, setTurkish] = useState('')
  const [type, setType] = useState('Noun')
  const [sentence, setSentence] = useState('')
  const [collocation, setCollocation] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    if (!english.trim() || !turkish.trim()) {
      setError('Please enter an English word and its Turkish meaning.')
      return
    }

    // Duplicate kontrolü (case-insensitive)
    const englishLower = english.toLowerCase().trim()
    const isDuplicate = words.some(word =>
      word.english.toLowerCase().trim() === englishLower
    )

    if (isDuplicate) {
      setError('This word is already in your list!')
      return
    }

    onSave({ english, turkish, type, sentence, collocation })
    setEnglish('')
    setTurkish('')
    setType('Noun')
    setSentence('')
    setCollocation('')
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
      <h2 className="mb-4 text-2xl font-semibold text-slate-900">Add New Word</h2>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <label className="mb-2 block text-sm font-semibold text-slate-700">English Word</label>
      <input
        value={english}
        onChange={(event) => setEnglish(event.target.value)}
        placeholder="English word"
        className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />

      <label className="mb-2 block text-sm font-semibold text-slate-700">Turkish Meaning</label>
      <input
        value={turkish}
        onChange={(event) => setTurkish(event.target.value)}
        placeholder="Turkish meaning"
        className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Word Type</label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option>Noun</option>
            <option>Verb</option>
            <option>Adjective</option>
            <option>Phrasal Verb</option>
            <option>Other</option>
          </select>
        </div>

        <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Collocation (Optional)</label>
          <input
          value={collocation}
          onChange={(event) => setCollocation(event.target.value)}
          placeholder="e.g. make a mistake"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>


    <div className="mb-4">
      <label className="mb-2 block text-sm font-semibold text-slate-700">Example Sentence</label>
      <input
        value={sentence}
        onChange={(event) => setSentence(event.target.value)}
        placeholder="Example sentence"
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </div>

      <button
        type="submit"
        className="inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Save Word
      </button>
    </form>
  )
}
