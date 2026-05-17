import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Layers, BrainCircuit, Library, Mic, Headphones, BookMarked, PenTool, Sparkles, MonitorPlay, ArrowRight, Target, Edit2, Award, AudioLines, Flame, Check, X, ListTodo } from 'lucide-react'

const MODULES = [
  { path: '/tasks', title: 'Daily Tasks', description: 'Track your daily learning goals and smart tasks.', icon: ListTodo, color: 'text-teal-600', bg: 'bg-teal-50', tourClass: 'tour-tasks' },
  { path: '/words', title: 'Word List', description: 'Manage and categorize all your learned words.', icon: Library, color: 'text-blue-600', bg: 'bg-blue-50', tourClass: 'tour-wordlist' },
  { path: '/flashcard', title: 'Flashcards', description: 'Memorize words quickly by flipping cards.', icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50', tourClass: 'tour-flashcards' },
  { path: '/quiz', title: 'Quiz Mode', description: 'Test yourself with multiple-choice questions.', icon: BrainCircuit, color: 'text-purple-600', bg: 'bg-purple-50', tourClass: 'tour-quiz' },
  { path: '/grammar', title: 'Grammar Notes', description: 'Write and archive your own grammar rules.', icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-50', tourClass: 'tour-grammar' },
  { path: '/voice', title: 'Voice Notes', description: 'Record your voice and improve your pronunciation.', icon: AudioLines, color: 'text-amber-600', bg: 'bg-amber-50', tourClass: 'tour-voicenotes' },
  { path: '/audio', title: 'Audio Lab', description: 'Practice your English listening skills.', icon: Headphones, color: 'text-cyan-600', bg: 'bg-cyan-50', tourClass: 'tour-audio' },
  { path: '/reading', title: 'Reading Center', description: 'Read texts and solve reading comprehension tests.', icon: BookMarked, color: 'text-indigo-600', bg: 'bg-indigo-50', tourClass: 'tour-reading' },
  { path: '/speaking-studio', title: 'Speaking Studio', description: 'Practice voice roleplay with AI.', icon: Mic, color: 'text-violet-600', bg: 'bg-violet-50', tourClass: 'tour-speaking' },
  { path: '/writing', title: 'Writing Lab', description: 'Write essays and analyze them with AI.', icon: PenTool, color: 'text-orange-600', bg: 'bg-orange-50', tourClass: 'tour-writing' },
  { path: '/creative-lab', title: 'Creative Lab', description: 'Create AI-supported content with your words.', icon: Sparkles, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', tourClass: 'tour-creativelab' },
  { path: '/immersion', title: 'Media Lab', description: 'Do dictation and quiz exercises with YouTube videos.', icon: MonitorPlay, color: 'text-pink-600', bg: 'bg-pink-50', tourClass: 'tour-immersion' },
]

export default function DashboardGrid() {
  const navigate = useNavigate()
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false)
  const [studySeconds, setStudySeconds] = useState(0)
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(45)
  const hasPlayedBell = useRef(false)
  const [streakData, setStreakData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('streakData') || '{}') } catch { return {} }
  })

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const todayDayNumber = currentDate.getDate()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  useEffect(() => {
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const storedDate = localStorage.getItem('studyTime_date')
    if (storedDate === today) {
      setStudySeconds(parseInt(localStorage.getItem('studyTime_seconds') || '0', 10) || 0)
    } else {
      setStudySeconds(0)
    }
    const goal = parseInt(localStorage.getItem('dailyStudyGoal') || '45', 10)
    setDailyGoalMinutes(goal)

    const handleUpdate = () => {
      const dNow = new Date()
      const todayNow = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`
      const currentDate = localStorage.getItem('studyTime_date')
      if (currentDate === todayNow) {
        setStudySeconds(parseInt(localStorage.getItem('studyTime_seconds') || '0', 10) || 0)
      } else {
        setStudySeconds(0)
      }
    }
    window.addEventListener('study_time_updated', handleUpdate)
    return () => window.removeEventListener('study_time_updated', handleUpdate)
  }, [])

  useEffect(() => {
    const todayDate = new Date()
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
    const bellRungDate = localStorage.getItem('goalBellRungDate')

    if (studySeconds >= dailyGoalMinutes * 60 && studySeconds > 0) {
      if (!hasPlayedBell.current && bellRungDate !== todayStr) {
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {})
        hasPlayedBell.current = true
        localStorage.setItem('goalBellRungDate', todayStr)
      }
      
      setStreakData(prev => {
        if (prev[todayStr] !== 'success') {
          const updated = { ...prev, [todayStr]: 'success' }
          localStorage.setItem('streakData', JSON.stringify(updated))
          return updated
        }
        return prev
      })
    } else {
      hasPlayedBell.current = false
    }
  }, [studySeconds, dailyGoalMinutes])

  const handleEditGoal = () => {
    const newGoal = prompt("Enter your daily study goal in minutes:", dailyGoalMinutes)
    if (newGoal && !isNaN(newGoal) && parseInt(newGoal, 10) > 0) {
      const parsedGoal = parseInt(newGoal, 10)
      setDailyGoalMinutes(parsedGoal)
      localStorage.setItem('dailyStudyGoal', parsedGoal.toString())
    }
  }

  const studyMinutes = Math.floor(studySeconds / 60)
  const progressPercent = Math.min((studyMinutes / dailyGoalMinutes) * 100, 100)
  const isGoalReached = studyMinutes >= dailyGoalMinutes

  const currentStreak = useMemo(() => {
    let streak = 0
    let checkDate = new Date()
    
    let dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
    if (streakData[dStr] === 'success') {
      streak++
    }
    
    checkDate.setDate(checkDate.getDate() - 1)
    
    while (true) {
      dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      if (streakData[dStr] === 'success') {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [streakData])

  const renderMicroDots = () => {
    const dots = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isSuccess = streakData[dateStr] === 'success'
      const isPast = day < todayDayNumber
      const isToday = day === todayDayNumber

      let dotClass = "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm transition-all "
      let title = `${monthNames[currentMonth]} ${day}: `

      if (isSuccess) {
        dotClass += "bg-green-500 dark:bg-green-400"
        title += "Completed"
      } else if (isPast) {
        dotClass += "bg-zinc-200 dark:bg-zinc-700"
        title += "Missed"
      } else if (isToday) {
        dotClass += "bg-transparent border border-indigo-500"
        title += "Today (Pending)"
      } else {
        dotClass += "bg-slate-100 dark:bg-zinc-800/50 opacity-40"
        title += "Upcoming"
      }

      dots.push(<div key={day} className={dotClass} title={title} />)
    }
    return dots
  }

  const renderCalendarCells = () => {
    const cells = []
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    
    weekDays.forEach(day => {
      cells.push(
        <div key={`header-${day}`} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
          {day}
        </div>
      )
    })

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="h-7 w-7" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isSuccess = streakData[dateStr] === 'success'
      const isPast = day < todayDayNumber
      const isToday = day === todayDayNumber

      let cellClass = "flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition-all mx-auto "
      let content = day

      if (isSuccess) {
        cellClass += "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        content = <Check size={14} strokeWidth={3} />
      } else if (isPast) {
        cellClass += "bg-slate-100 text-slate-400 dark:bg-zinc-800/50 dark:text-zinc-500"
        content = <X size={14} strokeWidth={3} />
      } else if (isToday) {
        cellClass += "ring-1 ring-indigo-500 bg-indigo-50 text-indigo-600 shadow-sm dark:ring-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300 font-bold"
      } else {
        cellClass += "text-slate-400 dark:text-zinc-500 opacity-60"
      }

      cells.push(
        <div key={day} className="flex justify-center">
          <div className={cellClass}>{content}</div>
        </div>
      )
    }
    return cells
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row items-start gap-4 sm:gap-6 w-full">

          {/* Compact & Elegant Daily Progress Bar */}
        <div className="tour-dashboard flex-1 w-full flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl border border-slate-200 bg-white p-4 sm:px-6 shadow-sm transition-all hover:shadow-md dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            {/* Left: Info */}
            <div className="flex w-full items-center gap-3 sm:w-auto sm:min-w-[180px]">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${isGoalReached ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                {isGoalReached ? <Award size={20} strokeWidth={2.5} /> : <Target size={20} strokeWidth={2.5} />}
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Daily Study Goal</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span className={isGoalReached ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-zinc-300 font-bold'}>{studyMinutes}</span> / {dailyGoalMinutes} mins
                </p>
              </div>
              {/* Mobile Edit Button */}
              <button onClick={handleEditGoal} className="ml-auto sm:hidden rounded-lg bg-slate-50 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:bg-zinc-900 dark:text-zinc-500">
                <Edit2 size={14} />
              </button>
            </div>

            {/* Middle: Progress Bar */}
            <div className="flex w-full flex-1 flex-col justify-center gap-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-900">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isGoalReached ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className={`w-9 text-right text-xs font-bold ${isGoalReached ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`}>{Math.round(progressPercent)}%</span>
              </div>
              {isGoalReached && (
                <div className="flex items-center gap-2 animate-fade-in mt-1">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Goal Reached!</span>
                  <span className="animate-bounce text-yellow-500">🔔</span>
                </div>
              )}
            </div>

            {/* Desktop Edit Button */}
            <button onClick={handleEditGoal} className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
              <Edit2 size={12} /> Edit
            </button>
          </div>

        {/* Streak Widget / Expandable Calendar */}
        <div 
          onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
          className={`cursor-pointer flex flex-col justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-indigo-300 hover:shadow-md dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8] ${isCalendarExpanded ? 'w-full xl:w-[320px] p-5' : 'w-full xl:w-auto xl:rounded-full px-5 py-4 sm:py-5 xl:py-4 xl:px-6'}`}
          title="Takvimi aç/kapat"
        >
          {!isCalendarExpanded ? (
            <div className="flex items-center justify-between gap-4 sm:gap-6 w-full">
              <div className="flex items-center gap-2 font-bold text-orange-500 dark:text-orange-400 shrink-0">
                <Flame size={20}/> <span>{currentStreak} Day Streak!</span>
              </div>
              <div className="flex flex-wrap justify-end gap-1 w-28 sm:w-36">
                {renderMicroDots()}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-4 flex items-center justify-between px-2">
                <div className="flex items-center gap-2 font-bold text-orange-500 dark:text-orange-400">
                  <Flame size={20}/> <span className="text-sm">{currentStreak} Day</span>
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-zinc-200 eye-care:text-amber-950">
                    {monthNames[currentMonth]}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                    {currentYear}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 px-2">
                {renderCalendarCells()}
              </div>
            </div>
          )}
        </div>
      </div>

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {MODULES.map((mod) => {
        const Icon = mod.icon
        return (
          <button
            key={mod.path}
            onClick={() => navigate(mod.path)}
            className={`group relative flex flex-col items-start overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${mod.tourClass || ''}`}
            style={{ ':hover': { borderColor: 'var(--accent)' } }}
          >
            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${mod.bg} ${mod.color} transition-transform duration-300 group-hover:scale-110`}>
              <Icon size={28} strokeWidth={2} />
            </div>
            
            <h3 className="mb-3 text-xl font-bold text-slate-900 transition-colors" style={{ color: 'var(--text-main)' }}>
              {mod.title}
            </h3>
            <p className="text-sm font-medium leading-relaxed text-slate-500" style={{ color: 'var(--text-muted)' }}>
              {mod.description}
            </p>

            <div className="absolute bottom-8 right-8 flex h-10 w-10 -translate-x-4 items-center justify-center rounded-full bg-slate-50 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-white group-hover:opacity-100" style={{ ':hover': { backgroundColor: 'var(--accent)' } }}>
              <ArrowRight size={20} strokeWidth={2.5} />
            </div>
          </button>
        )
      })}
    </div>
    </div>
  )
}