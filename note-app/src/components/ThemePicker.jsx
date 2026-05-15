import { useState, useEffect } from 'react'

const COLOR_THEMES = [
  {
    id: 'indigo',
    name: 'Indigo',
    primary: '#3f51b5',
    surface: '#303f9f',
    textOnBrand: '#ffffff',
  },
  {
    id: 'teal',
    name: 'Teal',
    primary: '#009688',
    surface: '#00796b',
    textOnBrand: '#ffffff',
  },
  {
    id: 'rose',
    name: 'Rose',
    primary: '#e91e63',
    surface: '#c2185b',
    textOnBrand: '#ffffff',
  },
  {
    id: 'amber',
    name: 'Amber',
    primary: '#ffc107',
    surface: '#ff8f00',
    textOnBrand: '#000000',
  },
  {
    id: 'deep-blue',
    name: 'Deep Blue',
    primary: '#1976d2',
    surface: '#1565c0',
    textOnBrand: '#ffffff',
  },
  {
    id: 'gray',
    name: 'Gray',
    primary: '#9e9e9e',
    surface: '#616161',
    textOnBrand: '#ffffff',
  },
]

const ThemePicker = ({ onThemeChange }) => {
  const [selectedTheme, setSelectedTheme] = useState('indigo')

  useEffect(() => {
    // Load saved theme from localStorage
    const saved = localStorage.getItem('noteapp-color-theme')
    if (saved && COLOR_THEMES.find(t => t.id === saved)) {
      setSelectedTheme(saved)
    }
  }, [])

  const handleThemeSelect = (themeId) => {
    setSelectedTheme(themeId)
    const theme = COLOR_THEMES.find(t => t.id === themeId)

    // Update CSS variables
    document.documentElement.style.setProperty('--brand-color', theme.primary)
    document.documentElement.style.setProperty('--brand-surface', theme.surface)
    document.documentElement.style.setProperty('--text-on-brand', theme.textOnBrand)

    // Save to localStorage
    localStorage.setItem('noteapp-color-theme', themeId)

    // Notify parent component
    if (onThemeChange) {
      onThemeChange(theme)
    }
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Renk Teması
      </h3>

      <div className="grid grid-cols-3 gap-4">
        {COLOR_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeSelect(theme.id)}
            className={`
              relative w-12 h-12 rounded-full border-2 transition-all duration-200
              hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${selectedTheme === theme.id ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}
            `}
            style={{
              backgroundColor: theme.primary,
            }}
            title={theme.name}
          >
            {selectedTheme === theme.id && (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Seçilen tema: <span className="font-medium">
          {COLOR_THEMES.find(t => t.id === selectedTheme)?.name}
        </span>
      </div>
    </div>
  )
}

export default ThemePicker