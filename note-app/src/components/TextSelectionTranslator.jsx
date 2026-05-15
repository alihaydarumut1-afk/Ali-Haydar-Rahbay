import { useEffect, useRef, useState } from 'react'
import PronunciationButton from './PronunciationButton.jsx'

const WORD_TYPES = ['Noun', 'Verb', 'Adjective', 'Phrasal Verb', 'Other']

export default function TextSelectionTranslator({ onAddWord }) {
  // Tooltip State
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    translation: '',
    isLoading: false,
    isAdded: false,
    selectedType: null,
  })

  // FAB (Floating Action Button) State
  const [fabOpen, setFabOpen] = useState(false)
  const [fabText, setFabText] = useState('')
  const [fabTranslation, setFabTranslation] = useState('')
  const [fabLoading, setFabLoading] = useState(false)
  const [fabAdded, setFabAdded] = useState(false)
  const [fabSelectedType, setFabSelectedType] = useState('Other')

  // Sürükle-Bırak (Drag & Drop) State'leri
  const [pos, setPos] = useState({ x: null, y: null })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false })

  const tooltipRef = useRef(null)
  const fabRef = useRef(null)

  // MyMemory API ile Çeviri Fonksiyonu
  const fetchTranslation = async (text) => {
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|tr`)
      const data = await response.json()
      return data.responseData?.translatedText || 'Çeviri bulunamadı.'
    } catch (error) {
      console.error('Translation error:', error)
      return 'Çeviri hatası.'
    }
  }

  // Mouse ile metin seçimi (Highlight) dinleyicisi
  useEffect(() => {
    const handleMouseUp = async (e) => {
      if (tooltipRef.current?.contains(e.target) || fabRef.current?.contains(e.target)) return

      const selection = window.getSelection()
      const text = selection.toString().trim()

      if (text.length > 0 && text.length < 150) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        setTooltipState((prev) => ({
          ...prev,
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          text,
          translation: '',
          isLoading: true,
          isAdded: false,
          selectedType: null,
        }))

        const translated = await fetchTranslation(text)
        
        setTooltipState((prev) => ({
          ...prev,
          translation: translated,
          isLoading: false,
        }))
      } else {
        setTooltipState((prev) => ({ ...prev, visible: false }))
      }
    }

    const handleMouseDown = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setTooltipState((prev) => ({ ...prev, visible: false }))
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // FAB Çeviri İşlemi
  const handleFabTranslate = async () => {
    if (!fabText.trim()) return
    setFabLoading(true)
    setFabAdded(false)
    const translated = await fetchTranslation(fabText)
    setFabTranslation(translated)
    setFabLoading(false)
  }

  // Listeye Ekleme (Kelime Defterine Kayıt)
  const handleAddWord = (english, turkish, type, isFromTooltip) => {
    onAddWord({
      english: english.trim(),
      turkish: turkish.trim(),
      type: type || 'Other',
      ipa: '', // Çeviri kısmından kelime eklendiği için IPA boş bırakıldı
      sentence: '',
      collocation: '',
    })

    if (isFromTooltip) {
      setTooltipState((prev) => ({ ...prev, isAdded: true }))
      setTimeout(() => setTooltipState((prev) => ({ ...prev, visible: false })), 1500)
    } else {
      // FAB'dan ekleme
      setFabAdded(true)
      setFabText('')
      setTimeout(() => setFabAdded(false), 2000)
    }
  }

  // FAB Sürükleme Mantığı
  const handlePointerDown = (e) => {
    if (e.type === 'mousedown' && e.button !== 0) return // Sadece sol tık

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const rect = fabRef.current.getBoundingClientRect()

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
      moved: false
    }
    setIsDragging(true)
  }

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging) return
      if (e.cancelable) e.preventDefault() // Sürüklerken sayfa kaymasını engelle

      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY

      const dx = clientX - dragRef.current.startX
      const dy = clientY - dragRef.current.startY

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragRef.current.moved = true
      }

      let newX = dragRef.current.initialX + dx
      let newY = dragRef.current.initialY + dy

      const btnSize = 64 // w-16 = 64px
      newX = Math.max(0, Math.min(newX, window.innerWidth - btnSize))
      newY = Math.max(0, Math.min(newY, window.innerHeight - btnSize))

      setPos({ x: newX, y: newY })
    }

    const handlePointerUp = () => {
      if (isDragging) setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove, { passive: false })
      window.addEventListener('mouseup', handlePointerUp)
      window.addEventListener('touchmove', handlePointerMove, { passive: false })
      window.addEventListener('touchend', handlePointerUp)
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [isDragging])

  // Panel Konumunu (Nereye Açılacağını) Akıllı Hesaplama
  const isLeftHalf = pos.x !== null && pos.x < window.innerWidth / 2
  const isTopHalf = pos.y !== null && pos.y < window.innerHeight / 2
  const originClass = isTopHalf ? (isLeftHalf ? 'origin-top-left' : 'origin-top-right') : (isLeftHalf ? 'origin-bottom-left' : 'origin-bottom-right')
  const verticalClass = isTopHalf ? 'top-[calc(100%+16px)]' : 'bottom-[calc(100%+16px)]'
  const horizontalClass = isLeftHalf ? 'left-0' : 'right-0'

  return (
    <>
      {/* Highlight-to-Translate Tooltip */}
      {tooltipState.visible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] flex flex-col items-center shadow-xl animate-fade-in"
          style={{
            left: `${tooltipState.x}px`,
            top: `${tooltipState.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex w-72 flex-col gap-3 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl">
            {tooltipState.isLoading ? (
              <div className="flex items-center gap-2 px-2 py-1">
                <svg className="h-4 w-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs font-semibold text-slate-300">Çevriliyor...</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/50 pb-2">
                    <p className="text-xs text-slate-400 line-clamp-2" title={tooltipState.text}>{tooltipState.text}</p>
                    <div className="-mr-2 -my-2 shrink-0"><PronunciationButton text={tooltipState.text} /></div>
                  </div>
                  <p className="text-base font-semibold leading-relaxed">{tooltipState.translation}</p>
                </div>
                <div className="mt-1 space-y-3 border-t border-slate-700 pt-3">
                  <p className="text-xs font-semibold text-slate-300">Kelime Türünü Seçin:</p>
                  <div className="flex flex-wrap gap-2">
                    {WORD_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => setTooltipState(prev => ({ ...prev, selectedType: type }))}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          tooltipState.selectedType === type ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddWord(tooltipState.text, tooltipState.translation, tooltipState.selectedType, true)}
                    disabled={tooltipState.isAdded || !tooltipState.selectedType}
                    className="mt-2 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-emerald-600 disabled:opacity-70"
                  >
                    {tooltipState.isAdded ? '✓ Eklendi' : '+ Listeme Ekle'}
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Tooltip Oku */}
          <div className="h-0 w-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-900"></div>
        </div>
      )}

      {/* Floating Action Button (FAB) & Translator Panel */}
      <div 
        ref={fabRef} 
        className={`fixed z-[9999] ${pos.x === null ? 'bottom-6 right-6' : ''}`}
        style={pos.x !== null ? { left: `${pos.x}px`, top: `${pos.y}px` } : {}}
      >
        {fabOpen && (
          <div 
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`absolute ${verticalClass} ${horizontalClass} ${originClass} w-80 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl animate-fade-in sm:w-96 cursor-default`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌐</span>
                <h3 className="font-semibold text-slate-900">Hızlı Çeviri</h3>
              </div>
              <button onClick={() => setFabOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">İngilizce Metin</label>
              {fabText.trim() && (
                <div className="-mr-2 -my-2"><PronunciationButton text={fabText} /></div>
              )}
            </div>
              <textarea
                value={fabText}
                onChange={(e) => setFabText(e.target.value)}
                placeholder="Çevirmek istediğiniz kelime veya cümleyi girin..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                rows="3"
              />
              <button
                onClick={handleFabTranslate}
                disabled={fabLoading || !fabText.trim()}
                className="mt-3 w-full rounded-xl bg-slate-950 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {fabLoading ? 'Çevriliyor...' : 'Çevir'}
              </button>

              {fabTranslation && (
                <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-800">{fabTranslation}</p>
                  <div className="space-y-3 border-t border-indigo-200 pt-3">
                    <p className="text-xs font-semibold text-slate-600">Kelime Türü:</p>
                    <div className="flex flex-wrap gap-2">
                      {WORD_TYPES.map(type => (
                        <button
                          key={type}
                          onClick={() => setFabSelectedType(type)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                            fabSelectedType === type ? 'bg-indigo-600 text-white' : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleAddWord(fabText, fabTranslation, fabSelectedType, false)}
                      disabled={fabAdded}
                      className="!mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:bg-emerald-600"
                    >
                      {fabAdded ? '✓ Kelime Listesine Eklendi' : '+ Kelime Listesine Ekle'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onClick={(e) => {
            if (dragRef.current.moved) {
              e.preventDefault()
              return
            }
            setFabOpen(!fabOpen)
          }}
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl shadow-slate-900/30 transition-transform focus:outline-none focus:ring-4 focus:ring-slate-300 ${isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-110 hover:bg-slate-800 cursor-grab'}`}
          title="Sözlük / Çeviri (Sürükleyebilirsiniz)"
        >
          {fabOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          )}
        </button>
      </div>
    </>
  )
}