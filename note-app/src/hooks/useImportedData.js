import { useState, useEffect } from 'react'

export default function useImportedData(storageKey) {
  const [importedItems, setImportedItems] = useState([])

  useEffect(() => {
    const loadItems = () => {
      try {
        const items = JSON.parse(localStorage.getItem(storageKey) || '[]')
        setImportedItems(items)
      } catch (e) {
        console.error(e)
      }
    }

    loadItems()
    window.addEventListener(`${storageKey}-updated`, loadItems)
    return () => window.removeEventListener(`${storageKey}-updated`, loadItems)
  }, [storageKey])

  const removeItem = (id) => {
    const current = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const updated = current.filter(item => item.id !== id)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    window.dispatchEvent(new Event(`${storageKey}-updated`))
  }

  return { importedItems, removeItem }
}