export default function SearchBar({ searchQuery, onSearch }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/80 backdrop-blur-sm dark:bg-zinc-900/90 dark:border-zinc-800 dark:shadow-none">
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Notlarda Ara</label>
      <input
        value={searchQuery}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Başlık veya içeriğe göre ara..."
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-900"
      />
    </div>
  )
}
