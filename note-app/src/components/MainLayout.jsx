import { useState, useEffect } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import * as JoyrideModule from 'react-joyride'

const Joyride = JoyrideModule.default?.default || JoyrideModule.default || JoyrideModule.Joyride || JoyrideModule

export default function MainLayout() {
  const location = useLocation()
  // Sadece ana dizindeyken ('/') menüyü gizler
  const isDashboard = location.pathname === '/'

  // Menünün açık/kapalı durumu (Tarayıcı hafızasında saklanır)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed')
    return saved ? JSON.parse(saved) : false
  })

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', JSON.stringify(next))
      return next
    })
  }

  // Track last visited page
  useEffect(() => {
    if (location.pathname !== '/') {
      localStorage.setItem('lastVisitedPage', location.pathname)
    }
  }, [location.pathname])

  // Global Study Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const d = new Date()
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const storedDate = localStorage.getItem('studyTime_date')
        
        if (storedDate !== today) {
          localStorage.setItem('studyTime_date', today)
          localStorage.setItem('studyTime_seconds', '0')
        }
        
        const currentSeconds = parseInt(localStorage.getItem('studyTime_seconds') || '0', 10) || 0
        localStorage.setItem('studyTime_seconds', (currentSeconds + 1).toString())
        window.dispatchEvent(new Event('study_time_updated'))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Onboarding Tour State
  const [runTour, setRunTour] = useState(false)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour) {
      setRunTour(true)
      localStorage.setItem('hasSeenTour', 'true')
    }
  }, [])

  const tourSteps = [
    { target: '.tour-dashboard', content: 'Welcome to your English Learning Hub! Here you can track your daily study goals and your learning streaks.', placement: 'bottom' },
    { target: '.tour-wordlist', content: 'Word List: Manage your vocabulary here. You can double-click on the words to reveal their Turkish meanings and details!', placement: 'bottom' },
    { target: '.tour-flashcards', content: 'Flashcards: Memorize words quickly using our Spaced Repetition system.', placement: 'bottom' },
    { target: '.tour-quiz', content: 'Quiz Mode: Test yourself with multiple-choice questions or gap-fill exercises.', placement: 'bottom' },
    { target: '.tour-grammar', content: 'Grammar Notes: Write your own grammar rules and use the AI Analysis tool to get detailed feedback!', placement: 'bottom' },
    { target: '.tour-voicenotes', content: 'Voice Notes: Record your voice, get transcripts, and receive detailed pronunciation evaluations.', placement: 'bottom' },
    { target: '.tour-audio', content: 'Audio Lab: Practice your English listening skills with various exercises.', placement: 'bottom' },
    { target: '.tour-reading', content: 'Reading Center: Read texts and solve comprehension tests.', placement: 'top' },
    { target: '.tour-speaking', content: 'Speaking Studio: Practice real-time voice conversations with our AI Professor.', placement: 'top' },
    { target: '.tour-writing', content: 'Writing Lab: Write essays and get instant AI feedback on your writing.', placement: 'top' },
    { target: '.tour-creativelab', content: 'Creative Lab: Generate custom reading texts and dialogues tailored to your level.', placement: 'top' },
    { target: '.tour-immersion', content: 'Media Lab: Watch YouTube videos, practice dictation, and take notes in the dedicated Notes section!', placement: 'top' },
    { target: '.tour-settings', content: 'Translation & Settings: Highlight or select any text on the screen to instantly see its translation! You can also toggle "Blur Translation" or change the theme here.', placement: 'bottom' }
  ]

  const handleJoyrideCallback = (data) => {
    const { status, action } = data
    if (['finished', 'skipped'].includes(status) || action === 'close') {
      setRunTour(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        locale={{ back: 'Back', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip Tour' }}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#4f46e5',
            backgroundColor: '#ffffff',
            textColor: '#18181b',
            zIndex: 1000,
          }
        }}
      />

      {!isDashboard && (
        <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      )}
      
      <main className={`flex-1 transition-all duration-300 ${!isDashboard ? (isCollapsed ? 'ml-20 w-[calc(100%-5rem)] p-6 sm:p-8' : 'ml-64 w-[calc(100%-16rem)] p-6 sm:p-8') : 'mx-auto w-full max-w-7xl p-4 sm:p-8'}`}>
        <div key={location.pathname} className="page-transition w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}