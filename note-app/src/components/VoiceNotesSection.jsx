import { useState, useMemo } from 'react'
import VoiceRecorder from './VoiceRecorder.jsx'
import SpeakingReport from './SpeakingReport.jsx'
import useSavedCreations from '../hooks/useSavedCreations.js'
import UniversalFocusMode from './UniversalFocusMode.jsx'

export default function VoiceNotesSection() {
  const [transcript, setTranscript] = useState('')
  const { creations } = useSavedCreations() || {}
  const safeCreations = Array.isArray(creations) ? creations : []
  const [selectedScriptId, setSelectedScriptId] = useState(null)
  const [isZenModeOpen, setIsZenModeOpen] = useState(false)

  const selectedScript = useMemo(
    () => safeCreations.find((c) => c.id === selectedScriptId) || null,
    [selectedScriptId, safeCreations]
  )

  return (
    <div className="space-y-6 font-sans text-slate-900">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* Sol Panel: Okuma Metinleri (Teleprompter) */}
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Reading & Dictation</p>
                <h2 className="text-2xl font-semibold text-slate-950">Teleprompter</h2>
              </div>
              {selectedScript && (
                <button
                  type="button"
                  onClick={() => setIsZenModeOpen(true)}
                  className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  📖 Focus Mode
                </button>
              )}
            </div>

            {/* Metin Seçici (Açılır Menü / Dropdown) */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Your Creative Lab Records</label>
              {safeCreations.length > 0 ? (
                <select
                  value={selectedScriptId || ''}
                  onChange={(e) => setSelectedScriptId(e.target.value)}
                  className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 eye-care:bg-sepia-surface eye-care:text-sepia-text px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="" disabled className="text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">Select a text to read...</option>
                  {safeCreations.map(c => (
                    <option key={c.id} value={c.id} className="text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">
                      {c.title || c.type || 'Untitled Text'} ({c.type})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  You haven't saved any texts from Creative Lab or Reading module yet.
                </div>
              )}
            </div>

            {/* Metin Gösterici (Dikey Scroll) */}
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6 h-[400px] overflow-y-auto custom-scrollbar">
              {selectedScript ? (
                <div className="whitespace-pre-wrap text-lg leading-loose text-slate-800 font-medium pb-8">
                  {selectedScript.text || selectedScript.content}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-slate-400">
                  Select a text from above to read aloud.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sağ Panel: Ses Kaydedici ve Rapor */}
        <div className="flex flex-col gap-6">
          <VoiceRecorder onTranscription={setTranscript} />
        </div>
      </div>

      <UniversalFocusMode
        isOpen={isZenModeOpen}
        onClose={() => setIsZenModeOpen(false)}
        content={selectedScript?.text || selectedScript?.content}
        title={selectedScript?.title || selectedScript?.type || 'Okuma Metni'}
        mode="voice"
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}} />
    </div>
  )
}