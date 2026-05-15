import { useState, useEffect } from 'react'

const PREDEFINED_THEMES = [
  { id: 'light', name: 'Açık (Google Blue)', bg: '#f8f9fa', card: '#ffffff', accent: '#1a73e8', secondary: '#fbbc04', baseTheme: 'light' },
  { id: 'dark', name: 'Koyu (Material)', bg: '#202124', card: '#292a2d', accent: '#9678ff', secondary: '#03dac6', baseTheme: 'dark' },
  { id: 'sepia', name: 'Sepya (Göz Koruması)', bg: '#FDF6E3', card: '#F4E8D1', accent: '#d97706', secondary: '#b45309', baseTheme: 'light' },
  { id: 'dim', name: 'Loş (Dim)', bg: '#1a1a1a', card: '#242424', accent: '#7e57f4', secondary: '#ff4081', baseTheme: 'dim' },
  { id: 'ocean', name: 'Okyanus', bg: '#f0f7ff', card: '#ffffff', accent: '#0284c7', secondary: '#0ea5e9', baseTheme: 'light' },
  { id: 'forest', name: 'Orman', bg: '#f0fdf4', card: '#ffffff', accent: '#16a34a', secondary: '#84cc16', baseTheme: 'light' },
  { id: 'rose', name: 'Gül', bg: '#fff1f2', card: '#ffffff', accent: '#e11d48', secondary: '#f43f5e', baseTheme: 'light' },
  { id: 'sunset', name: 'Gün Batımı', bg: '#fff7ed', card: '#ffffff', accent: '#ea580c', secondary: '#f59e0b', baseTheme: 'light' },
  { id: 'midnight', name: 'Gece Yarısı', bg: '#0f172a', card: '#1e293b', accent: '#38bdf8', secondary: '#818cf8', baseTheme: 'dark' },
  { id: 'coffee', name: 'Kahve', bg: '#fffbeb', card: '#ffffff', accent: '#92400e', secondary: '#d97706', baseTheme: 'light' },
  { id: 'dracula', name: 'Drakula', bg: '#282a36', card: '#44475a', accent: '#ff79c6', secondary: '#bd93f9', baseTheme: 'dark' },
  { id: 'cyberpunk', name: 'Cyberpunk', bg: '#0d1117', card: '#161b22', accent: '#00ff41', secondary: '#bc13fe', baseTheme: 'dark' },
  { id: 'synthwave', name: 'Synthwave', bg: '#2b213a', card: '#241b2f', accent: '#ff8b39', secondary: '#f83b7b', baseTheme: 'dark' },
  { id: 'lavender', name: 'Lavanta', bg: '#faf5ff', card: '#ffffff', accent: '#8b5cf6', secondary: '#c084fc', baseTheme: 'light' },
  { id: 'autumn', name: 'Sonbahar', bg: '#fef2f2', card: '#ffffff', accent: '#dc2626', secondary: '#d97706', baseTheme: 'light' },
]

