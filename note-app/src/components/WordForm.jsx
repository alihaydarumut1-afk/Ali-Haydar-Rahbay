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
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
      <h2 className="mb-4 text-2xl font-semibold text-slate-900 dark:text-zinc-50">Add New Word</h2>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">English Word</label>
      <input
        value={english}
        onChange={(event) => setEnglish(event.target.value)}
        placeholder="English word"
        className="mb-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
      />

      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Turkish Meaning</label>
      <input
        value={turkish}
        onChange={(event) => setTurkish(event.target.value)}
        placeholder="Turkish meaning"
        className="mb-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Word Type</label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
          >
            <option>Noun</option>
            <option>Verb</option>
            <option>Adjective</option>
            <option>Phrasal Verb</option>
            <option>Other</option>
          </select>
        </div>

        <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Collocation (Optional)</label>
          <input
          value={collocation}
          onChange={(event) => setCollocation(event.target.value)}
          placeholder="e.g. make a mistake"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
          />
        </div>
      </div>


    <div className="mb-4">
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Example Sentence</label>
      <input
        value={sentence}
        onChange={(event) => setSentence(event.target.value)}
        placeholder="Example sentence"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
      />
    </div>

      <button
        type="submit"
        className="inline-flex w-full justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Save Word
      </button>
    </form>
  )
}
