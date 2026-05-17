import { Link, useLocation } from 'react-router-dom'
import { Home, Library, Layers, BrainCircuit, BookOpen, Mic, Headphones, BookMarked, PenTool, Sparkles, MonitorPlay, PanelLeftClose, PanelLeftOpen, AudioLines, ListTodo, LogOut } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

const MENU_MAIN = [
  { path: '/', label: 'Dashboard', icon: Home, tourClass: 'tour-dashboard' },
  { path: '/tasks', label: 'Daily Tasks', icon: ListTodo, tourClass: 'tour-tasks' },
  { path: '/words', label: 'Word List', icon: Library, tourClass: 'tour-wordlist' },
  { path: '/flashcard', label: 'Flashcards', icon: Layers },
  { path: '/quiz', label: 'Quiz', icon: BrainCircuit },
]

const MENU_READINGS = [
  { path: '/grammar', label: 'Grammar Notes', icon: BookOpen },
  { path: '/reading', label: 'Reading Center', icon: BookMarked },
]

const MENU_LABS = [
  { path: '/voice', label: 'Voice Notes', icon: AudioLines, tourClass: 'tour-voicenotes' },
  { path: '/audio', label: 'Audio Lab', icon: Headphones },
  { path: '/speaking-studio', label: 'Speaking Studio', icon: Mic, tourClass: 'tour-speaking' },
  { path: '/writing', label: 'Writing Lab', icon: PenTool },
  { path: '/creative-lab', label: 'Creative Lab', icon: Sparkles, tourClass: 'tour-creativelab' },
]

const MENU_BOTTOM = [
  { path: '/immersion', label: 'Media Lab', icon: MonitorPlay },
]

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const location = useLocation()
  const user = auth.currentUser

  const displayName = user?.displayName || 'Kullanıcı'
  const email = user?.email || ''
  const photoURL = user?.photoURL || null
  const initials = displayName.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
      await signOut(auth)
    }
  }

  const renderMenuItem = (item) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path

    return (
      <Link
        key={item.path}
        to={item.path}
        title={isCollapsed ? item.label : undefined}
        style={isActive ? { backgroundColor: 'var(--accent)', color: '#ffffff' } : {}}
        className={`group flex items-center rounded-xl py-1.5 text-sm font-semibold transition-all duration-300 ${
          isCollapsed ? 'justify-center px-0' : 'gap-2 px-3'
        } ${
          isActive
            ? 'shadow-sm shadow-[var(--accent)]/30'
            : 'opacity-70 hover:bg-slate-500/10 hover:opacity-100'
        } ${item.tourClass || ''}`}
      >
        <Icon
          size={18}
          strokeWidth={isActive ? 2.5 : 2}
          className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
        />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <aside className={`fixed left-0 top-0 z-[100] flex h-screen flex-col bg-[var(--bg-sidebar)] text-[var(--text-sidebar)] shadow-[4px_0_24px_rgba(0,0,0,0.05)] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className={`flex h-24 shrink-0 items-center border-b border-current/10 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-6'}`}>
        <Link to="/" className={`flex items-center gap-4 transition-transform hover:scale-105 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-2xl font-black text-white shadow-lg shadow-[var(--accent)]/30">
            N
          </div>
          {!isCollapsed && <span className="text-2xl font-extrabold tracking-tight text-inherit">NoteApp</span>}
        </Link>
        {!isCollapsed && (
          <button onClick={toggleSidebar} className="flex h-8 w-8 items-center justify-center rounded-lg text-inherit opacity-60 transition hover:bg-black/10 hover:opacity-100" title="Collapse Menu">
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex items-center justify-center border-b border-current/10 py-3">
          <button onClick={toggleSidebar} className="flex h-10 w-10 items-center justify-center rounded-lg text-inherit opacity-60 transition hover:bg-black/10 hover:opacity-100" title="Expand Menu">
            <PanelLeftOpen size={20} />
          </button>
        </div>
      )}

      {/* Navigasyon */}
      <nav className={`hide-scrollbar flex flex-1 flex-col justify-evenly overflow-y-auto py-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {MENU_MAIN.map(renderMenuItem)}
        {MENU_READINGS.map(renderMenuItem)}
        {MENU_LABS.map(renderMenuItem)}
        {MENU_BOTTOM.map(renderMenuItem)}
      </nav>

      {/* Alt Profil Alanı */}
      <div className={`shrink-0 border-t border-current/10 ${isCollapsed ? 'flex flex-col items-center gap-2 p-3' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-current/20" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-current/10 font-bold text-inherit">
              {initials}
            </div>
          )}
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-inherit">{displayName}</p>
              <p className="truncate text-xs text-inherit opacity-70">{email}</p>
            </div>
          )}
        </div>

        {/* Çıkış Butonu */}
        <button
          onClick={handleSignOut}
          title="Çıkış Yap"
          className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold opacity-60 transition hover:bg-red-500/20 hover:opacity-100 hover:text-red-400 ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}
        >
          <LogOut size={15} />
          {!isCollapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  )
}