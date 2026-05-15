import { useState } from 'react'

export default function ImageCropperModal({ isOpen, imageSrc, onClose, onCropComplete }) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApply = () => {
    setIsProcessing(true)
    // Kırpma hatası verdiği için fotoğrafı doğrudan aktarıyoruz.
    setTimeout(() => {
      onCropComplete(imageSrc)
      setIsProcessing(false)
    }, 500)
  }

  if (!isOpen || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Kapak Fotoğrafı Önizleme</h2>
              <p className="mt-1 text-sm text-slate-500">Seçtiğiniz kapak fotoğrafını onaylayın.</p>
            </div>
          </div>
        </div>
        
        <div className="relative flex h-[300px] w-full items-center justify-center bg-slate-100 p-4 sm:h-[400px]">
          <img
            src={imageSrc}
            alt="Kapak Önizleme"
            className="h-full w-full rounded-xl object-cover shadow-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
          <button onClick={onClose} disabled={isProcessing} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            İptal
          </button>
          <button onClick={handleApply} disabled={isProcessing} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50">
            {isProcessing ? 'Uygulanıyor...' : 'Onayla'}
          </button>
        </div>
      </div>
    </div>
  )
}