const TAILWIND_SHADES = [
  ['#f8fafc', '#fef2f2', '#fff7ed', '#fefce8', '#f0fdf4', '#eff6ff', '#f5f3ff', '#fdf2f8'],
  ['#f1f5f9', '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe', '#ede9fe', '#fce7f3'],
  ['#e2e8f0', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8'],
  ['#cbd5e1', '#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#c4b5fd', '#f9a8d4'],
  ['#94a3b8', '#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6'],
  ['#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'],
  ['#475569', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777'],
  ['#334155', '#b91c1c', '#c2410c', '#a16207', '#15803d', '#1d4ed8', '#6d28d9', '#be185d'],
  ['#1e293b', '#991b1b', '#9a3412', '#713f12', '#166534', '#1e40af', '#5b21b6', '#9d174d'],
  ['#0f172a', '#7f1d1d', '#7c2d12', '#422006', '#14532d', '#1e3a8a', '#4c1d95', '#831843'],
]

const STANDARD_COLORS = ['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#8b5cf6', '#ec4899']

function ColorGrid({ label, value, onChange }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium uppercase text-slate-500">{value}</span>
          <div className="group relative h-8 w-8 cursor-pointer overflow-hidden rounded-md border border-slate-300 shadow-sm">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute -left-2 -top-2 h-12 w-12 cursor-pointer appearance-none border-0 p-0"
              title="Özel Renk Seç (Eyedropper)"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
              <svg className="h-4 w-4 text-slate-800 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Shades Grid */}
      <div className="grid grid-cols-8 gap-1.5">
        {TAILWIND_SHADES.map((row, rowIndex) =>
          row.map((color, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              className={`h-6 w-full rounded-sm transition-all ${
                value.toLowerCase() === color.toLowerCase()
                  ? 'z-10 scale-110 ring-2 ring-blue-500 ring-offset-2'
                  : 'border border-slate-200/50 hover:z-10 hover:scale-110 hover:shadow-md'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              title={color}
            />
          ))
        )}
      </div>

      {/* Standard Colors */}
      <div className="mt-3 grid grid-cols-8 gap-1.5 border-t border-slate-100 pt-3">
        {STANDARD_COLORS.map((color) => (
          <button
            key={color}
            className={`h-6 w-full rounded-sm transition-all ${
              value.toLowerCase() === color.toLowerCase()
                ? 'z-10 scale-110 ring-2 ring-blue-500 ring-offset-2'
                : 'border border-slate-300 hover:z-10 hover:scale-110 hover:shadow-md'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
      </div>
    </div>
  )
}

export default function ThemeDashboardModal({ isOpen, onClose, onSave, onPreview, initialSettings }) {
  const [draft, setDraft] = useState(initialSettings)

  useEffect(() => {
    if (isOpen && initialSettings) {
      setDraft(initialSettings)
    }
  }, [isOpen, initialSettings])

  useEffect(() => {
    if (isOpen && draft) {
      onPreview(draft)
    }
  }, [draft, isOpen, onPreview])

  if (!isOpen || !draft) return null

  const isPresetSelected = (theme) => {
    if (!draft.bg || !draft.card || !draft.accent || !draft.secondary) return false
    return draft.bg.toLowerCase() === theme.bg.toLowerCase() && 
           draft.card.toLowerCase() === theme.card.toLowerCase() && 
           draft.accent.toLowerCase() === theme.accent.toLowerCase() &&
           draft.secondary.toLowerCase() === theme.secondary.toLowerCase()
  }

  const handleApplyPreset = (theme) => {
    setDraft((prev) => ({
      ...prev,
      bg: theme.bg,
      card: theme.card,
      accent: theme.accent,
      secondary: theme.secondary,
      theme: theme.baseTheme,
    }))
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm transition-all sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-slate-50 shadow-2xl ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Görünüm ve Tema Ayarları</h2>
            <p className="mt-1 text-sm text-slate-500">Uygulamanın renklerini ve parlaklığını özelleştirin.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          
          {/* Global Mod Seçimi (Açık/Koyu/Sepya) */}
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Ana Tema Modu</h3>
            <div className="flex w-full items-center gap-2 rounded-xl bg-slate-100 p-1.5 border border-slate-200">
              <button
                onClick={() => handleApplyPreset(PREDEFINED_THEMES.find(t => t.id === 'light'))}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all duration-200 ${isPresetSelected(PREDEFINED_THEMES.find(t => t.id === 'light')) ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ☀️ Açık
              </button>
              <button
                onClick={() => handleApplyPreset(PREDEFINED_THEMES.find(t => t.id === 'dark'))}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all duration-200 ${isPresetSelected(PREDEFINED_THEMES.find(t => t.id === 'dark')) ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                🌙 Koyu
              </button>
              <button
                onClick={() => handleApplyPreset(PREDEFINED_THEMES.find(t => t.id === 'sepia'))}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all duration-200 ${isPresetSelected(PREDEFINED_THEMES.find(t => t.id === 'sepia')) ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                🌿 Sepya
              </button>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Preset Themes (Chrome Style Split Circles) */}
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Hazır Temalar</h3>
            <div className="flex flex-wrap gap-4">
              {PREDEFINED_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleApplyPreset(theme)}
                  className={`group relative h-16 w-16 rounded-full shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                    isPresetSelected(theme) ? 'ring-4 ring-blue-500 ring-offset-2' : 'ring-1 ring-slate-200'
                  }`}
                  style={{ background: `conic-gradient(${theme.bg} 0 120deg, ${theme.accent} 120deg 240deg, ${theme.secondary} 240deg 360deg)` }}
                  title={theme.name}
                >
                  {isPresetSelected(theme) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-white/40 p-1 shadow-sm backdrop-blur-md">
                        <svg className="h-5 w-5 text-slate-900 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Background and Card Colors */}
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Zemin Renkleri</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorGrid label="Arka Plan" value={draft.bg} onChange={(c) => setDraft((prev) => ({ ...prev, bg: c }))} />
              <ColorGrid label="Kart Rengi" value={draft.card} onChange={(c) => setDraft((prev) => ({ ...prev, card: c }))} />
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Accent Colors */}
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Tema (Vurgu) Renkleri</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorGrid label="Vurgu Rengi" value={draft.accent} onChange={(c) => setDraft((prev) => ({ ...prev, accent: c }))} />
              <ColorGrid label="İkincil Vurgu" value={draft.secondary} onChange={(c) => setDraft((prev) => ({ ...prev, secondary: c }))} />
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Brightness */}
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Parlaklık</h3>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Ekran Parlaklığı</span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                    {(draft.brightness * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.01"
                  value={draft.brightness}
                  onChange={(e) => setDraft((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>Loş</span>
                  <span>Normal</span>
                  <span>Parlak</span>
                </div>
              </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            İptal
          </button>
          <button
            onClick={() => onSave(draft)}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </div>
    </div>
  )
}