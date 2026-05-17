import { useState, useEffect } from 'react'
import { Plus, Trash2, Sparkles, Check, Settings2, Zap } from 'lucide-react'

export default function TodoList() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('daily_tasks')
    
    const dNow = new Date()
    const todayStr = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`
    const lastSavedDate = localStorage.getItem('daily_tasks_date')

    if (saved) {
      const parsed = JSON.parse(saved)
      if (lastSavedDate !== todayStr) {
        localStorage.setItem('daily_tasks_date', todayStr)
        return parsed.map(t => ({ ...t, isCompleted: false, currentProgress: 0 }))
      }
      return parsed
    }

    localStorage.setItem('daily_tasks_date', todayStr)
    return []
  })

  const [newTaskText, setNewTaskText] = useState('')
  const [isSmartOptionsOpen, setIsSmartOptionsOpen] = useState(false)
  const [trackingType, setTrackingType] = useState('manual')
  const [targetValue, setTargetValue] = useState(1)

  // NLP Niyet Algılayıcı (Kullanıcı "30 dk çalış", "5 kelime öğren" yazarsa otomatik algıla)
  useEffect(() => {
    if (newTaskText.length > 4 && trackingType === 'manual' && !isSmartOptionsOpen) {
      const lower = newTaskText.toLowerCase()
      let matched = false
      
      const studyMatch = lower.match(/(\d+)\s*(dk|dakika|saat|min|mins|minutes|hour|hours)\s*(çalış|odak|öğren|study|focus|learn)/)
      if (studyMatch) {
        setTrackingType('study_goal')
        const isHour = ['saat', 'hour', 'hours'].includes(studyMatch[2])
        setTargetValue(isHour ? parseInt(studyMatch[1], 10) * 60 : parseInt(studyMatch[1], 10))
        matched = true
      }
      
      const wordMatch = lower.match(/(\d+)\s*(yeni |new |)(kelime|sözcük|word|words)/)
      if (wordMatch && !matched) {
        setTrackingType('word_goal')
        setTargetValue(parseInt(wordMatch[1], 10))
        matched = true
      }

      const quizMatch = lower.match(/(\d+)\s*(quiz|sınav|test|çapraz sınav|exam)/)
      if (quizMatch && !matched) {
        setTrackingType('quiz_goal')
        setTargetValue(parseInt(quizMatch[1], 10))
        matched = true
      }

      const speakingMatch = lower.match(/(\d+)\s*(konuşma|speaking|session|sessions)/)
      if (speakingMatch && !matched) {
        setTrackingType('speaking_goal')
        setTargetValue(parseInt(speakingMatch[1], 10))
        matched = true
      }

      const mediaMatch = lower.match(/(\d+)\s*(medya|video|media|note|notes)/)
      if (mediaMatch && !matched) {
        setTrackingType('media_note_goal')
        setTargetValue(parseInt(mediaMatch[1], 10))
        matched = true
      }

      const grammarMatch = lower.match(/(\d+)\s*(gramer|grammar|analysis|analyses)/)
      if (grammarMatch && !matched) {
        setTrackingType('grammar_goal')
        setTargetValue(parseInt(grammarMatch[1], 10))
        matched = true
      }

      if (matched) {
        setIsSmartOptionsOpen(true)
      }
    }
  }, [newTaskText, trackingType, isSmartOptionsOpen])

  // Automation Engine (Otomatik Hedef Kontrol Motoru)
  useEffect(() => {
    const checkAutoGoals = () => {
      const dNow = new Date()
      const today = `${dNow.getFullYear()}-${String(dNow.getMonth() + 1).padStart(2, '0')}-${String(dNow.getDate()).padStart(2, '0')}`

      setTasks(prevTasks => {
        let updated = false
        const nextTasks = prevTasks.map(task => {
          if (task.type === 'auto') {
            let progress = 0;
            const target = task.target || (task.condition === 'study_goal' ? parseInt(localStorage.getItem('dailyStudyGoal') || '45', 10) : task.condition === 'word_goal' ? 5 : 1)
            
            if (task.condition === 'study_goal') {
               const currentDate = localStorage.getItem('studyTime_date')
               const studySeconds = currentDate === today ? parseInt(localStorage.getItem('studyTime_seconds') || '0', 10) : 0
               progress = Math.floor(studySeconds / 60)
            } else if (task.condition === 'quiz_goal') {
              const currentDate = localStorage.getItem('quiz_time_date');
              const quizSeconds = currentDate === today ? parseInt(localStorage.getItem('quiz_time_seconds') || '0', 10) : 0;
              progress = Math.floor(quizSeconds / 60);
            } else if (task.condition === 'word_goal') {
               try {
                 const words = JSON.parse(localStorage.getItem('word-book-entries') || '[]')
                 const todayWords = words.filter(w => w.createdAt && w.createdAt.startsWith(today))
                 progress = todayWords.length
               } catch (e) {}
            } else if (task.condition === 'speaking_goal') {
              const currentDate = localStorage.getItem('speaking_time_date');
              const speakingSeconds = currentDate === today ? parseInt(localStorage.getItem('speaking_time_seconds') || '0', 10) : 0;
              progress = Math.floor(speakingSeconds / 60);
            } else if (task.condition === 'media_note_goal') {
              const currentDate = localStorage.getItem('media_lab_time_date');
              const mediaSeconds = currentDate === today ? parseInt(localStorage.getItem('media_lab_time_seconds') || '0', 10) : 0;
              progress = Math.floor(mediaSeconds / 60);
            } else if (task.condition === 'grammar_goal') {
              const currentDate = localStorage.getItem('grammar_time_date');
              const grammarSeconds = currentDate === today ? parseInt(localStorage.getItem('grammar_time_seconds') || '0', 10) : 0;
              progress = Math.floor(grammarSeconds / 60);
            }

            const isNowCompleted = progress >= target;
            
            if (task.currentProgress !== progress || task.isCompleted !== isNowCompleted) {
              updated = true
              return { ...task, currentProgress: progress, isCompleted: isNowCompleted, target }
            }
          }
          return task
        })
        
        if (updated) {
          localStorage.setItem('daily_tasks', JSON.stringify(nextTasks))
          return nextTasks
        }
        return prevTasks
      })
    }

    checkAutoGoals()
    const interval = setInterval(checkAutoGoals, 3000)
    window.addEventListener('study_time_updated', checkAutoGoals)
    window.addEventListener('words-updated', checkAutoGoals)
    return () => {
      clearInterval(interval)
      window.removeEventListener('study_time_updated', checkAutoGoals)
      window.removeEventListener('words-updated', checkAutoGoals)
    }
  }, [])

  const addTask = (e) => {
    e.preventDefault()
    if (!newTaskText.trim()) return
    const newTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      isCompleted: false,
      type: trackingType === 'manual' ? 'manual' : 'auto',
      condition: trackingType === 'manual' ? null : trackingType,
      target: trackingType === 'manual' ? null : Number(targetValue),
      currentProgress: 0
    }
    const newTasks = [...tasks, newTask]
    setTasks(newTasks)
    localStorage.setItem('daily_tasks', JSON.stringify(newTasks))
    setNewTaskText('')
    setIsSmartOptionsOpen(false)
    setTrackingType('manual')
    setTargetValue(1)
  }

  const toggleTask = (id) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
           if (t.type === 'auto') return t // Akıllı görevler sadece sistem tarafından tiklenebilir
           return { ...t, isCompleted: !t.isCompleted }
        }
        return t
      })
      localStorage.setItem('daily_tasks', JSON.stringify(next))
      return next
    })
  }

  const deleteTask = (id) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id)
      localStorage.setItem('daily_tasks', JSON.stringify(next))
      return next
    })
  }

  const completedCount = tasks.filter(t => t.isCompleted).length
  const totalCount = tasks.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  return (
    <div className="space-y-6 font-sans text-zinc-900 animate-fade-in">
      {/* İlerleme (Progress) Kartı */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-amber-950">Today's Progress</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 eye-care:text-amber-800">You have completed {completedCount} out of {totalCount} tasks.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 eye-care:bg-[#EAE0C8] eye-care:text-amber-900">
            {progressPercent}%
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900 eye-care:bg-[#EAE0C8]/50">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 ease-out dark:bg-indigo-500 eye-care:bg-amber-600"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Görev (Task) Listesi */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
        <h3 className="mb-6 text-lg font-bold text-zinc-900 dark:text-zinc-50 eye-care:text-amber-950">Task Manager</h3>
        
        <form onSubmit={addTask} className="mb-6 flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task... (e.g. study 30 mins, learn 5 words)"
              className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 eye-care:bg-transparent eye-care:border-[#EAE0C8]"
            />
            <button 
              type="button" 
              onClick={() => setIsSmartOptionsOpen(!isSmartOptionsOpen)} 
              className={`flex items-center justify-center rounded-2xl px-4 transition ${isSmartOptionsOpen || trackingType !== 'manual' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 eye-care:bg-[#EAE0C8] eye-care:text-amber-900' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 eye-care:bg-transparent eye-care:border eye-care:border-[#EAE0C8]'}`}
              title="Smart Tracking Settings"
            >
              <Settings2 size={20} />
            </button>
            <button type="submit" disabled={!newTaskText.trim()} className="flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50">
              <Plus size={20} />
            </button>
          </div>

          {isSmartOptionsOpen && (
            <div className="flex flex-col sm:flex-row gap-3 rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50 eye-care:bg-[#F4EAD5]/50 eye-care:border-[#EAE0C8] animate-fade-in">
              <div className="flex items-center gap-2 mb-2 sm:mb-0 shrink-0">
                <Zap size={16} className="text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 eye-care:text-amber-950">Smart Tracking</span>
              </div>
              <select
                value={trackingType}
                onChange={(e) => setTrackingType(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]"
              >
                <option value="manual">Manual Only</option>
                <option value="study_goal">General Study Time (Minutes)</option>
                <option value="word_goal">New Words (Count)</option>
                <option value="quiz_goal">Quiz Time (Minutes)</option>
                <option value="speaking_goal">Speaking Time (Minutes)</option>
                <option value="media_note_goal">Media Lab Time (Minutes)</option>
                <option value="grammar_goal">Grammar Time (Minutes)</option>
              </select>
              
              {trackingType !== 'manual' && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 eye-care:text-amber-800/70">Target:</span>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-20 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]"
                  />
                </div>
              )}
            </div>
          )}
        </form>

        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-zinc-500 dark:text-zinc-400 eye-care:text-amber-800/70">
              <Sparkles size={40} className="mb-3 opacity-20" />
              <p className="font-medium">Your list is currently empty.</p>
              <p className="text-sm opacity-80 mt-1">You can add a manual task or set a smart goal for the app to track.</p>
            </div>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                className={`flex flex-col rounded-2xl border p-4 transition-all ${
                  task.isCompleted 
                    ? 'border-emerald-200 bg-emerald-50 opacity-60 dark:border-emerald-900/50 dark:bg-emerald-900/20 eye-care:border-emerald-200/50 eye-care:bg-emerald-50/50' 
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 eye-care:border-[#EAE0C8] eye-care:bg-[#FDF6E3]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div 
                    className={`flex flex-1 items-center gap-4 ${task.type === 'manual' ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={() => task.type === 'manual' && toggleTask(task.id)}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      task.isCompleted 
                        ? 'border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400' 
                        : 'border-zinc-300 bg-transparent dark:border-zinc-600'
                    }`}>
                      {task.isCompleted && <Check size={14} strokeWidth={3} />}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`text-base font-semibold ${
                        task.isCompleted 
                          ? 'text-emerald-800 line-through dark:text-emerald-300 eye-care:text-emerald-900' 
                          : 'text-zinc-800 dark:text-zinc-200 eye-care:text-amber-950'
                      }`}>
                        {task.text}
                      </span>
                      {task.type === 'auto' && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                          <Zap size={10} /> Smart Track
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteTask(task.id)} 
                    className="ml-4 rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 eye-care:hover:bg-rose-100/50"
                    title="Delete Task"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {/* Akıllı Görev İlerleme Çubuğu */}
                {task.type === 'auto' && !task.isCompleted && (
                  <div className="mt-3 flex w-full items-center gap-3 pl-10 pr-2">
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700 eye-care:bg-amber-100">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out dark:bg-indigo-400 eye-care:bg-amber-600"
                        style={{ width: `${Math.min(((task.currentProgress || 0) / task.target) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 eye-care:text-amber-800/70">
                      {task.currentProgress || 0} / {task.target}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}