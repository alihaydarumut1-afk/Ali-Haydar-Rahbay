import { useEffect } from 'react'

export default function FocusReadingMode({ text, title, onClose }) {

  useEffect(() => {
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
  }, [onClose])

  if (!text) return null

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Sadece bu ekrana özel Font ve Açık Renk Seçim (Baskın CSS) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap');
        .paper-reading-mode, .paper-reading-mode * { font-family: 'Merriweather', serif !important; }
        .paper-reading-mode ::selection { background-color: #c7d2fe; color: #1e1b4b; }
      `}} />
      
      {/* Sabit Sağ Üst Kapatma Butonu */}
      <button 
        onClick={onClose}
        className="fixed right-6 top-6 z-[110] rounded-full bg-slate-900/20 p-3 text-white/70 backdrop-blur-sm transition-all hover:scale-110 hover:bg-slate-900/40 hover:text-white"
        title="Kapat (ESC)"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* İçerik Sarmalayıcı (Ortalama ve Kaydırma İçin) */}
      <div className="flex min-h-full items-start justify-center p-4 sm:p-12">
        
        {/* Fiziksel A4 Kağıdı Efekti */}
        <div 
          className="paper-reading-mode relative my-8 w-full max-w-3xl shrink-0 bg-[#FAFAFA] px-8 py-16 shadow-[0_25px_65px_rgba(0,0,0,0.5)] sm:my-12 sm:px-20 sm:py-24"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <h1 className="mb-12 text-center text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              {title}
            </h1>
          )}
          
          <div className="space-y-6 text-lg text-slate-800 sm:text-xl">
            {text.split('\n\n').map((paragraph, index) => (
              <p key={index} className="whitespace-pre-wrap leading-loose">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}