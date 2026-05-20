import { useState, useEffect } from 'react'

// ─── Contrast helper ────────────────────────────────────────────────────────
function getContrastColor(hex) {
  if (!hex) return '#0f172a'
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return (r*299 + g*587 + b*114)/1000 >= 128 ? '#0f172a' : '#ffffff'
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'theme',      icon: '◐', label: 'Theme'      },
  { id: 'colors',     icon: '⬡', label: 'Colors'     },
  { id: 'typography', icon: 'T', label: 'Typography'  },
  { id: 'cards',      icon: '▭', label: 'Cards'       },
  { id: 'brightness', icon: '☀', label: 'Brightness'  },
]

const BASE_MODES = [
  {
    id: 'light',
    label: 'Light',
    sub: 'Clean & minimal',
    bg: '#f8f9fa', card: '#ffffff', sidebar: '#0f172a', accent: '#1a73e8',
    preview: ['#f8f9fa','#ffffff','#e8eaf0','#1a73e8'],
  },
  {
    id: 'dark',
    label: 'Dark',
    sub: 'Easy on eyes',
    bg: '#1e1e2e', card: '#292a3e', sidebar: '#11111b', accent: '#cba6f7',
    preview: ['#1e1e2e','#292a3e','#313244','#cba6f7'],
  },
  {
    id: 'sepia',
    label: 'Sepia',
    sub: 'Warm & focused',
    bg: '#FDF6E3', card: '#F4E8D1', sidebar: '#422006', accent: '#d97706',
    preview: ['#FDF6E3','#F4E8D1','#EEE0C8','#d97706'],
  },
]

const PRESETS = [
  { id:'google',    label:'Google',    bg:'#f8f9fa',  card:'#ffffff',  sidebar:'#0f172a', accent:'#1a73e8', secondary:'#fbbc04' },
  { id:'material',  label:'Material',  bg:'#202124',  card:'#292a2d',  sidebar:'#111113', accent:'#9678ff', secondary:'#03dac6' },
  { id:'sepia',     label:'Sepia',     bg:'#FDF6E3',  card:'#F4E8D1',  sidebar:'#422006', accent:'#d97706', secondary:'#b45309' },
  { id:'midnight',  label:'Midnight',  bg:'#0f172a',  card:'#1e293b',  sidebar:'#020617', accent:'#38bdf8', secondary:'#818cf8' },
  { id:'dracula',   label:'Dracula',   bg:'#282a36',  card:'#44475a',  sidebar:'#191a21', accent:'#ff79c6', secondary:'#bd93f9' },
  { id:'cyber',     label:'Cyber',     bg:'#0d1117',  card:'#161b22',  sidebar:'#010409', accent:'#00ff41', secondary:'#bc13fe' },
  { id:'forest',    label:'Forest',    bg:'#f0fdf4',  card:'#ffffff',  sidebar:'#14532d', accent:'#16a34a', secondary:'#84cc16' },
  { id:'rose',      label:'Rose',      bg:'#fff1f2',  card:'#ffffff',  sidebar:'#9d174d', accent:'#e11d48', secondary:'#f43f5e' },
  { id:'lavender',  label:'Lavender',  bg:'#faf5ff',  card:'#ffffff',  sidebar:'#4c1d95', accent:'#8b5cf6', secondary:'#c084fc' },
  { id:'sunset',    label:'Sunset',    bg:'#fff7ed',  card:'#ffffff',  sidebar:'#7c2d12', accent:'#ea580c', secondary:'#f59e0b' },
  { id:'ocean',     label:'Ocean',     bg:'#f0f7ff',  card:'#ffffff',  sidebar:'#042c53', accent:'#0284c7', secondary:'#0ea5e9' },
  { id:'synthwave', label:'Synthwave', bg:'#2b213a',  card:'#241b2f',  sidebar:'#150d20', accent:'#ff8b39', secondary:'#f83b7b' },
]

const WORD_CATS = ['Noun','Verb','Adjective','Phrasal Verb']
const DEFAULT_WORD_COLORS = {
  'Noun':'#f1f5f9','Noun Header':'#e2e8f0',
  'Verb':'#e0f2fe','Verb Header':'#bae6fd',
  'Adjective':'#f3e8ff','Adjective Header':'#d8b4fe',
  'Phrasal Verb':'#ffedd5','Phrasal Verb Header':'#fed7aa',
}

