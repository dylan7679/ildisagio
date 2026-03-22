import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TIPI = [
  { value: 'bug', label: '🐛 Bug', desc: 'Qualcosa non funziona' },
  { value: 'suggerimento', label: '💡 Idea', desc: 'Ho un suggerimento' },
  { value: 'altro', label: '💬 Altro', desc: 'Altro messaggio' },
]

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState('suggerimento')
  const [testo, setTesto] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!testo.trim() || sending) return
    setSending(true)
    const { error } = await supabase.from('feedback').insert({
      tipo,
      testo: testo.trim(),
      email: email.trim() || null,
      user_id: user?.id ?? null,
    })
    if (!error) {
      setSent(true)
      setTimeout(() => {
        setOpen(false)
        setSent(false)
        setTesto('')
        setEmail('')
        setTipo('suggerimento')
      }, 2000)
    }
    setSending(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 z-40 bg-[#0058ba] text-white border-[3px] border-[#2c2f30] rounded-full w-12 h-12 flex items-center justify-center ink-shadow hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(44,47,48,1)] transition-all"
        title="Segnala un bug o suggerisci una feature"
      >
        <span className="material-symbols-outlined text-xl">feedback</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#f5f6f7] border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-xl w-full max-w-sm flex flex-col gap-4 overflow-hidden">

            {/* Header */}
            <div className="bg-[#0058ba] px-5 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-white text-lg font-extrabold">Feedback</h3>
                <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-white/70 text-xs mt-1">Bug, idee, critiche — tutto è benvenuto.</p>
            </div>

            {sent ? (
              <div className="px-5 pb-5 text-center flex flex-col items-center gap-2">
                <span className="text-4xl">🙏</span>
                <p className="font-headline text-[#2c2f30] text-lg font-extrabold">Grazie!</p>
                <p className="text-[#595c5d] text-sm">Il tuo feedback è stato inviato.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-3">
                {/* Tipo */}
                <div className="grid grid-cols-3 gap-2">
                  {TIPI.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTipo(t.value)}
                      className={`flex flex-col items-center p-2 rounded-xl border-[2px] text-xs font-bold font-headline transition-all
                        ${tipo === t.value
                          ? 'bg-[#fdd400] border-[#2c2f30] text-[#2c2f30] ink-shadow-sm'
                          : 'bg-white border-[#e0e3e4] text-[#595c5d] hover:border-[#2c2f30]'
                        }`}
                    >
                      <span className="text-base">{t.label.split(' ')[0]}</span>
                      <span>{t.label.split(' ')[1]}</span>
                    </button>
                  ))}
                </div>

                {/* Testo */}
                <textarea
                  value={testo}
                  onChange={e => setTesto(e.target.value)}
                  placeholder="Descrivi il problema o l'idea..."
                  required
                  rows={4}
                  className="w-full border-[3px] border-[#2c2f30] rounded-xl p-3 text-sm resize-none bg-white focus:outline-none focus:border-[#0058ba]"
                />

                {/* Email opzionale (solo se non loggato) */}
                {!user && (
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email (opzionale, per risposta)"
                    className="w-full border-[3px] border-[#2c2f30] rounded-xl p-3 text-sm bg-white focus:outline-none focus:border-[#0058ba]"
                  />
                )}

                <button
                  type="submit"
                  disabled={!testo.trim() || sending}
                  className="btn-cartoon bg-[#fdd400] text-[#2c2f30] rounded-xl py-3 font-headline font-extrabold uppercase text-sm disabled:opacity-50"
                >
                  {sending ? 'Invio...' : 'Invia feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
