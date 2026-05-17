import { useEffect, useMemo, useState } from 'react'

export default function WordSelector({ words = [], selectedIds = [], onSelectedChange = () => {} }) {
  const [checkedIds, setCheckedIds] = useState(() => new Set(selectedIds))

  useEffect(() => {
    setCheckedIds(new Set(selectedIds))
  }, [selectedIds])

  const selectedWords = useMemo(
    () => words.filter((word) => checkedIds.has(word.id)),
    [words, checkedIds]
  )

  const allWordIds = useMemo(() => words.map((word) => word.id), [words])

  const updateSelection = (nextIds) => {
    setCheckedIds(nextIds)
    onSelectedChange([...nextIds])
  }

  const toggleWord = (wordId) => {
    const nextIds = new Set(checkedIds)
    if (nextIds.has(wordId)) {
      nextIds.delete(wordId)
    } else {
      nextIds.add(wordId)
    }
    updateSelection(nextIds)
  }

  const selectAll = () => {
    updateSelection(new Set(allWordIds))
  }

  const clearSelection = () => {
    updateSelection(new Set())
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-400">Creative Lab</p>
          <h2 className="text-3xl font-semibold text-slate-950 dark:text-zinc-50">Kelime Seçici</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-300">
            Çalışmak istediğiniz kelimeleri seçin, sonra bu kelimelerle metin ve diyalog üretimine geçin.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Hepsini Seç
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Seçimi Temizle
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:bg-zinc-800/50 dark:border-zinc-700">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-zinc-50">Kelime Listesi</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Her kelimenin yanındaki kutucuktan seçebilirsiniz.</p>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              {checkedIds.size} seçildi
            </span>
          </div>
          <div className="space-y-3">
            {words.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400">
                Henüz kelime yok. Kelime ekledikten sonra buradan seçebilirsiniz.
              </div>
            ) : (
              words.map((word) => (
                <label
                  key={word.id}
                  className="flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-600"
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(word.id)}
                    onChange={() => toggleWord(word.id)}
                    className="h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-slate-400 dark:border-zinc-600 dark:bg-zinc-700 dark:checked:bg-indigo-500"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950 dark:text-zinc-100">{word.english}</p>
                    <p className="text-sm text-slate-600 dark:text-zinc-400">{word.turkish}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {word.type || 'Unknown'}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-zinc-50">Seçilen Kelimeler</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Creative Lab için kullanabileceğiniz kelime seçimi.</p>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              {selectedWords.length} adet
            </span>
          </div>
          {selectedWords.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:bg-zinc-800/50 dark:border-zinc-700 dark:text-zinc-400">
              Seçim yapıldığında kelimeler burada görünecek.
            </div>
          ) : (
            <ul className="space-y-3">
              {selectedWords.map((word) => (
                <li key={word.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 dark:bg-zinc-800/50 dark:border-zinc-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-zinc-100">{word.english}</p>
                      <p className="text-sm text-slate-600 dark:text-zinc-400">{word.turkish}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:bg-zinc-700 dark:text-zinc-300">
                      {word.type || 'Type'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
