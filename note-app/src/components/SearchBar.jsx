export default function SearchBar({ searchQuery, onSearch }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/80 backdrop-blur-sm">
      <label className="mb-2 block text-sm font-semibold text-slate-700">Notlarda Ara</label>
      <input
        value={searchQuery}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Başlık veya içeriğe göre ara..."
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      />
    </div>
  )
}
