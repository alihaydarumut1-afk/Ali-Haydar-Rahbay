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
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm shadow-slate-200/80">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-900">{selectedNote ? 'Notu Düzenle' : 'Yeni Not Ekle'}</h2>
        <p className="mt-2 text-sm text-slate-500">Sadeliğe odaklanan form ile hızlıca not ekleyin veya güncelleyin.</p>
      </div>

      <label className="mb-2 block text-sm font-medium text-slate-700">Başlık</label>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Not başlığını girin"
        className="mb-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />

      <label className="mb-2 block text-sm font-medium text-slate-700">Açıklama</label>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows="6"
        placeholder="Notunuzun detaylarını ekleyin"
        className="mb-5 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="submit"
          className="inline-flex justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {selectedNote ? 'Güncelle' : 'Kaydet'}
        </button>
        {selectedNote && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  )
}
