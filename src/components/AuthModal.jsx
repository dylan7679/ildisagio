import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // Aggiorna nickname nel profilo
        if (data.user && nickname) {
          await supabase
            .from('user_profiles')
            .upsert({ id: data.user.id, email, nickname })
        }
        setSuccess('Registrazione completata! Controlla la mail per confermare.')
      }
    } catch (err) {
      setError(err.message || 'Errore. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2c2f30]/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-2xl p-6 w-full max-w-sm ink-shadow-lg relative">
        {/* Decorative badge */}
        <div className="absolute -top-4 left-6 bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-full px-3 py-1 ink-shadow-sm rotate-[-1deg]">
          <span className="font-headline text-[#594a00] text-xs font-extrabold uppercase tracking-wide">
            {mode === 'login' ? '👤 Accedi' : '✨ Registrati'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-[#e6e8ea] hover:bg-[#dadddf] text-[#2c2f30] transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        <h2 className="font-headline font-extrabold text-xl text-[#2c2f30] mt-4 mb-1">
          {mode === 'login' ? 'Bentornato!' : 'Unisciti all\'arena'}
        </h2>
        <p className="text-[#595c5d] text-xs mb-5">
          {mode === 'login'
            ? 'Accedi per vedere la tua classifica personale.'
            : 'Registrati per tracciare i tuoi voti e avere una classifica personale.'}
        </p>

        {success ? (
          <div className="bg-[#bed2ff] border-[3px] border-[#2c2f30] rounded-xl p-4 text-center">
            <span className="material-symbols-outlined text-2xl text-[#0058ba] block mb-2">mark_email_read</span>
            <p className="text-[#004594] font-bold text-sm">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'register' && (
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname (opzionale)"
                className="bg-[#f5f6f7] border-[3px] border-[#2c2f30] rounded-xl px-4 py-3 text-[#2c2f30] text-sm font-bold placeholder:text-[#757778]/60 focus:outline-none focus:border-[#0058ba] transition-colors"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="bg-[#f5f6f7] border-[3px] border-[#2c2f30] rounded-xl px-4 py-3 text-[#2c2f30] text-sm font-bold placeholder:text-[#757778]/60 focus:outline-none focus:border-[#0058ba] transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="bg-[#f5f6f7] border-[3px] border-[#2c2f30] rounded-xl px-4 py-3 text-[#2c2f30] text-sm font-bold placeholder:text-[#757778]/60 focus:outline-none focus:border-[#0058ba] transition-colors"
            />

            {error && (
              <p className="text-[#ab2d00] text-xs font-bold text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-cartoon bg-[#fdd400] text-[#594a00] rounded-xl py-3 font-headline font-extrabold uppercase tracking-wide text-sm disabled:opacity-40"
            >
              {loading ? 'Caricamento...' : mode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>
        )}

        {!success && (
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
            className="w-full text-center mt-4 text-[#0058ba] text-xs font-bold hover:underline"
          >
            {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        )}
      </div>
    </div>
  )
}
