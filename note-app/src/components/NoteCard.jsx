export default function NoteCard({ note, onEdit, onDelete }) {
  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-md dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none">
      <div>
        <div className="mb-3 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-400">
          <span>{new Date(note.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span>{new Date(note.updatedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <h3 className="mb-3 text-xl font-semibold text-slate-900 dark:text-zinc-50">{note.title}</h3>
        <p className="whitespace-pre-line break-words text-slate-600 dark:text-zinc-300">{note.content || 'Bu not için içerik eklenmemiş.'}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onEdit(note)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Düzenle
        </button>
        <button
          type="button"
          onClick={() => onDelete(note.id)}
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40"
        >
          Sil
        </button>
      </div>
    </article>
  )
}
