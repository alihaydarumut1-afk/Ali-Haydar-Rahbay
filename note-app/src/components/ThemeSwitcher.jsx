import { Sun, Moon, Leaf } from 'lucide-react'
import { useTheme } from './ThemeContext.jsx'

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800 eye-care:bg-sepia-border">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
          theme === 'light'
            ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-white eye-care:bg-white'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 eye-care:text-sepia-text/70 eye-care:hover:text-sepia-text'
        }`}
        title="Açık Tema"
      >
        <Sun size={18} />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-zinc-700 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 eye-care:text-sepia-text/70 eye-care:hover:text-sepia-text'
        }`}
        title="Koyu Tema"
      >
        <Moon size={18} />
      </button>
      
      <button
        onClick={() => setTheme('eye-care')}
        className={`flex items-center justify-center rounded-lg p-2 transition-all duration-200 ${
          theme === 'eye-care'
            ? 'bg-sepia-surface text-sepia-text shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 eye-care:text-sepia-text/70 eye-care:hover:text-sepia-text'
        }`}
        title="Göz Koruma (Sepya) Modu"
      >
        <Leaf size={18} />
      </button>
    </div>
  )
}