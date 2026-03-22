import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIE = ['sociale', 'digitale', 'relazionale', 'pubblico', 'lavoro', 'appuntamenti']
const MAX_CHARS = 280

export default function FormSubmission() {
  const [testo, setTesto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const honeypotRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()

    // Honeypot check
    if (honeypotRef.current?.value) return

    if (!testo.trim() || !categoria) return
    if (testo.length > MAX_CHARS) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const { error } = await supabase
        .from('disagi')
        .insert({
          testo: testo.trim(),
          categoria,
          stato: 'in_attesa',
          lingua: 'it',
        })

      if (error) throw error

      setStatus('success')
      setTesto('')
      setCategoria('')
    } catch (err) {
      console.error('Errore submission:', err)
      setErrorMsg('Ops, qualcosa e\' andato storto. Riprova tra poco.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-20 h-20 bg-[#fdd400] border-[4px] border-[#2c2f30] rounded-full flex items-center justify-center ink-shadow-lg animate-pop">
          <span className="material-symbols-outlined text-4xl text-[#594a00]">check_circle</span>
        </div>
        <h3 className="text-[#2c2f30] font-headline font-extrabold text-xl">Proposta inviata!</h3>
        <p className="text-[#595c5d] text-sm max-w-xs">
          Il tuo disagio e' in attesa di moderazione. Se rispetta i criteri, entrera' presto in classifica.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-2 text-[#0058ba] text-sm font-bold underline font-headline hover:text-[#004594]"
        >
          Proponi un altro
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative bg-[#eff1f2] border-[4px] border-[#2c2f30] rounded-2xl p-6 ink-shadow-lg">
      {/* Honeypot */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        className="absolute -left-[9999px]"
        autoComplete="off"
      />

      {/* Decorative circle */}
      <div className="absolute -top-4 -right-4 w-14 h-14 bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-full flex items-center justify-center ink-shadow-sm rotate-[12deg]">
        <span className="material-symbols-outlined text-2xl text-[#594a00]">edit</span>
      </div>

      <div className="flex flex-col gap-5">
        {/* Textarea */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-headline font-extrabold uppercase text-[#2c2f30] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">description</span>
            Descrivi il disagio
          </label>
          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Es. Salutare qualcuno convintissimo e accorgersi che stava salutando quello dietro di te."
            rows={4}
            maxLength={MAX_CHARS}
            required
            className="bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-xl p-4 text-[#2c2f30] placeholder:text-[#757778]/60 text-sm resize-none focus:outline-none focus:border-[#0058ba] transition-colors"
          />
          <div className={`text-right text-xs font-bold ${testo.length > MAX_CHARS * 0.9 ? 'text-[#ab2d00]' : 'text-[#757778]'}`}>
            {testo.length}/{MAX_CHARS}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-headline font-extrabold uppercase text-[#2c2f30] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">category</span>
            Categoria
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CATEGORIE.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat)}
                className={`py-2.5 px-3 rounded-xl text-sm capitalize border-[3px] font-bold transition-all font-headline
                  ${categoria === cat
                    ? 'bg-[#fdd400] border-[#2c2f30] text-[#594a00] ink-shadow -translate-y-0.5'
                    : 'bg-[#dadddf] border-[#2c2f30] text-[#595c5d] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(44,47,48,1)]'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tip box */}
        <div className="bg-[#bed2ff] border-[3px] border-[#2c2f30] rounded-xl p-4 text-xs text-[#004594] space-y-1 rotate-[1deg] ink-shadow-sm">
          <p className="font-headline font-extrabold text-sm text-[#004594] mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            Linee guida
          </p>
          <p className="font-semibold">Situazione universale e riconoscibile</p>
          <p className="font-semibold">Si ride della situazione, non delle persone</p>
          <p className="font-semibold text-[#ab2d00]">No riferimenti a caratteristiche personali</p>
          <p className="font-semibold text-[#ab2d00]">No sofferenza reale</p>
        </div>

        {status === 'error' && (
          <p className="text-[#ab2d00] text-sm text-center font-bold">{errorMsg}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!testo.trim() || !categoria || status === 'loading' || testo.length > MAX_CHARS}
          className="btn-cartoon bg-[#fdd400] text-[#594a00] rounded-xl py-4 font-headline text-base font-extrabold italic uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Invio in corso...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">send</span>
              Proponi il disagio
            </span>
          )}
        </button>
      </div>
    </form>
  )
}