const FONTS = [
  { id:"'Inter', sans-serif",            label:'Inter',             sub:'Sans-serif · modern & clean',   sample:'Aa Bb Cc' },
  { id:"'Playfair Display', serif",      label:'Playfair Display',  sub:'Serif · academic & classic',    sample:'Aa Bb Cc' },
  { id:"'JetBrains Mono', monospace",    label:'JetBrains Mono',    sub:'Monospace · developer focused', sample:'Aa Bb Cc' },
]

const CORNERS = [
  { id:'1.5rem',  label:'Rounded',  rx:14 },
  { id:'0.5rem',  label:'Soft',     rx:5  },
  { id:'0px',     label:'Sharp',    rx:0  },
]

// ─── Tailwind color swatches ─────────────────────────────────────────────────
const SWATCHES = [
  ['#f8fafc','#fef2f2','#fff7ed','#fefce8','#f0fdf4','#eff6ff','#f5f3ff','#fdf2f8'],
  ['#e2e8f0','#fecaca','#fed7aa','#fef08a','#bbf7d0','#bfdbfe','#ddd6fe','#fbcfe8'],
  ['#94a3b8','#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa','#f472b6'],
  ['#475569','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'],
  ['#1e293b','#b91c1c','#c2410c','#a16207','#15803d','#1d4ed8','#6d28d9','#be185d'],
  ['#0f172a','#7f1d1d','#7c2d12','#422006','#14532d','#1e3a8a','#4c1d95','#831843'],
  ['#ffffff','#000000','#94a3b8','#64748b','#334155','#0f172a','#020617','#f1f5f9'],
]
const STANDARD = ['#ef4444','#f97316','#eab308','#22c55e','#0ea5e9','#6366f1','#a855f7','#ec4899']

