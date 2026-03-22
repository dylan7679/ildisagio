import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MOTIVI = [
  { value: 'inappropriato', label: 'Inappropriato' },
  { value: 'duplicato', label: 'Duplicato' },
  { value: 'non_pertinente', label: 'Non pertinente' },
  { value: 'altro', label: 'Altro' },
]

export default function FlagButton({ disagioId }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [segnalato, setSegnalato] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  if (segnalato) {
    return (
      <span className="text-xs text-[#595c5d] font-semibold whitespace-nowrap">Segnalato ✓</span>
    )
  }

  async function segnala(motivo) {
    setLoading(true)
    setOpen(false)
    const { error } = await supabase.from('segnalazioni').insert({
      disagio_id: disagioId,
      user_id: user.id,
      motivo,
    })
    if (!error) setSegnalato(true)
    setLoading(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={(e) => { e.preventDefault(); setOpen(o => !o) }}
        disabled={loading}
        className="text-[#abadae] hover:text-[#ab2d00] transition-colors p-1"
        title="Segnala"
      >
        <span className="material-symbols-outlined text-base leading-none">flag</span>
      </button>
      {open && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.preventDefault(); setOpen(false) }}
          />
          <div className="absolute right-0 bottom-8 bg-white border-[3px] border-[#2c2f30] rounded-xl ink-shadow z-50 min-w-[160px] overflow-hidden">
            {MOTIVI.map(m => (
              <button
                key={m.value}
                onClick={(e) => { e.preventDefault(); segnala(m.value) }}
                className="block w-full text-left px-3 py-2 text-sm font-semibold text-[#2c2f30] hover:bg-[#f5f6f7] transition-colors"
              >
                {m.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
