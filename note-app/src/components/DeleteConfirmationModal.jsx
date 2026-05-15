export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, customMessage }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Silme Onayı</h2>
        <p className="mb-6 text-slate-700">
          {customMessage || `"${itemName}" öğesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Evet, Sil
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}