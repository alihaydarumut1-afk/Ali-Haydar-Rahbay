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
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Creative Lab</p>
          <h2 className="text-3xl font-semibold text-slate-950">Kelime Seçici</h2>
          <p className="mt-2 text-sm text-slate-600">
            Çalışmak istediğiniz kelimeleri seçin, sonra bu kelimelerle metin ve diyalog üretimine geçin.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Hepsini Seç
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Seçimi Temizle
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Kelime Listesi</h3>
              <p className="text-sm text-slate-500">Her kelimenin yanındaki kutucuktan seçebilirsiniz.</p>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {checkedIds.size} seçildi
            </span>
          </div>
          <div className="space-y-3">
            {words.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                Henüz kelime yok. Kelime ekledikten sonra buradan seçebilirsiniz.
              </div>
            ) : (
              words.map((word) => (
                <label
                  key={word.id}
                  className="flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(word.id)}
                    onChange={() => toggleWord(word.id)}
                    className="h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{word.english}</p>
                    <p className="text-sm text-slate-600">{word.turkish}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                    {word.type || 'Unknown'}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Seçilen Kelimeler</h3>
              <p className="text-sm text-slate-500">Creative Lab için kullanabileceğiniz kelime seçimi.</p>
            </div>
            <span className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {selectedWords.length} adet
            </span>
          </div>
          {selectedWords.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              Seçim yapıldığında kelimeler burada görünecek.
            </div>
          ) : (
            <ul className="space-y-3">
              {selectedWords.map((word) => (
                <li key={word.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{word.english}</p>
                      <p className="text-sm text-slate-600">{word.turkish}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
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
