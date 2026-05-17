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
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-600 dark:shadow-none">
      <h2 className="mb-4 text-2xl font-bold text-black dark:text-white">Add New Word</h2>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <label className="mb-2 block text-sm font-bold text-black dark:text-white">English Word</label>
      <input
        value={english}
        onChange={(event) => setEnglish(event.target.value)}
        placeholder="English word"
        className="mb-4 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:placeholder:text-slate-300 dark:focus:border-indigo-400"
      />

      <label className="mb-2 block text-sm font-bold text-black dark:text-white">Turkish Meaning</label>
      <input
        value={turkish}
        onChange={(event) => setTurkish(event.target.value)}
        placeholder="Turkish meaning"
        className="mb-4 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:placeholder:text-slate-300 dark:focus:border-indigo-400"
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-black dark:text-white">Word Type</label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:focus:border-indigo-400"
          >
            <option>Noun</option>
            <option>Verb</option>
            <option>Adjective</option>
            <option>Phrasal Verb</option>
            <option>Other</option>
          </select>
        </div>

        <div>
        <label className="mb-2 block text-sm font-bold text-black dark:text-white">Collocation (Optional)</label>
          <input
          value={collocation}
          onChange={(event) => setCollocation(event.target.value)}
          placeholder="e.g. make a mistake"
            className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:placeholder:text-slate-300 dark:focus:border-indigo-400"
          />
        </div>
      </div>


    <div className="mb-4">
      <label className="mb-2 block text-sm font-bold text-black dark:text-white">Example Sentence</label>
      <input
        value={sentence}
        onChange={(event) => setSentence(event.target.value)}
        placeholder="Example sentence"
        className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:placeholder:text-slate-300 dark:focus:border-indigo-400"
      />
    </div>

      <button
        type="submit"
        className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
      >
        Save Word
      </button>
    </form>
  )
}
