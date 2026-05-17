import { useState } from 'react'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, provider } from '../firebase'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogle = async () => {
    try {
      setError('')
      await signInWithPopup(auth, provider)
    } catch (err) {
      setError('Google girişi başarısız: ' + err.message)
    }
  }

  const handleEmailAuth = async () => {
    if (!email || !password) return setError('Email ve şifre zorunludur.')
    if (mode === 'register' && !name) return setError('İsim zorunludur.')
    if (password.length < 6) return setError('Şifre en az 6 karakter olmalıdır.')

    setLoading(true)
    setError('')

    try {
      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(result.user, { displayName: name })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Bu email zaten kayıtlı.',
        'auth/invalid-email': 'Geçersiz email adresi.',
        'auth/wrong-password': 'Şifre yanlış.',
        'auth/user-not-found': 'Bu email ile kayıtlı kullanıcı bulunamadı.',
        'auth/invalid-credential': 'Email veya şifre hatalı.',
      }
      setError(messages[err.code] || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        
        {/* Başlık */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-3xl font-black text-white shadow-lg">
              N
            </div>
          </div>
          <h1 className="text-3xl font-black text-white">NoteApp</h1>
          <p className="mt-2 text-sm text-zinc-400">Kelimelerinizi buluta kaydedin, her yerden erişin.</p>
        </div>

        {/* Tab */}
        <div className="mb-6 flex rounded-2xl bg-zinc-800 p-1">
          <button
            onClick={() => { setMode('login'); setError('') }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setMode('register'); setError('') }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${mode === 'register' ? 'bg-white text-zinc-900 shadow' : 'text-zinc-400 hover:text-white'}`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız"
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email adresiniz"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifreniz (min. 6 karakter)"
            onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Hata */}
        {error && (
          <p className="mt-3 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-400">
            {error}
          </p>
        )}

        {/* Giriş Butonu */}
        <button
          onClick={handleEmailAuth}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Yükleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
        </button>

        {/* Ayırıcı */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-700" />
          <span className="text-xs font-semibold text-zinc-500">VEYA</span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>

        {/* Google Butonu */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-zinc-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google ile Giriş Yap
        </button>
      </div>
    </div>
  )
}