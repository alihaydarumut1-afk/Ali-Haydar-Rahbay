import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import useGrammarNotes from '../hooks/useGrammarNotes.js'
import useSavedCreations from '../hooks/useSavedCreations.js'
import SavedCreationsDrawer from './SavedCreationsDrawer.jsx'
import GrammarAnalyzer from './GrammarAnalyzer.jsx'

export default function GrammarSection() {
  const { notes, addNote, updateNote, deleteNote } = useGrammarNotes() || {}
  const safeNotes = Array.isArray(notes) ? notes : []
  const { creations } = useSavedCreations() || {}
  const safeCreations = Array.isArray(creations) ? creations : []
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('notes')

  const [isDrawerOpen, setIsDrawerOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('grammar_drawer_open')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  const [savedAnalyses, setSavedAnalyses] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('grammar_saved_analyses') || '{}')
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    if (!isAnalyzing) {
      try {
        const parsed = JSON.parse(localStorage.getItem('grammar_saved_analyses') || '{}')
        setSavedAnalyses((parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {})
      } catch {}
    }
  }, [isAnalyzing])

  const filteredNotes = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase()
    return safeNotes.filter(
      (note) => {
        if (!note) return false
        const title = String(note.title || '').toLowerCase()
        const content = String(note.content || '').toLowerCase()
        return title.includes(query) || content.includes(query)
      }
    )
  }, [safeNotes, searchQuery])

  const filteredAnalyses = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase()
    return Object.values(savedAnalyses || {})
      .filter(a => a && !Array.isArray(a) && a.id)
      .filter(a => {
        const title = String(a.title || '').toLowerCase()
        const content = String(a.content || '').toLowerCase()
        return title.includes(query) || content.includes(query)
      })
  }, [savedAnalyses, searchQuery])

  const currentSelectedItem = useMemo(() => {
    if (selectedId === 'new') return null
    if (activeTab === 'notes') {
      return safeNotes.find((note) => note.id === selectedId) || filteredNotes[0] || null
    } else {
      return (savedAnalyses && savedAnalyses[selectedId]) || filteredAnalyses[0] || null
    }
  }, [activeTab, selectedId, safeNotes, filteredNotes, savedAnalyses, filteredAnalyses])

  useEffect(() => {
    if (currentSelectedItem) {
      setDraftTitle(currentSelectedItem.title || '')
      setDraftContent(currentSelectedItem.content || '')
      setIsEditing(true)
    } else {
      setDraftTitle('')
      setDraftContent('')
      setIsEditing(false)
    }
  }, [currentSelectedItem, activeTab])

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setIsAnalyzing(false)
    setSelectedId(null)
  }

  const handleSelectNote = (item) => {
    setSelectedId(item.id)
    setIsAnalyzing(false)
  }

  const handleNewNote = () => {
    setActiveTab('notes')
    setSelectedId('new')
    setDraftTitle('')
    setDraftContent('')
    setIsEditing(false)
    setIsAnalyzing(false)
  }

  const handleSave = (event) => {
    event.preventDefault()
    if (!String(draftTitle || '').trim() || !String(draftContent || '').trim()) {
      return
    }

    if (activeTab === 'notes') {
      if (currentSelectedItem && currentSelectedItem.id === selectedId) {
        updateNote(currentSelectedItem.id, { title: draftTitle, content: draftContent })
      } else {
        const newId = addNote({ title: draftTitle, content: draftContent })
        setSelectedId(newId || null)
        setIsEditing(false)
      }
    } else {
      if (currentSelectedItem && currentSelectedItem.id === selectedId) {
        const newSaved = { 
          ...savedAnalyses, 
          [currentSelectedItem.id]: { 
            ...currentSelectedItem, 
            title: draftTitle, 
            content: draftContent 
          } 
        }
        setSavedAnalyses(newSaved)
        localStorage.setItem('grammar_saved_analyses', JSON.stringify(newSaved))
        alert('Analiz metni başarıyla güncellendi.')
      }
    }
  }

  const handleDelete = () => {
    if (!currentSelectedItem) return
    
    if (activeTab === 'notes') {
      deleteNote(currentSelectedItem.id)
    } else {
      const newSaved = { ...savedAnalyses }
      delete newSaved[currentSelectedItem.id]
      setSavedAnalyses(newSaved)
      localStorage.setItem('grammar_saved_analyses', JSON.stringify(newSaved))
    }
    setSelectedId(null)
  }

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => {
      const next = !prev
      localStorage.setItem('grammar_drawer_open', JSON.stringify(next))
      return next
    })
  }

  if (isAnalyzing) {
    return (
      <GrammarAnalyzer 
        initialText={draftContent} 
        initialId={currentSelectedItem?.id}
        initialTitle={draftTitle}
        onBack={() => setIsAnalyzing(false)} 
        onUpdateDraft={(title, content) => {
          setDraftTitle(title);
          setDraftContent(content);
          if (activeTab === 'notes' && currentSelectedItem) {
            updateNote(currentSelectedItem.id, { title, content });
          } else if (activeTab === 'analyses' && currentSelectedItem) {
            const newSaved = { ...savedAnalyses, [currentSelectedItem.id]: { ...currentSelectedItem, title, content } };
            setSavedAnalyses(newSaved);
            localStorage.setItem('grammar_saved_analyses', JSON.stringify(newSaved));
          }
        }}
        onDeleteDraft={() => {
          handleDelete();
          setIsAnalyzing(false);
        }}
      />
    )
  }

  if (selectedId) {
    return (
      <div className="mx-auto max-w-4xl w-full animate-fade-in pb-24 pt-6">
         <button onClick={() => setSelectedId(null)} className="flex w-fit items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition mb-6">
           <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           Back to Topics
         </button>
         
         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
           <h1 className="text-3xl font-black text-slate-900 tracking-tight">
             {activeTab === 'analyses' ? 'Edit Analysis' : (selectedId === 'new' ? 'Create New Topic' : 'Edit Topic')}
           </h1>
           {selectedId !== 'new' && (
             <button onClick={() => { handleDelete(); setSelectedId(null); }} className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100">
               Delete Topic
             </button>
           )}
         </div>

         <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 sm:p-12 shadow-sm">
           <form onSubmit={handleSave} className="space-y-8">
             <div>
               <label className="mb-3 block text-sm font-bold text-slate-700">Topic Title</label>
               <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} placeholder="e.g. Conditionals, Passive Voice..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
             </div>
             
             <div>
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                 <label className="block text-sm font-bold text-slate-700">Content (Markdown Supported)</label>
                 <button type="button" onClick={toggleDrawer} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">📚 Browse Saved Text</button>
               </div>
               
               {isDrawerOpen && <div className="mb-4 rounded-2xl border border-indigo-100 overflow-hidden"><SavedCreationsDrawer mode="inline" creations={safeCreations} onSelect={content => { setDraftContent(content); setIsDrawerOpen(false); localStorage.setItem('grammar_drawer_open', JSON.stringify(false)) }} /></div>}
               
               <textarea value={draftContent} onChange={e => setDraftContent(e.target.value)} rows="16" placeholder="Use markdown to format your grammar notes beautifully..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6 text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-serif text-lg leading-loose" />
             </div>

             <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
                <button type="submit" className="rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 hover:-translate-y-0.5">
                  {selectedId === 'new' ? 'Create Topic' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setIsAnalyzing(true)} disabled={!draftContent.trim()} className="rounded-xl border border-indigo-200 bg-indigo-50 px-8 py-3.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 hover:-translate-y-0.5 disabled:opacity-50 sm:ml-auto">
                  ✨ {activeTab === 'analyses' || savedAnalyses[selectedId] ? 'View Grammar Analysis' : 'Analyze Grammar via AI'}
                </button>
             </div>
           </form>
         </div>

         {/* Preview Screen */}
         {draftContent.trim() && (
           <div className="mt-12 rounded-[2.5rem] border border-slate-200 bg-white p-8 sm:p-14 shadow-sm">
             <h3 className="mb-10 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-4">Live Format Preview</h3>
             <div className="font-serif text-[19px] leading-[2.2] text-zinc-800 dark:text-zinc-200 eye-care:text-sepia-text markdown-preview whitespace-pre-wrap selection:bg-indigo-100">
               <ReactMarkdown>{draftContent}</ReactMarkdown>
             </div>
           </div>
         )}
      </div>
    )
  }

  // Grid / List View Default
  return (
    <div className="space-y-6 font-sans text-zinc-900 animate-fade-in">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
         <div>
           <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Grammar Notes</p>
           <h2 className="text-2xl font-bold text-slate-950 mt-1">My Topics</h2>
         </div>
         <button onClick={handleNewNote} className="rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-slate-800">+ Add New Topic</button>
       </div>

       <div className="flex flex-col sm:flex-row gap-4">
         <div className="flex rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200">
           <button onClick={() => handleTabSwitch('notes')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'notes' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>My Notes</button>
           <button onClick={() => handleTabSwitch('analyses')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'analyses' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Analyses</button>
         </div>
         <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search topics..." className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm" />
       </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         {activeTab === 'notes' ? (
            filteredNotes.length === 0 ? (
               <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300">No notes found matching your search.</div>
            ) : (
               filteredNotes.map(note => (
                 <div key={note.id} onClick={() => { setSelectedId(note.id); setIsAnalyzing(false) }} className="group cursor-pointer flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-indigo-300">
                   <div>
                     <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                       <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{new Date(note.createdAt).toLocaleDateString('en-US')}</span>
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{note.title || 'Untitled Note'}</h3>
                     <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed font-medium">{note.content}</p>
                   </div>
                 </div>
               ))
            )
         ) : (
            filteredAnalyses.length === 0 ? (
               <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300">No saved analyses found.</div>
            ) : (
               filteredAnalyses.map(saved => (
                 <div key={saved.id} onClick={() => { setDraftTitle(saved.title); setDraftContent(saved.content); setSelectedId(saved.id); setIsAnalyzing(true); }} className="group cursor-pointer flex flex-col justify-between rounded-3xl border border-indigo-100 bg-indigo-50/30 p-6 sm:p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-indigo-300">
                   <div>
                     <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                       <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{new Date(saved.createdAt).toLocaleDateString('en-US')}</span>
                       <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md">✨ AI</span>
                     </div>
                     <h3 className="text-xl font-bold text-indigo-950 mb-2 line-clamp-1">{saved.title || 'Untitled Analysis'}</h3>
                     <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed font-medium">{saved.content}</p>
                   </div>
                 </div>
               ))
            )
         )}
       </div>
    </div>
  )
}
