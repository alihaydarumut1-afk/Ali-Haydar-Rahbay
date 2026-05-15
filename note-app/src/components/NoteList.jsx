import NoteCard from './NoteCard'

export default function NoteList({ notes, onEdit, onDelete }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500 shadow-sm shadow-slate-200/70">
        <p className="text-lg font-medium">Henüz bir not yok.</p>
        <p className="mt-3 text-sm text-slate-500">Yeni bir not ekleyin ve listeyi burada görün.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
