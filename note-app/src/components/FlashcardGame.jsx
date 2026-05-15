import { useEffect, useMemo, useState, useCallback } from 'react'
import shuffleArray from '../utils/shuffle.js'
import PronunciationButton from './PronunciationButton.jsx'

const TYPE_GRADIENTS = {
  Noun:          { from: '#6366f1', to: '#8b5cf6' },
  Verb:          { from: '#0ea5e9', to: '#06b6d4' },
  Adjective:     { from: '#ec4899', to: '#f43f5e' },
  'Phrasal Verb':{ from: '#f59e0b', to: '#ef4444' },
}

function getGradient(type) {
  const g = TYPE_GRADIENTS[type] || { from: '#64748b', to: '#475569' }
  return `linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%)`
}

const RATINGS = [
  { key: 'hard', ease: 1, emoji: '🔴', label: 'Hard', shortcut: '1',
    style: { background: '#fff1f2', border: '0.5px solid #fecdd3', color: '#be123c' } },
  { key: 'good', ease: 2, emoji: '🟡', label: 'Good', shortcut: '2',
    style: { background: '#fefce8', border: '0.5px solid #fde68a', color: '#92400e' } },
  { key: 'easy', ease: 3, emoji: '🟢', label: 'Easy', shortcut: '3',
    style: { background: '#f0fdf4', border: '0.5px solid #bbf7d0', color: '#14532d' } },
]