// ─── Sub-components ──────────────────────────────────────────────────────────
function ColorPicker({ label, sublabel, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background:'var(--cp-surface)', border:'0.5px solid var(--cp-border)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: open ? 14 : 0 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>{label}</div>
          {sublabel && <div style={{ fontSize:11, color:'var(--cp-muted)', marginTop:2 }}>{sublabel}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--cp-muted)', fontWeight:600 }}>{value.toUpperCase()}</span>
          <button
            onClick={() => setOpen(o=>!o)}
            style={{
              width:28, height:28, borderRadius:6, background:value,
              border:'2px solid rgba(0,0,0,0.15)', cursor:'pointer',
              boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.35)' : 'none',
              transition:'box-shadow 0.15s', flexShrink:0,
            }}
            title="Pick color"
          />
        </div>
      </div>
      {open && (
        <div style={{ marginTop:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, marginBottom:8 }}>
            {SWATCHES.map((row,ri) => row.map((c,ci) => (
              <button key={`${ri}-${ci}`} onClick={() => { onChange(c) }} title={c}
                style={{
                  height:20, borderRadius:3, cursor:'pointer', background:c,
                  border: value.toLowerCase()===c.toLowerCase() ? '2px solid #6366f1' : '0.5px solid rgba(0,0,0,0.12)',
                  transform: value.toLowerCase()===c.toLowerCase() ? 'scale(1.2)' : 'scale(1)',
                  transition:'transform 0.1s',
                }} />
            )))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, paddingTop:8, borderTop:'0.5px solid var(--cp-border)' }}>
            {STANDARD.map(c => (
              <button key={c} onClick={() => onChange(c)} title={c}
                style={{
                  height:20, borderRadius:3, cursor:'pointer', background:c,
                  border: value.toLowerCase()===c.toLowerCase() ? '2px solid #6366f1' : '0.5px solid rgba(0,0,0,0.12)',
                  transform: value.toLowerCase()===c.toLowerCase() ? 'scale(1.2)' : 'scale(1)',
                  transition:'transform 0.1s',
                }} />
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10 }}>
            <input type="color" value={value} onChange={e=>onChange(e.target.value)}
              style={{ width:32, height:28, borderRadius:6, border:'none', padding:0, cursor:'pointer', background:'none' }} />
            <span style={{ fontSize:11, color:'var(--cp-muted)' }}>Custom color</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function UnifiedThemeModal({ isOpen, onClose, onSave, onPreview, initialTheme, initialAppearance }) {
  const [activeTab, setActiveTab] = useState('theme')
  const [theme, setTheme] = useState(initialTheme)
  const [appearance, setAppearance] = useState(initialAppearance)

  useEffect(() => {
    if (isOpen) {
      setTheme(initialTheme)
      setAppearance(initialAppearance)
      setActiveTab('theme')
    }
  }, [isOpen, initialTheme, initialAppearance])

  useEffect(() => {
    if (isOpen && onPreview) onPreview({ theme, appearance })
  }, [theme, appearance, isOpen, onPreview])

  if (!isOpen) return null

  const handleSave = () => onSave({ theme, appearance })

  const setThemeField = (key, val) => setTheme(p => ({ ...p, [key]: val }))
  const setAppField   = (path, val) => {
    setAppearance(p => {
      const next = { ...p }
      if (path.length === 1) next[path[0]] = val
      else next[path[0]] = { ...next[path[0]], [path[1]]: val }
      return next
    })
  }

  const applyPreset = (preset) => {
    setTheme(p => ({ ...p, bg: preset.bg, card: preset.card, accent: preset.accent, secondary: preset.secondary }))
    setAppearance(p => ({ ...p, colors: { ...p.colors, Sidebar: preset.sidebar } }))
  }

  const applyBaseMode = (mode) => {
    setTheme(p => ({ ...p, bg: mode.bg, card: mode.card, accent: mode.accent }))
    setAppearance(p => ({ ...p, colors: { ...p.colors, Sidebar: mode.sidebar } }))
  }

  // ── CSS vars scoped to modal ─────────────────────────────────────────────
  // Modalı her zaman aydınlık renklere zorluyoruz (yazı siyah, arka plan beyaz)
  const isDark = false
  const cpVars = {
    '--cp-bg':      '#ffffff',
    '--cp-surface': '#f8fafc',
    '--cp-border':  'rgba(0,0,0,0.1)',
    '--cp-text':    '#0f172a',
    '--cp-muted':   '#64748b',
    '--cp-header':  '#f1f5f9',
    '--cp-active':  '#6366f1',
    '--cp-divider': 'rgba(0,0,0,0.07)',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:200,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:16, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)',
      }}
    >
      <div
        data-modal
        onClick={e => e.stopPropagation()}
        style={{
          ...cpVars,
          background:'var(--cp-bg)', color:'var(--cp-text)',
          borderRadius:20, border:'0.5px solid var(--cp-border)',
          width:'100%', maxWidth:700, maxHeight:'90vh',
          display:'flex', flexDirection:'column',
          overflow:'hidden',
          boxShadow:'0 24px 64px rgba(0,0,0,0.3)',
          fontFamily:"'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding:'18px 24px 14px',
          borderBottom:'0.5px solid var(--cp-divider)',
          display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          flexShrink:0,
        }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:'var(--cp-text)', letterSpacing:'-0.02em' }}>
              Appearance & Theme
            </div>
            <div style={{ fontSize:12, color:'var(--cp-muted)', marginTop:3 }}>
              Customize every visual aspect of the application
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:32, height:32, borderRadius:'50%',
              background:'var(--cp-surface)', border:'0.5px solid var(--cp-border)',
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', color:'var(--cp-muted)', fontSize:16, flexShrink:0,
            }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{
          display:'flex', gap:2, padding:'0 20px',
          borderBottom:'0.5px solid var(--cp-divider)',
          flexShrink:0, overflowX:'auto',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'10px 14px',
                fontSize:13, fontWeight:600,
                color: activeTab===t.id ? 'var(--cp-active)' : 'var(--cp-muted)',
                background:'none', border:'none',
                borderBottom: activeTab===t.id ? '2px solid var(--cp-active)' : '2px solid transparent',
                cursor:'pointer', whiteSpace:'nowrap',
                transition:'color 0.15s',
                fontFamily:"'Inter', sans-serif",
              }}
            >
              <span style={{ fontSize:12, opacity:0.8 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:24 }}>

          {/* ── THEME TAB ─────────────────────────────────────────────── */}
          {activeTab === 'theme' && (
            <>
              <Section label="Base Mode">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {BASE_MODES.map(mode => {
                    const isActive = theme.bg.toLowerCase() === mode.bg.toLowerCase()
                    return (
                      <button
                        key={mode.id}
                        onClick={() => applyBaseMode(mode)}
                        style={{
                          padding:'14px 12px', borderRadius:12, cursor:'pointer',
                          border: isActive ? '2px solid var(--cp-active)' : '0.5px solid var(--cp-border)',
                          background: mode.bg,
                          display:'flex', flexDirection:'column', gap:8,
                          position:'relative', textAlign:'left',
                          transition:'all 0.15s',
                          boxShadow: isActive ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                        }}
                      >
                        {isActive && (
                          <div style={{
                            position:'absolute', top:8, right:8,
                            width:16, height:16, borderRadius:'50%',
                            background:'#6366f1',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:9, color:'#fff', fontWeight:700,
                          }}>✓</div>
                        )}
                        <div style={{ display:'flex', gap:5 }}>
                          {mode.preview.map((c,i) => (
                            <div key={i} style={{ width:14, height:14, borderRadius:3, background:c, border:'0.5px solid rgba(0,0,0,0.15)' }} />
                          ))}
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color: getContrastColor(mode.bg) }}>{mode.label}</div>
                        <div style={{ fontSize:11, color: getContrastColor(mode.bg), opacity:0.65 }}>{mode.sub}</div>
                      </button>
                    )
                  })}
                </div>
              </Section>

              <Divider />

              <Section label="Preset Themes">
                <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                  {PRESETS.map(preset => {
                    const isActive = theme.bg.toLowerCase()===preset.bg.toLowerCase() && theme.accent.toLowerCase()===preset.accent.toLowerCase()
                    return (
                      <div key={preset.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                        <button
                          onClick={() => applyPreset(preset)}
                          title={preset.label}
                          style={{
                            width:44, height:44, borderRadius:'50%', cursor:'pointer',
                            background:`conic-gradient(${preset.bg} 0 120deg, ${preset.accent} 120deg 240deg, ${preset.secondary} 240deg)`,
                            border: isActive ? '3px solid var(--cp-active)' : '0.5px solid var(--cp-border)',
                            outline: isActive ? '2px solid rgba(99,102,241,0.3)' : 'none',
                            outlineOffset:2,
                            transform: isActive ? 'scale(1.1)' : 'scale(1)',
                            transition:'all 0.15s',
                            position:'relative',
                          }}
                        >
                          {isActive && (
                            <div style={{
                              position:'absolute', inset:0, borderRadius:'50%',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              background:'rgba(0,0,0,0.25)',
                              fontSize:14, color:'#fff',
                            }}>✓</div>
                          )}
                        </button>
                        <span style={{ fontSize:10, color:'var(--cp-muted)', fontWeight:500 }}>{preset.label}</span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </>
          )}

          {/* ── COLORS TAB ────────────────────────────────────────────── */}
          {activeTab === 'colors' && (
            <>
              <Section label="Background & Surface">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <ColorPicker label="Background" sublabel="Page background" value={theme.bg} onChange={v => setThemeField('bg', v)} />
                  <ColorPicker label="Card color" sublabel="Content cards" value={theme.card} onChange={v => setThemeField('card', v)} />
                  <ColorPicker label="Sidebar" sublabel="Side navigation" value={appearance.colors.Sidebar} onChange={v => setAppField(['colors','Sidebar'], v)} />
                  <ColorPicker label="Accent" sublabel="Buttons & links" value={theme.accent} onChange={v => setThemeField('accent', v)} />
                </div>
              </Section>

              <Divider />

              <Section label="Word Card Colors">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {WORD_CATS.map(cat => (
                    <ColorPicker
                      key={cat}
                      label={cat}
                      sublabel="Card background"
                      value={appearance.colors[cat] || DEFAULT_WORD_COLORS[cat]}
                      onChange={v => setAppField(['colors', cat], v)}
                    />
                  ))}
                </div>
              </Section>

              <Divider />

              <Section label="Word Card Header Colors">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {WORD_CATS.map(cat => (
                    <ColorPicker
                      key={cat+'-header'}
                      label={`${cat} header`}
                      sublabel="Header strip"
                      value={appearance.colors[`${cat} Header`] || DEFAULT_WORD_COLORS[`${cat} Header`]}
                      onChange={v => setAppField(['colors', `${cat} Header`], v)}
                    />
                  ))}
                </div>
              </Section>
            </>
          )}

          {/* ── TYPOGRAPHY TAB ────────────────────────────────────────── */}
          {activeTab === 'typography' && (
            <>
              <Section label="Font Family">
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {FONTS.map(font => {
                    const isActive = appearance.typography.fontFamily === font.id
                    const ff = font.id.replace(/'/g,'').split(',')[0]
                    return (
                      <button
                        key={font.id}
                        onClick={() => setAppField(['typography','fontFamily'], font.id)}
                        style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'14px 16px', borderRadius:12, cursor:'pointer',
                          border: isActive ? '2px solid var(--cp-active)' : '0.5px solid var(--cp-border)',
                          background: isActive ? (isDark ? 'rgba(99,102,241,0.12)' : '#f0f0ff') : 'var(--cp-surface)',
                          transition:'all 0.15s',
                          fontFamily:"'Inter', sans-serif",
                        }}
                      >
                        <div style={{ textAlign:'left' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'var(--cp-text)', fontFamily:ff }}>{font.label}</div>
                          <div style={{ fontSize:11, color:'var(--cp-muted)', marginTop:3 }}>{font.sub}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:16, color:'var(--cp-muted)', fontFamily:ff }}>{font.sample}</span>
                          {isActive && (
                            <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--cp-active)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', fontWeight:700 }}>✓</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Section>

              <Divider />

              <Section label="Font Size">
                <div style={{ background:'var(--cp-surface)', borderRadius:12, border:'0.5px solid var(--cp-border)', padding:'16px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                    <span style={{ fontSize:13, color:'var(--cp-text)', fontWeight:600 }}>Text size</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--cp-active)', fontFamily:'monospace', background: isDark?'rgba(99,102,241,0.15)':'#eeefff', padding:'3px 10px', borderRadius:6 }}>
                      {appearance.typography.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range" min="14" max="22" step="1"
                    value={appearance.typography.fontSize}
                    onChange={e => setAppField(['typography','fontSize'], Number(e.target.value))}
                    style={{ width:'100%', accentColor:'var(--cp-active)' }}
                  />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--cp-muted)', marginTop:8 }}>
                    <span>Small (14px)</span><span>Default (16px)</span><span>Large (22px)</span>
                  </div>
                </div>
              </Section>

              <Divider />

              <Section label="Preview">
                <div style={{
                  background: theme.card || '#ffffff',
                  borderRadius:12, border:'0.5px solid var(--cp-border)',
                  padding:18, fontFamily: appearance.typography.fontFamily.replace(/'/g,'').split(',')[0],
                }}>
                  <div style={{ fontSize: appearance.typography.fontSize * 1.4, fontWeight:700, color: getContrastColor(theme.card||'#fff'), marginBottom:6 }}>
                    Consciousness
                  </div>
                  <div style={{ fontSize: appearance.typography.fontSize, color: getContrastColor(theme.card||'#fff'), opacity:0.7 }}>
                    /ˈkɒnʃəsnəs/ · noun
                  </div>
                  <div style={{ fontSize: appearance.typography.fontSize * 0.9, color: getContrastColor(theme.card||'#fff'), opacity:0.6, marginTop:8 }}>
                    The state of being aware of and able to think about one's own existence, thoughts, and surroundings.
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ── CARDS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'cards' && (
            <>
              <Section label="Corner Style">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {CORNERS.map(c => {
                    const isActive = appearance.corners.radius === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setAppField(['corners','radius'], c.id)}
                        style={{
                          padding:'18px 14px', borderRadius:12, cursor:'pointer',
                          border: isActive ? '2px solid var(--cp-active)' : '0.5px solid var(--cp-border)',
                          background: isActive ? (isDark?'rgba(99,102,241,0.12)':'#f0f0ff') : 'var(--cp-surface)',
                          display:'flex', flexDirection:'column', alignItems:'center', gap:14,
                          transition:'all 0.15s',
                        }}
                      >
                        <svg width="56" height="40" viewBox="0 0 56 40">
                          <rect x="2" y="2" width="52" height="36" rx={c.rx}
                            fill="none" stroke={isActive?'#6366f1':'var(--cp-muted, #94a3b8)'} strokeWidth={isActive?2:1.5} />
                        </svg>
                        <span style={{ fontSize:12, fontWeight:600, color: isActive?'var(--cp-active)':'var(--cp-text)' }}>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </Section>

              <Divider />

              <Section label="Card Preview">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
                  {[
                    { cat:'Noun', word:'Consciousness', meaning:'Bilinç, şuur' },
                    { cat:'Verb', word:'Determine', meaning:'Belirlemek' },
                    { cat:'Adjective', word:'Crucial', meaning:'Çok önemli' },
                    { cat:'Phrasal Verb', word:'Give up', meaning:'Vazgeçmek' },
                  ].map(({ cat, word, meaning }) => {
                    const bg = appearance.colors[cat] || DEFAULT_WORD_COLORS[cat]
                    const hdr = appearance.colors[`${cat} Header`] || DEFAULT_WORD_COLORS[`${cat} Header`]
                    const tc = getContrastColor(bg)
                    const ht = getContrastColor(hdr)
                    return (
                      <div key={cat} style={{ borderRadius: appearance.corners.radius, overflow:'hidden', border:'0.5px solid var(--cp-border)' }}>
                        <div style={{ background:hdr, padding:'8px 12px' }}>
                          <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:ht, opacity:0.75 }}>{cat}</span>
                        </div>
                        <div style={{ background:bg, padding:'10px 12px' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:tc }}>{word}</div>
                          <div style={{ fontSize:11, color:tc, opacity:0.7, marginTop:2 }}>{meaning}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </>
          )}

          {/* ── BRIGHTNESS TAB ────────────────────────────────────────── */}
          {activeTab === 'brightness' && (
            <>
              <Section label="Screen Brightness">
                <div style={{ background:'var(--cp-surface)', borderRadius:12, border:'0.5px solid var(--cp-border)', padding:'20px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--cp-text)' }}>Brightness level</span>
                    <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:'var(--cp-active)', background: isDark?'rgba(99,102,241,0.15)':'#eeefff', padding:'3px 10px', borderRadius:6 }}>
                      {Math.round(theme.brightness * 100)}%
                    </span>
                  </div>
                  <input
                    type="range" min="0.5" max="1.5" step="0.01"
                    value={theme.brightness}
                    onChange={e => setThemeField('brightness', Number(e.target.value))}
                    style={{ width:'100%', accentColor:'var(--cp-active)' }}
                  />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--cp-muted)', marginTop:8 }}>
                    <span>Dim (50%)</span><span>Normal (100%)</span><span>Bright (150%)</span>
                  </div>
                </div>
              </Section>

              <Divider />

              <Section label="Preview">
                <div style={{
                  borderRadius:12, overflow:'hidden', border:'0.5px solid var(--cp-border)',
                  filter: `brightness(${theme.brightness})`,
                  transition:'filter 0.2s',
                }}>
                  <div style={{ background: theme.bg, padding:16 }}>
                    <div style={{ background: theme.card, borderRadius:8, padding:'12px 14px', border:'0.5px solid var(--cp-border)' }}>
                      <div style={{ fontSize:14, fontWeight:700, color: getContrastColor(theme.card||'#fff'), marginBottom:4 }}>Sample card</div>
                      <div style={{ fontSize:12, color: getContrastColor(theme.card||'#fff'), opacity:0.65 }}>This is how your content will look at the selected brightness.</div>
                    </div>
                  </div>
                </div>
              </Section>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding:'14px 24px',
          borderTop:'0.5px solid var(--cp-divider)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0,
          background:'var(--cp-bg)',
        }}>
          <button
            onClick={() => { setTheme(initialTheme); setAppearance(initialAppearance) }}
            style={{ fontSize:12, color:'var(--cp-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif" }}
          >
            Reset to default
          </button>
          <div style={{ display:'flex', gap:8 }}>
            <button
              onClick={onClose}
              style={{
                padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600,
                color:'var(--cp-text)', background:'var(--cp-surface)',
                border:'0.5px solid var(--cp-border)', cursor:'pointer',
                fontFamily:"'Inter',sans-serif",
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              style={{
                padding:'9px 20px', borderRadius:10, fontSize:13, fontWeight:600,
                color:'#fff', background:'#6366f1',
                border:'none', cursor:'pointer',
                fontFamily:"'Inter',sans-serif",
                boxShadow:'0 2px 8px rgba(99,102,241,0.35)',
              }}
            >Save & Apply</button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--cp-muted)', marginBottom:12 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop:'0.5px solid var(--cp-divider)' }} />
}