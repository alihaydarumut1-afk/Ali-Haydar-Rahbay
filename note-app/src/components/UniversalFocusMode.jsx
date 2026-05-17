import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ExportButtons from './ExportButtons.jsx'

const THEMES = {
  daylight: { bg: '#FBF9F6', text: '#333333', label: 'Güneş Işığı' },
  sepia: { bg: '#F4ECD8', text: '#433E3F', label: 'Sepya' },
  oled: { bg: '#121212', text: '#B3B3B3', label: 'Gece Uçuşu' }
}

export default function UniversalFocusMode({ isOpen, onClose, content, mode = 'read', title, onChange, activeSentence }) {
  const textareaRef = useRef(null)
  const [theme, setTheme] = useState('daylight')
  const [fontFamily, setFontFamily] = useState('Merriweather')
  const [fontSize, setFontSize] = useState(20)
  const [warmth, setWarmth] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    
    // Arkada kalan sayfanın kaymasını (scroll) engelle
    document.body.style.overflow = 'hidden'
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  // Yazma (Write) modunda textarea yüksekliğini içeriğe göre otomatik ayarla
  useEffect(() => {
    if (isOpen && mode === 'write' && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isOpen, mode, content])

  if (!isOpen) return null

  const handleTextareaChange = (e) => {
    if (onChange) onChange(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const renderContent = () => {
    if (mode === 'write') {
      return (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          placeholder="Yazmaya başlayın..."
          className="w-full min-h-[60vh] resize-none bg-transparent leading-loose outline-none"
          style={{ color: 'inherit' }}
        />
      )
    }
    
    if (mode === 'voice') {
      return (
        <div className="text-3xl leading-relaxed font-medium" style={{ color: 'inherit', fontSize: `${fontSize * 1.25}px` }}>
          {content?.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-8 whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      )
    }

    if (mode === 'grammar') {
      const matches = String(content || '').match(/[^.!?]+[.!?]*/g) || []
      const sentences = matches.map(s => s.trim()).filter(Boolean)
      
      return (
        <div className="leading-loose" style={{ color: 'inherit' }}>
          {sentences.map((sentence, i) => {
            let isActive = false
            if (activeSentence) {
              const cleanExact = String(activeSentence).replace(/[^\w\s]/gi, '').toLowerCase().trim()
              const cleanS = String(sentence).replace(/[^\w\s]/gi, '').toLowerCase().trim()
              if (cleanS && cleanExact && (cleanS.includes(cleanExact) || cleanExact.includes(cleanS))) {
                isActive = true
              }
            }
            return (
              <span key={i} className={`transition-colors duration-500 ${isActive ? 'rounded bg-yellow-200 px-1.5 py-0.5 text-slate-900 shadow-sm' : ''}`}>
                {sentence}{' '}
              </span>
            )
          })}
        </div>
      )
    }

    // Varsayılan (read) mod
    return (
      <div className="space-y-6" style={{ color: 'inherit' }}>
        {content?.split('\n\n').map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap leading-loose">
            {paragraph}
          </p>
        ))}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        .paper-reading-mode, .paper-reading-mode * { font-family: '${fontFamily}', serif !important; }
        .paper-reading-mode ::selection { background-color: #c7d2fe; color: #1e1b4b; }
      `}} />
      
      {/* Mavi Işık (Night Shift) Filtresi */}
      <div 
        className="pointer-events-none fixed inset-0 z-[105] mix-blend-multiply transition-opacity duration-300"
        style={{ backgroundColor: '#f97316', opacity: warmth / 150 }}
      />

      {/* Üst Kontrol Menüsü */}
      <div className="fixed right-6 top-6 z-[110] flex items-center gap-3">
        <ExportButtons elementId="universal-focus-content" fileName={title || 'Document'} />
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen) }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 font-serif text-xl text-white/90 backdrop-blur-sm transition-all hover:scale-110 hover:bg-slate-900/60 hover:text-white"
            title="Okuma Tercihleri"
          >
            Aa
          </button>
          
          {isSettingsOpen && (
            <div 
              className="absolute right-0 top-16 w-72 rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl animate-fade-in sm:w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Yazı Tipi & Boyut</h3>
              <div className="mb-6 space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setFontFamily('Merriweather')} className={`flex-1 rounded-xl border py-2 text-sm font-bold transition ${fontFamily === 'Merriweather' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`} style={{ fontFamily: 'Merriweather' }}>Serif</button>
                  <button onClick={() => setFontFamily('Inter')} className={`flex-1 rounded-xl border py-2 text-sm font-bold transition ${fontFamily === 'Inter' ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`} style={{ fontFamily: 'Inter, sans-serif' }}>Sans</button>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-1">
                  <button onClick={() => setFontSize(f => Math.max(14, f - 2))} className="flex h-10 w-12 items-center justify-center rounded-lg text-sm font-bold text-slate-300 hover:bg-white/10">A-</button>
                  <span className="text-sm font-bold text-slate-400">{fontSize}px</span>
                  <button onClick={() => setFontSize(f => Math.min(32, f + 2))} className="flex h-10 w-12 items-center justify-center rounded-lg text-lg font-bold text-slate-300 hover:bg-white/10">A+</button>
                </div>
              </div>

              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Tematik Profiller</h3>
              <div className="mb-6 grid grid-cols-3 gap-3">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-4 transition-all ${theme === key ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/20' : 'border-transparent hover:bg-white/10'}`}
                    style={{ backgroundColor: t.bg, color: t.text }}
                    title={t.label}
                  >
                    <span className="font-serif text-2xl font-bold">Aa</span>
                  </button>
                ))}
              </div>

              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Mavi Işık / Sıcaklık</h3>
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
                <span className="text-lg">☀️</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={warmth}
                  onChange={(e) => setWarmth(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-orange-400"
                />
                <span className="text-lg">🌙</span>
              </div>
            </div>
          )}
        </div>

        <button onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/40 text-white/90 backdrop-blur-sm transition-all hover:scale-110 hover:bg-slate-900/60 hover:text-white" title="Kapat (ESC)">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Flexbox scroll hesaplama hatalarını önleyen blok ve mx-auto yapısı */}
      <div className="w-full min-h-screen px-4 py-8 sm:px-12 sm:py-12">
        {/* A4 Kağıdı */}
        <div 
          id="universal-focus-content"
          className="paper-reading-mode mx-auto relative h-auto min-h-[80vh] w-full max-w-3xl px-8 py-16 shadow-[0_25px_65px_rgba(0,0,0,0.5)] transition-colors duration-500 sm:px-20 sm:py-24"
          onClick={(e) => {
            e.stopPropagation()
            setIsSettingsOpen(false)
          }}
          style={{ backgroundColor: THEMES[theme].bg, color: THEMES[theme].text, fontSize: `${fontSize}px` }}
        >
          {title && (
            <h1 className="mb-12 text-center font-bold leading-tight" style={{ color: 'inherit', fontSize: `${fontSize * 1.5}px` }}>
              {title}
            </h1>
          )}
          {renderContent()}
        </div>
      </div>
    </div>
  , document.body)
}