export default function FlashcardGame({ words, onUpdateWord }) {
  const deck = useMemo(() => shuffleArray(words), [words])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [ratings, setRatings] = useState([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    setIdx(0)
    setFlipped(false)
    setDone(false)
    setRatings([])
  }, [deck])

  const word = deck[idx]

  const reveal = useCallback(() => {
    setFlipped(prev => !prev)
  }, [])

  const rate = useCallback((rating) => {
    if (animating) return
    setRatings(prev => [...prev, {
      wordId: word?.id ?? idx,
      english: word?.english,
      ease: rating.ease,
      key: rating.key,
      timestamp: Date.now(),
    }])
    setAnimating(true)
    setFlipped(false)
    setTimeout(() => {
      if (idx < deck.length - 1) {
        setIdx(i => i + 1)
      } else {
        setDone(true)
      }
      setAnimating(false)
    }, 340)
  }, [animating, idx, deck.length, word])

  const restart = useCallback(() => {
    setIdx(0)
    setFlipped(false)
    setDone(false)
    setRatings([])
  }, [])

  const saveRun = useCallback(() => {
    if (onUpdateWord) {
      ratings.forEach(r => {
        const currentWord = words.find(w => w.id === r.wordId)
        if (currentWord) {
          const newRepetition = (currentWord.repetition || 0) + (r.ease >= 2 ? 1 : 0)
          onUpdateWord(currentWord.id, { repetition: newRepetition })
        }
      })
      alert('🎉 Oturum başarıyla kaydedildi!')
    }
  }, [ratings, words, onUpdateWord])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); reveal() }
      else if (e.key === '1' && flipped) rate(RATINGS[0])
      else if (e.key === '2' && flipped) rate(RATINGS[1])
      else if (e.key === '3' && flipped) rate(RATINGS[2])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [reveal, rate, flipped])

  if (!words.length) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 320, gap: 16, textAlign: 'center',
        borderRadius: 24, border: '0.5px solid var(--border-color, #e2e8f0)',
        background: 'var(--card-bg, #fff)', padding: 32,
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📚</div>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>Henüz kelime eklenmemiş</p>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #64748b)' }}>Kelime Listesi'nden kelime ekleyerek başla.</p>
      </div>
    )
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 52, lineHeight: 1 }}>🎉</div>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Session Complete!</p>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #64748b)' }}>{deck.length} cards reviewed · {ratings.length} ratings recorded</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={restart} style={{ padding: '12px 28px', borderRadius: 14, background: '#f1f5f9', color: '#475569', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Restart
          </button>
          <button onClick={saveRun} style={{ padding: '12px 28px', borderRadius: 14, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Save & Finish Run
          </button>
        </div>
      </div>
    )
  }

  const pct = Math.round(((idx + 1) / deck.length) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '8px 0 32px' }}>

      <div style={{ width: '100%', maxWidth: 560, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted, #64748b)' }}>Vocabulary Engine</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>{ratings.length} rated</span>
      </div>

      <div style={{ width: '100%', maxWidth: 560, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted, #64748b)', minWidth: 44, textAlign: 'right' }}>{idx + 1} / {deck.length}</span>
        <div style={{ flex: 1, height: 3, background: 'var(--border-color, #e2e8f0)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#4f46e5', borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', minWidth: 32 }}>{pct}%</span>
      </div>

      <div
        onClick={reveal}
        role="button"
        aria-label={flipped ? 'Card showing answer' : 'Tap to reveal answer'}
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && reveal()}
        style={{ width: '100%', maxWidth: 560, perspective: '1200px', cursor: 'pointer' }}
      >
        <div style={{
          position: 'relative', width: '100%', minHeight: 460,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.52s cubic-bezier(.4,.2,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>

          {/* ÖN YÜZ */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            borderRadius: 24, border: '0.5px solid var(--border-color, #e2e8f0)',
            background: 'var(--card-bg, #ffffff)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              width: '100%', aspectRatio: '16/7', flexShrink: 0,
              background: getGradient(word.type),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 80, fontWeight: 700, color: 'rgba(255,255,255,0.15)', lineHeight: 1, userSelect: 'none' }}>
                {word.english?.[0]?.toUpperCase()}
              </span>
              {word.type && (
                <span style={{ position: 'absolute', bottom: 10, right: 14, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  {word.type}
                </span>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 28px 24px', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: 'var(--text-main, #0f172a)', lineHeight: 1.1, textAlign: 'center' }}>
                  {word.english}
                </span>
                <div onClick={e => e.stopPropagation()}>
                  <PronunciationButton text={word.english} />
                </div>
              </div>
              {word.type && (
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', border: '0.5px solid var(--border-color, #e2e8f0)', borderRadius: 99, padding: '2px 12px' }}>
                  {word.type}
                </span>
              )}
            </div>
          </div>

          {/* ARKA YÜZ */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: 24, border: '0.5px solid var(--border-color, #e2e8f0)',
            background: 'var(--card-bg, #ffffff)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              <div>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted,#94a3b8)', marginBottom: 6 }}>Meaning</p>
                <p style={{ fontSize: 28, fontWeight: 400, fontFamily: "'Playfair Display', Georgia, serif", color: '#4338ca', lineHeight: 1.25 }}>
                  {word.turkish}
                </p>
              </div>

              {word.collocation && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted,#94a3b8)', marginBottom: 6 }}>Collocation</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 99, background: 'var(--hover-bg,#f1f5f9)', border: '0.5px solid var(--border-color,#e2e8f0)', color: 'var(--text-muted,#475569)' }}>
                      {word.collocation}
                    </span>
                  </div>
                </div>
              )}

              {word.collocations?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted,#94a3b8)', marginBottom: 6 }}>Collocations</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {word.collocations.map((c, i) => (
                      <span key={i} style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 99, background: 'var(--hover-bg,#f1f5f9)', border: '0.5px solid var(--border-color,#e2e8f0)', color: 'var(--text-muted,#475569)' }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {word.synonyms?.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted,#94a3b8)', marginBottom: 6 }}>Synonyms</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {word.synonyms.map((s, i) => (
                      <span key={i} style={{ fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 99, background: '#ede9fe', border: '0.5px solid #c4b5fd', color: '#4c1d95' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {word.sentence && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted,#94a3b8)', marginBottom: 6 }}>Context</p>
                  <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: 14, color: 'var(--text-muted,#475569)', lineHeight: 1.7, borderLeft: '2px solid #c7d2fe', paddingLeft: 12, margin: 0 }}>
                    "{word.sentence}"
                  </p>
                </div>
              )}

              {word.ipa && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted,#94a3b8)', marginBottom: 4 }}>Pronunciation</p>
                  <span style={{ fontFamily: 'monospace', fontSize: 16, color: 'var(--text-main,#0f172a)' }}>/{word.ipa}/</span>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {!flipped ? (
          <button
            onClick={reveal}
            style={{ width: '100%', maxWidth: 300, padding: '14px 24px', borderRadius: 14, background: '#4f46e5', color: '#fff', fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onMouseOver={e => e.currentTarget.style.background = '#4338ca'}
            onMouseOut={e => e.currentTarget.style.background = '#4f46e5'}
          >
            Reveal Answer
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>Space</span>
          </button>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-muted,#94a3b8)', marginBottom: 2 }}>How well did you recall this?</p>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              {RATINGS.map(r => (
                <button
                  key={r.key}
                  onClick={() => rate(r)}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '12px 8px', borderRadius: 14, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'transform 0.1s', ...r.style }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1.03)'}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{r.emoji}</span>
                  <span>{r.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.55 }}>({r.shortcut})</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      
      <p className="text-zinc-400 text-sm mt-8 text-center animate-fade-in">
        {flipped ? 'Press [1] Hard · [2] Good · [3] Easy' : 'Press [Space] to reveal answer'}
      </p>

    </div>
  )
}
