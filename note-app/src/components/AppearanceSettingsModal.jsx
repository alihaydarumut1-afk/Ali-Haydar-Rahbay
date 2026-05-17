import { useState, useEffect } from 'react'

// HEX rengin parlaklığını ölçüp siyah veya beyaz metin rengi döndüren algoritma
function getContrastColor(hexColor) {
  if (!hexColor) return '#0f172a'
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#0f172a' : '#ffffff' // Parlaksa koyu lacivert, koyuysa beyaz
}

const FONTS = [
  { id: "'Inter', sans-serif", name: 'Modern & Temiz', label: 'Inter' },
  { id: "'Playfair Display', serif", name: 'Akademik & Klasik', label: 'Playfair' },
  { id: "'JetBrains Mono', monospace", name: 'Geliştirici Odaklı', label: 'JetBrains' },
]

const CORNERS = [
  { id: '0px', name: 'Keskin (Sharp)' },
  { id: '0.5rem', name: 'Yumuşak (Soft)' },
  { id: '1.5rem', name: 'Yuvarlak (Round)' },
]

const QUICK_COLOR_THEMES = [
  {
    id: 'pastel-dream',
    name: 'Pastel Rüya',
    colors: {
      Sidebar: '#ffffff',
      Noun: '#fdf2f8', 'Noun Header': '#fbcfe8',
      Verb: '#f0f9ff', 'Verb Header': '#bae6fd',
      Adjective: '#f0fdf4', 'Adjective Header': '#bbf7d0',
      'Phrasal Verb': '#f5f3ff', 'Phrasal Verb Header': '#ddd6fe',
    },
  },
  {
    id: 'academic-minimal',
    name: 'Akademik',
    colors: {
      Sidebar: '#0f172a',
      Noun: '#f8fafc', 'Noun Header': '#e2e8f0',
      Verb: '#f1f5f9', 'Verb Header': '#cbd5e1',
      Adjective: '#f3f4f6', 'Adjective Header': '#d1d5db',
      'Phrasal Verb': '#e2e8f0', 'Phrasal Verb Header': '#94a3b8',
    },
  },
  {
    id: 'vibrant-focus',
    name: 'Canlı & Odak',
    colors: {
      Sidebar: '#ffffff',
      Noun: '#fee2e2', 'Noun Header': '#fca5a5',
      Verb: '#dbeafe', 'Verb Header': '#93c5fd',
      Adjective: '#fef08a', 'Adjective Header': '#fde047',
      'Phrasal Verb': '#fed7aa', 'Phrasal Verb Header': '#fdba74',
    },
  },
  {
    id: 'nature-earth',
    name: 'Doğa Toprak',
    colors: {
      Sidebar: '#27272a', // Dark Zinc
      Noun: '#fefce8', 'Noun Header': '#fef08a',
      Verb: '#ecfccb', 'Verb Header': '#d9f99d',
      Adjective: '#ffedd5', 'Adjective Header': '#fdba74',
      'Phrasal Verb': '#dcfce7', 'Phrasal Verb Header': '#bbf7d0',
    },
  },
  {
    id: 'neon-nights',
    name: 'Neon Geceler',
    colors: {
      Sidebar: '#09090b',
      Noun: '#2e1065', 'Noun Header': '#4c1d95',
      Verb: '#082f49', 'Verb Header': '#1e3a8a',
      Adjective: '#022c22', 'Adjective Header': '#064e3b',
      'Phrasal Verb': '#450a0a', 'Phrasal Verb Header': '#7f1d1d',
    },
  },
]

const CATEGORIES = ['Noun', 'Verb', 'Adjective', 'Phrasal Verb']

