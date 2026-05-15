import { useState } from 'react'
import UniversalFocusMode from './UniversalFocusMode.jsx'

const FORMAT_LABELS = {
  dialogue: '💬 Dialogue',
  academic: '🎓 Academic',
  news: '📰 News',
}

export default function SavedCreationsDrawer({ isOpen, onClose, creations, onDelete, mode = 'sidebar', onSelect }) {
  const [filter, setFilter] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [zenReading, setZenReading] = useState(null)

  if (!isOpen && mode === 'sidebar') return null

  const filteredCreations = filter === 'All' ? creations : creations.filter(c => c.type === filter)

  const handleCopy = (id, content) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Kaydedilmiş metinlerde hedef kelimeleri vurgulayan fonksiyon
  const renderHighlightedContent = (text, targetWords) => {
    if (!text) return null
    if (!targetWords || targetWords.length === 0) return text

    const regex = new RegExp(`\\b(${targetWords.join('|')})\\b`, 'gi')
    const parts = text.split(regex)

    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (targetWords.some(w => w.toLowerCase() === part.toLowerCase())) {
            return <strong key={index} className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-900 shadow-sm">{part}</strong>
          }
          return <span key={index}>{part}</span>
        })}
      </span>
    )
  }

  const isInline = mode === 'inline'

  const contentList = (
    <div className={`flex-1 overflow-y-auto space-y-4 ${isInline ? 'p-4 max-h-[280px] custom-scrollbar' : 'p-6'}`}>
      {filteredCreations.length === 0 ? (
        <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center text-slate-500 ${isInline ? 'p-6' : 'p-10'}`}>
          <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="font-semibold text-slate-900">Archive is Empty</p>
          <p className="mt-1 text-sm">There are no saved texts to show here.</p>
        </div>
      ) : (
        filteredCreations.map((creation) => {
          if (isInline) {
            return (
              <button
                key={creation.id}
                type="button"
                onClick={() => onSelect && onSelect(creation.content)}
                className="flex w-full flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <span className="font-bold text-lg text-indigo-700 truncate w-full block border-b border-slate-100 pb-2 mb-2">
                  {creation.title || FORMAT_LABELS[creation.type] || 'Untitled Document'}
                </span>
                <div className="flex w-full items-center justify-between">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {FORMAT_LABELS[creation.type]}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(creation.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <p className="text-sm text-slate-700 break-words w-full text-left">
                  {creation.content?.length > 60 ? creation.content.substring(0, 60) + '...' : creation.content}
                </p>
              </button>
            )
          }

          const isExpanded = expandedId === creation.id
          return (
            <div key={creation.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <span className="font-bold text-lg text-indigo-700 truncate w-full block border-b border-slate-100 pb-2 mb-2">
                {creation.title || FORMAT_LABELS[creation.type] || 'Untitled Document'}
              </span>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {FORMAT_LABELS[creation.type]}
                  </span>
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {new Date(creation.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setZenReading(creation)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" title="Focus Read">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  </button>
                  <button onClick={() => handleCopy(creation.id, creation.content)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600" title="Copy">
                    {copiedId === creation.id ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                  </button>
                  <button onClick={() => onDelete(creation.id)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-3 flex flex-wrap gap-1.5">
                {creation.targetWords.map((word, i) => (
                  <span key={i} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    #{word}
                  </span>
                ))}
              </div>

              <div className={`relative text-sm text-slate-700 leading-relaxed ${!isExpanded && 'line-clamp-4'}`}>
                {renderHighlightedContent(creation.content, creation.targetWords)}
                {!isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
                )}
              </div>

              <button 
                onClick={() => setExpandedId(isExpanded ? null : creation.id)} 
                className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                {isExpanded ? 'Show Less' : 'Read More'}
              </button>
            </div>
          )
        })
      )}
    </div>
  )

  if (isInline) {
    return (
      <div className="flex w-full flex-col bg-slate-50 border-t border-indigo-100">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 hide-scrollbar">
          {['All', 'dialogue', 'academic', 'news'].map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f === 'All' ? 'All' : FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
        {contentList}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="relative flex w-full max-w-md flex-col bg-slate-50 shadow-2xl transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-900">My Saved Texts</h2>
              <p className="text-xs font-medium text-slate-500">{creations.length} Archived Items</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-6 py-4 hide-scrollbar">
          {['All', 'dialogue', 'academic', 'news'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f === 'All' ? 'All' : FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        {contentList}
      </div>
      
      {/* Hide Scrollbar Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

    <UniversalFocusMode
      isOpen={!!zenReading}
      content={zenReading?.content}
      title={zenReading ? (zenReading.title || FORMAT_LABELS[zenReading.type]) : ''}
      onClose={() => setZenReading(null)}
      mode="read"
    />
    </div>
  )
}