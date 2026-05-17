import { useEffect, useState } from 'react'

export default function NoteForm({ selectedNote, onCancel, onSave }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title)
      setContent(selectedNote.content)
      return
    }
    setTitle('')
    setContent('')
  }, [selectedNote])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!title.trim()) {
      return
    }

    onSave({ title, content, id: selectedNote?.id })
    setTitle('')
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-600 dark:shadow-none">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black dark:text-white">{selectedNote ? 'Notu Düzenle' : 'Yeni Not Ekle'}</h2>
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-200">Sadeliğe odaklanan form ile hızlıca not ekleyin veya güncelleyin.</p>
      </div>

      <label className="mb-2 block text-sm font-bold text-black dark:text-white">Başlık</label>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Not başlığını girin"
        className="mb-4 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:placeholder:text-slate-300 dark:focus:border-indigo-400"
      />

      <label className="mb-2 block text-sm font-bold text-black dark:text-white">Açıklama</label>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows="6"
        placeholder="Notunuzun detaylarını ekleyin"
        className="mb-5 w-full rounded-3xl border-2 border-slate-300 bg-white px-4 py-4 text-black placeholder:text-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-500 dark:bg-black dark:text-white dark:placeholder:text-slate-300 dark:focus:border-indigo-400"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="submit"
          className="inline-flex justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
        >
          {selectedNote ? 'Güncelle' : 'Kaydet'}
        </button>
        {selectedNote && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  )
}