export default function AppearanceSettingsModal({ isOpen, onClose, onSave, initialSettings }) {
  const [activeTab, setActiveTab] = useState('colors')
  const [draft, setDraft] = useState(initialSettings)

  useEffect(() => {
    if (isOpen) {
      setDraft(initialSettings)
      setActiveTab('colors')
    }
  }, [isOpen, initialSettings])

  if (!isOpen || !draft) return null

  const handleColorChange = (category, value) => {
    setDraft((prev) => ({
      ...prev,
      colors: { ...prev.colors, [category]: value }
    }))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div 
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-slate-50 shadow-2xl ring-1 ring-slate-900/5 lg:flex-row"
        onClick={(e) => e.stopPropagation()}
        data-modal
      >
        {/* Sol Panel - Ayarlar */}
        <div className="flex w-full flex-col lg:w-[60%] lg:border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Görünüm Ayarları</h2>
              <p className="mt-1 text-sm text-slate-500">Arayüzü ve kartları kişiselleştirin.</p>
            </div>
            <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-700 lg:hidden">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-100 px-6 pt-4">
            {['colors', 'typography', 'corners'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'colors' ? '🎨 Kart Renkleri' : tab === 'typography' ? '✍️ Tipografi' : '🔲 Köşeler'}
              </button>
            ))}
          </div>

          {/* İçerik Alanı */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'colors' && (
              <div className="space-y-8">
                {/* Hızlı Temalar Alanı */}
                <div>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Hızlı Temalar</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {QUICK_COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setDraft({ ...draft, colors: theme.colors })}
                        className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm focus:ring-2 focus:ring-slate-200"
                        title="Temayı Uygula"
                      >
                        <div className="flex h-6 w-full overflow-hidden rounded-md ring-1 ring-slate-900/10">
                          <div className="h-full flex-1" style={{ backgroundColor: theme.colors['Sidebar'] }} title="Sidebar" />
                          <div className="h-full flex-1" style={{ backgroundColor: theme.colors['Noun'] }} title="Noun" />
                          <div className="h-full flex-1" style={{ backgroundColor: theme.colors['Verb'] }} title="Verb" />
                          <div className="h-full flex-1" style={{ backgroundColor: theme.colors['Adjective'] }} title="Adjective" />
                          <div className="h-full flex-1" style={{ backgroundColor: theme.colors['Phrasal Verb'] }} title="Phrasal Verb" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Özel Renkler Alanı */}
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Özel Renkler</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <span className="font-semibold text-slate-700">Sidebar (Menü)</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-slate-400">{draft.colors['Sidebar']}</span>
                        <input 
                          type="color" 
                          value={draft.colors['Sidebar']} 
                          onChange={(e) => handleColorChange('Sidebar', e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded bg-transparent p-0"
                        />
                      </div>
                    </div>
                    
                    {CATEGORIES.map((cat) => (
                      <div key={cat} className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div>
                          <span className="mb-2 block text-xs font-semibold text-slate-700">{cat} (Kart)</span>
                          <div className="flex items-center gap-2">
                            <input type="color" value={draft.colors[cat]} onChange={(e) => handleColorChange(cat, e.target.value)} className="h-8 w-10 cursor-pointer rounded bg-transparent p-0"/>
                            <span className="font-mono text-xs text-slate-400">{draft.colors[cat]}</span>
                          </div>
                        </div>
                        <div>
                          <span className="mb-2 block text-xs font-semibold text-slate-700">{cat} (Başlık)</span>
                          <div className="flex items-center gap-2">
                            <input type="color" value={draft.colors[`${cat} Header`]} onChange={(e) => handleColorChange(`${cat} Header`, e.target.value)} className="h-8 w-10 cursor-pointer rounded bg-transparent p-0"/>
                            <span className="font-mono text-xs text-slate-400">{draft.colors[`${cat} Header`]}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-700">Yazı Tipi Ailesi</label>
                  <div className="grid gap-3">
                    {FONTS.map((font) => (
                      <button
                        key={font.id}
                        onClick={() => setDraft({ ...draft, typography: { ...draft.typography, fontFamily: font.id } })}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${
                          draft.typography.fontFamily === font.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-semibold text-slate-900" style={{ fontFamily: font.id }}>{font.name}</p>
                          <p className="text-xs text-slate-500">{font.label}</p>
                        </div>
                        {draft.typography.fontFamily === font.id && <span className="text-blue-600">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-slate-700">Metin Boyutu</label>
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{draft.typography.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="22"
                    step="1"
                    value={draft.typography.fontSize}
                    onChange={(e) => setDraft({ ...draft, typography: { ...draft.typography, fontSize: Number(e.target.value) } })}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-2">
                    <span>Küçük (14px)</span>
                    <span>Standart (16px)</span>
                    <span>Büyük (22px)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'corners' && (
              <div className="grid gap-4 sm:grid-cols-3">
                {CORNERS.map((corner) => (
                  <button
                    key={corner.id}
                    onClick={() => setDraft({ ...draft, corners: { radius: corner.id } })}
                    className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all ${
                      draft.corners.radius === corner.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="h-12 w-12 border-2 border-slate-300 bg-white" style={{ borderRadius: corner.id }} />
                    <span className="text-sm font-semibold text-slate-700">{corner.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
             <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              İptal
            </button>
            <button onClick={() => onSave(draft)} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
              Kaydet ve Uygula
            </button>
          </div>
        </div>

        {/* Sağ Panel - Canlı Ön İzleme */}
        <div className="hidden w-[40%] flex-col bg-slate-100 p-8 lg:flex border-l border-slate-200">
          <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-400">Canlı Ön İzleme</h3>
          <div 
            className="flex-1 space-y-4"
            style={{
              fontFamily: draft.typography.fontFamily,
              fontSize: `${draft.typography.fontSize}px`
            }}
          >
            {Object.keys(draft.colors).map((category, idx) => {
              const bgColor = draft.colors[category];
              const textColor = getContrastColor(bgColor);
              
              return (
                <div 
                  key={category} 
                  className="p-5 shadow-sm transition-all"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                    borderRadius: draft.corners.radius,
                  }}
                >
                  <div className="flex items-center justify-between mb-2 opacity-80">
                    <span className="text-xs font-bold uppercase tracking-wider">{category}</span>
                    <svg className="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                    </svg>
                  </div>
                  <p className="font-bold text-xl mb-1">
                    {idx === 0 ? 'Consciousness' : idx === 1 ? 'Determine' : idx === 2 ? 'Crucial' : 'Give up'}
                  </p>
                  <p className="text-sm opacity-90">
                    {idx === 0 ? 'Bilinç, şuur' : idx === 1 ? 'Belirlemek' : idx === 2 ? 'Çok önemli' : 'Vazgeçmek'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}