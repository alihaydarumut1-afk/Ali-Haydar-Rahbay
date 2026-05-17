import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Login from './components/Login.jsx'
import MainLayout from './components/MainLayout.jsx'
import FlashcardGame from './components/FlashcardGame.jsx'
import GrammarSection from './components/GrammarSection.jsx'
import QuizGame from './components/QuizGame.jsx'
import VoiceNotesSection from './components/VoiceNotesSection.jsx'
import AudioSection from './components/AudioSection.jsx'
import ReadingSection from './components/ReadingSection.jsx'
import WritingSection from './components/WritingSection.jsx'
import CreativeLab from './components/CreativeLab.jsx'
import ImmersionStudio from './components/ImmersionStudio.jsx'
import SpeakingStudio from './components/SpeakingStudio.jsx'
import WordTable from './components/WordTable.jsx'
import ThemeDashboardModal from './components/ThemeDashboardModal.jsx'
import AppearanceSettingsModal from './components/AppearanceSettingsModal.jsx'
import PersonalizedHeader from './components/PersonalizedHeader.jsx'
import useWords from './hooks/useWords.js'
import useReadings from './hooks/useReadings.js'
import TextSelectionTranslator from './components/TextSelectionTranslator.jsx'
import RandomWordWidget from './components/RandomWordWidget.jsx'
import DashboardGrid from './components/DashboardGrid.jsx'
import TodoList from './components/TodoList.jsx'

const APPEARANCE_STORAGE_KEY = 'appAppearanceSettings'
const THEME_STORAGE_KEY = 'appThemeSettings'
const defaultTheme = { theme: 'light', bg: '#f8f9fa', card: '#ffffff', accent: '#1a73e8', secondary: '#fbbc04', brightness: 1 }

const defaultAppearance = {
  colors: {
    Sidebar: '#0f172a',
    Noun: '#f1f5f9',
    'Noun Header': '#e2e8f0',
    Verb: '#e0f2fe',
    'Verb Header': '#bae6fd',
    Adjective: '#f3e8ff',
    'Adjective Header': '#d8b4fe',
    'Phrasal Verb': '#ffedd5',
    'Phrasal Verb Header': '#fed7aa',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
  },
  corners: {
    radius: '1rem',
  }
}

// ✅ Eşik 128→160: açık arka planlarda koyu metin daha erken seçilir
function getContrastColor(hexColor) {
  if (!hexColor) return '#0f172a'
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#0f172a' : '#f8fafc'  // koyu→açık için saf beyaz yerine off-white
}

function CreativeLabWrapper({ words }) {
  const navigate = useNavigate()
  return <CreativeLab words={words} onPractice={() => navigate('/voice')} />
}

