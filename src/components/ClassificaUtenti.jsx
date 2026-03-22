import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MEDALS = ['🥇', '🥈', '🥉']

export default function ClassificaUtenti() {
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchUtenti() {
      setLoading(true)
      const { data, error } = await supabase
        .from('classifica_utenti_attivi')
        .select('id, nickname, voti_totali, disagi_approvati, streak_corrente, punteggio_attivita')
        .limit(50)

      if (error) {
        setError('Errore nel caricamento della classifica.')
      } else {
        setUtenti(data || [])
      }
      setLoading(false)
    }
    fetchUtenti()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (utenti.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-xl p-3 ink-shadow rotate-[-0.3deg]">
        <p className="text-[#594a00] text-xs font-bold font-headline text-center">
          🏆 Punteggio = voti + disagi approvati × 10 + streak × 5
        </p>
      </div>

      {utenti.map((utente, index) => (
        <UtenteCard key={utente.id} utente={utente} rank={index + 1} />
      ))}
    </div>
  )
}

function UtenteCard({ utente, rank }) {
  const medal = MEDALS[rank - 1] || null
  const isTop3 = rank <= 3

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border-[3px] border-[#2c2f30] ink-shadow transition-transform hover:scale-[1.01]
        ${isTop3 ? 'bg-[#fffbea]' : 'bg-white'}`}
    >
      {/* Rank */}
      <div className="w-9 text-center shrink-0">
        {medal ? (
          <span className="text-2xl">{medal}</span>
        ) : (
          <span className="text-[#595c5d] font-headline font-extrabold text-sm">#{rank}</span>
        )}
      </div>

      {/* Avatar iniziale */}
      <div className="w-9 h-9 rounded-full bg-[#2c2f30] border-[2px] border-[#2c2f30] flex items-center justify-center shrink-0">
        <span className="text-white font-headline font-extrabold text-sm uppercase">
          {(utente.nickname || '?').charAt(0)}
        </span>
      </div>

      {/* Info utente */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-headline font-extrabold text-[#2c2f30] text-sm truncate">
            {utente.nickname || 'Anonimo'}
          </span>
          {utente.streak_corrente >= 3 && (
            <span className="text-xs shrink-0" title={`Streak: ${utente.streak_corrente} giorni`}>
              🔥{utente.streak_corrente}
            </span>
          )}
        </div>
        <div className="flex gap-3 mt-0.5">
          <StatChip icon="how_to_vote" value={utente.voti_totali} label="voti" />
          <StatChip icon="add_circle" value={utente.disagi_approvati} label="proposti" />
        </div>
      </div>

      {/* Punteggio attività */}
      <div className="text-right shrink-0">
        <span className="font-headline font-extrabold text-[#2c2f30] text-base">
          {utente.punteggio_attivita}
        </span>
        <p className="text-[#757778] text-[10px] font-bold">punti</p>
      </div>
    </div>
  )
}

function StatChip({ icon, value, label }) {
  return (
    <span className="flex items-center gap-0.5 text-[#757778] text-[10px] font-bold">
      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>{icon}</span>
      {value} {label}
    </span>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-[#e6e8ea] rounded-xl border-[3px] border-[#2c2f30] animate-pulse" />
      ))}
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="bg-[#fff0f0] border-[3px] border-[#ab2d00] rounded-xl p-4 text-center">
      <span className="material-symbols-outlined text-[#ab2d00] text-2xl">error</span>
      <p className="text-[#ab2d00] font-bold text-sm mt-1">{message}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white border-[3px] border-[#2c2f30] rounded-xl p-8 text-center ink-shadow">
      <span className="material-symbols-outlined text-[#2c2f30] text-4xl">group</span>
      <p className="text-[#595c5d] font-headline font-bold text-sm mt-2">
        Nessun utente in classifica ancora.<br />
        Registrati e vota per essere il primo!
      </p>
    </div>
  )
}