export default function App() {
  const { words, addWord, updateWord, removeWord } = useWords()
  const { readings, addReading, updateReading } = useReadings()

  const [user, setUser] = useState(undefined)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false)

  const [isBlurEnabled, setIsBlurEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const saved = localStorage.getItem('noteapp_blur_enabled')
      return saved !== null ? JSON.parse(saved) : true
    } catch { return true }
  })

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [previewTheme, setPreviewTheme] = useState(null)
  const [themeSettings, setThemeSettings] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : defaultTheme
      if (!parsed.secondary) parsed.secondary = defaultTheme.secondary
      return parsed
    } catch { return defaultTheme }
  })

  const [appearance, setAppearance] = useState(() => {
    if (typeof window === 'undefined') return defaultAppearance
    try {
      const saved = localStorage.getItem(APPEARANCE_STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : defaultAppearance
      if (parsed.colors && !parsed.colors.Sidebar) parsed.colors.Sidebar = '#0f172a'
      if (parsed.colors && !parsed.colors['Noun Header']) {
        parsed.colors['Noun Header'] = '#e2e8f0'
        parsed.colors['Verb Header'] = '#bae6fd'
        parsed.colors['Adjective Header'] = '#d8b4fe'
        parsed.colors['Phrasal Verb Header'] = '#fed7aa'
      }
      return parsed
    } catch { return defaultAppearance }
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance)) } catch {}
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeSettings)) } catch {}
  }, [appearance, themeSettings])

  const activeTheme = previewTheme || themeSettings
  const baseIsDark = activeTheme.baseTheme === 'dark' || getContrastColor(activeTheme.bg) === '#f8fafc'

  const styleVars = {
    '--font-main': appearance.typography.fontFamily,
    '--base-size': `${appearance.typography.fontSize}px`,
    '--card-radius': appearance.corners.radius,
    '--bg-main': activeTheme.bg,
    '--bg-sidebar': appearance.colors?.['Sidebar'] || defaultAppearance.colors['Sidebar'],
    '--text-sidebar': getContrastColor(appearance.colors?.['Sidebar'] || defaultAppearance.colors['Sidebar']),
    // ✅ Kontrast artırıldı: koyu mod için daha parlak beyaz, açık mod için daha koyu siyah
    '--text-main': baseIsDark ? '#f1f5f9' : '#0f172a',
    '--text-muted': baseIsDark ? '#cbd5e1' : '#475569',  // ✅ eskiden 94a3b8/64748b → daha okunaklı
    '--border-color': baseIsDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
    '--hover-bg': baseIsDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
    '--bg-noun': appearance.colors['Noun'] || defaultAppearance.colors['Noun'],
    '--text-noun': getContrastColor(appearance.colors['Noun'] || defaultAppearance.colors['Noun']),
    '--bg-noun-header': appearance.colors['Noun Header'] || defaultAppearance.colors['Noun Header'],
    '--text-noun-header': getContrastColor(appearance.colors['Noun Header'] || defaultAppearance.colors['Noun Header']),
    '--bg-verb': appearance.colors['Verb'] || defaultAppearance.colors['Verb'],
    '--text-verb': getContrastColor(appearance.colors['Verb'] || defaultAppearance.colors['Verb']),
    '--bg-verb-header': appearance.colors['Verb Header'] || defaultAppearance.colors['Verb Header'],
    '--text-verb-header': getContrastColor(appearance.colors['Verb Header'] || defaultAppearance.colors['Verb Header']),
    '--bg-adjective': appearance.colors['Adjective'] || defaultAppearance.colors['Adjective'],
    '--text-adjective': getContrastColor(appearance.colors['Adjective'] || defaultAppearance.colors['Adjective']),
    '--bg-adjective-header': appearance.colors['Adjective Header'] || defaultAppearance.colors['Adjective Header'],
    '--text-adjective-header': getContrastColor(appearance.colors['Adjective Header'] || defaultAppearance.colors['Adjective Header']),
    '--bg-phrasalverb': appearance.colors['Phrasal Verb'] || defaultAppearance.colors['Phrasal Verb'],
    '--text-phrasalverb': getContrastColor(appearance.colors['Phrasal Verb'] || defaultAppearance.colors['Phrasal Verb']),
    '--bg-phrasalverb-header': appearance.colors['Phrasal Verb Header'] || defaultAppearance.colors['Phrasal Verb Header'],
    '--text-phrasalverb-header': getContrastColor(appearance.colors['Phrasal Verb Header'] || defaultAppearance.colors['Phrasal Verb Header']),
    '--secondary': activeTheme.secondary || '#fbbc04',
  }

  const handleSaveAppearance = (draft) => { setAppearance(draft); setIsAppearanceModalOpen(false) }
  const handleSaveTheme = (draft) => { setThemeSettings(draft); setIsThemeModalOpen(false); setPreviewTheme(null) }
  const toggleBlur = () => {
    setIsBlurEnabled(prev => {
      const next = !prev
      localStorage.setItem('noteapp_blur_enabled', JSON.stringify(next))
      window.dispatchEvent(new Event('blur_setting_changed'))
      return next
    })
  }

  const renderHeaderAndThemeMenu = (title, isDashboard = false) => (
    <>
      {isDashboard && <PersonalizedHeader />}
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {isDashboard ? 'Dashboard' : title}
          </h2>
        </div>
        <div className="relative z-50 flex w-full md:w-auto items-center justify-center md:justify-end gap-3">
          {isDashboard && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="tour-settings flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                title="Gelişmiş Görünüm Ayarları"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl border border-slate-100 bg-white py-2 shadow-xl z-50">
                    <button onClick={toggleBlur} className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <div className="flex items-center gap-3"><span className="text-lg">👁️</span>Buğulu Çeviri</div>
                      <div className={`relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isBlurEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        <div className={`absolute h-4 w-4 rounded-full bg-white transition-transform ${isBlurEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
                      </div>
                    </button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button onClick={() => { setIsThemeModalOpen(true); setIsMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><span className="text-lg">🎨</span>Tema Ayarları</button>
                    <button onClick={() => { setIsAppearanceModalOpen(true); setIsMenuOpen(false) }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><span className="text-lg">✨</span>Gelişmiş Görünüm</button>
                    <div className="my-1 border-t border-slate-100"></div>
                    <button onClick={() => signOut(auth)} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><span className="text-lg">🚪</span>Çıkış Yap</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-white"></div>
      </div>
    )
  }

  if (user === null) {
    return <Login />
  }

  return (
    <HashRouter>
      <div className="min-h-screen overflow-x-hidden transition-colors duration-300" style={{ ...styleVars, fontSize: 'var(--base-size)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', '--card-bg': activeTheme.card, '--accent': activeTheme.accent }}>
        {activeTheme.brightness && activeTheme.brightness !== 1 && (
          <div className="pointer-events-none fixed inset-0 z-[99999] transition-colors duration-300" style={{ backgroundColor: activeTheme.brightness < 1 ? `rgba(0, 0, 0, ${1 - activeTheme.brightness})` : `rgba(255, 255, 255, ${(activeTheme.brightness - 1) * 0.5})` }} />
        )}
        <style dangerouslySetInnerHTML={{ __html: `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap');
  * { font-family: var(--font-main) !important; }

  /* Modal içindeki elementleri override'dan muaf tut */
  [data-modal] .bg-white { background-color: #ffffff !important; }
  [data-modal] .bg-slate-50 { background-color: #f8fafc !important; }
  [data-modal] .bg-slate-100 { background-color: #f1f5f9 !important; }
  [data-modal] .text-slate-900, [data-modal] .text-slate-800 { color: #0f172a !important; }
  [data-modal] .text-slate-700, [data-modal] .text-slate-600 { color: #334155 !important; }
  [data-modal] .text-slate-500, [data-modal] .text-slate-400 { color: #64748b !important; }
  [data-modal] .border-slate-200, [data-modal] .border-slate-100 { border-color: #e2e8f0 !important; }

  /* Normal sayfa override'ları */
  .bg-white { background-color: var(--card-bg) !important; border-color: var(--border-color) !important; }
  .bg-slate-50, .bg-zinc-50, .bg-slate-100, .bg-zinc-100 { background-color: var(--hover-bg) !important; border-color: var(--border-color) !important; }
  .text-slate-950, .text-slate-900, .text-slate-800, .text-zinc-900, .text-zinc-800 { color: var(--text-main) !important; }
  .text-slate-700, .text-slate-600, .text-slate-500, .text-zinc-600, .text-zinc-500, .text-zinc-400 { color: var(--text-muted) !important; }
  .border-slate-200, .border-slate-100, .border-zinc-200 { border-color: var(--border-color) !important; }
  .bg-slate-950, .bg-slate-900, .bg-zinc-900 { background-color: var(--accent) !important; color: #ffffff !important; border-color: var(--accent) !important; }

  /* Placeholder ve input renkleri */
  ::placeholder { color: #6b7280 !important; opacity: 1 !important; }
  input, textarea, select { color: var(--text-main) !important; }

  @keyframes pageFadeIn { from { opacity: 0; transform: translateY(12px) scale(0.995); } to { opacity: 1; transform: none; } }
  .page-transition { animation: pageFadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
`}} />
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<>{renderHeaderAndThemeMenu('Dashboard', true)}<DashboardGrid /></>} />
            <Route path="/tasks" element={<>{renderHeaderAndThemeMenu('Daily Tasks')}<TodoList /></>} />
            <Route path="/words" element={<>{renderHeaderAndThemeMenu('Kelime Listesi')}<WordTable words={words} onAddWord={addWord} onUpdateWord={updateWord} onDeleteWord={removeWord} /></>} />
            <Route path="/flashcard" element={<>{renderHeaderAndThemeMenu('Flashcard Modu')}<FlashcardGame words={words} onUpdateWord={updateWord} /></>} />
            <Route path="/quiz" element={<>{renderHeaderAndThemeMenu('Quiz Modu')}<QuizGame words={words} /></>} />
            <Route path="/grammar" element={<>{renderHeaderAndThemeMenu('Grammar Notes')}<GrammarSection /></>} />
            <Route path="/voice" element={<>{renderHeaderAndThemeMenu('Voice Notes')}<VoiceNotesSection /></>} />
            <Route path="/audio" element={<>{renderHeaderAndThemeMenu('Audio Lab')}<AudioSection /></>} />
            <Route path="/reading" element={<>{renderHeaderAndThemeMenu('Reading Center')}<ReadingSection updateReading={updateReading} /></>} />
            <Route path="/speaking-studio" element={<>{renderHeaderAndThemeMenu('Speaking Studio')}<SpeakingStudio /></>} />
            <Route path="/writing" element={<>{renderHeaderAndThemeMenu('Writing Lab')}<WritingSection /></>} />
            <Route path="/creative-lab" element={<>{renderHeaderAndThemeMenu('Creative Lab')}<CreativeLabWrapper words={words} /></>} />
            <Route path="/immersion" element={<>{renderHeaderAndThemeMenu('Media Lab')}<ImmersionStudio /></>} />
          </Route>
        </Routes>
        <AppearanceSettingsModal isOpen={isAppearanceModalOpen} onClose={() => setIsAppearanceModalOpen(false)} onSave={handleSaveAppearance} initialSettings={appearance} />
        <ThemeDashboardModal isOpen={isThemeModalOpen} onClose={() => { setIsThemeModalOpen(false); setPreviewTheme(null) }} onSave={handleSaveTheme} onPreview={setPreviewTheme} initialSettings={themeSettings} />
        <TextSelectionTranslator onAddWord={addWord} />
      </div>
    </HashRouter>
  )
}