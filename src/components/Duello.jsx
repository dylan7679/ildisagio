import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getFingerprint } from '../lib/fingerprint'
import { useAuth } from '../context/AuthContext'

const CATEGORY_CONFIG = {
  sociale: { emoji: '\u{1F465}', bg: '#FFE8E8' },
  digitale: { emoji: '\u{1F4F1}', bg: '#E8F0FF' },
  relazionale: { emoji: '\u{1F4AC}', bg: '#E8FFE8' },
  pubblico: { emoji: '\u{1F6B6}', bg: '#FFF3E8' },
  lavoro: { emoji: '\u{1F4BC}', bg: '#F0E8FF' },
  appuntamenti: { emoji: '\u{1F498}', bg: '#FFE8F5' },
}

export default function Duello({ matchData, onVoted }) {
  const [voting, setVoting] = useState(null)
  const [voted, setVoted] = useState(null)
  const [eloDelta, setEloDelta] = useState(null)
  const [streakMsg, setStreakMsg] = useState(null)
  const [error, setError] = useState(null)
  const [rateLimited, setRateLimited] = useState(false)
  const { user, profile, loadProfile } = useAuth()

  const handleVote = useCallback(async (vincitore, perdente) => {
    if (voting || voted) return
    setVoting(vincitore.id)
    setError(null)

    try {
      const fingerprint = await getFingerprint()
      const { data, error: rpcError } = await supabase.rpc('registra_voto', {
        p_vincitore: vincitore.id,
        p_perdente: perdente.id,
        p_fingerprint: fingerprint,
        p_user_id: user?.id ?? null,
      })

      if (rpcError) {
        if (rpcError.code === '23505') {
          setTimeout(() => { setVoting(null); onVoted?.() }, 400)
          return
        }
        if (rpcError.message?.includes('rate_limited') || rpcError.code === 'P0001') {
          setRateLimited(true)
          setVoting(null)
          setTimeout(() => setRateLimited(false), 10000)
          return
        }
        throw rpcError
      }

      setVoted(vincitore.id)
      setVoting(null)
      if (data) setEloDelta(data.vincitore_elo - vincitore.punteggio_elo)

      if (user?.id) {
        supabase.rpc('aggiorna_streak', { p_user_id: user.id })

        const { data: newProfile } = await supabase
          .from('user_profiles')
          .select('streak_corrente')
          .eq('id', user.id)
          .single()
        if (newProfile?.streak_corrente > 1) {
          setStreakMsg(`🔥 ${newProfile.streak_corrente} giorni di fila!`)
        }
        loadProfile(user.id)
      }

      setTimeout(() => {
        setVoted(null)
        setEloDelta(null)
        setStreakMsg(null)
        onVoted?.()
      }, 1500)
    } catch (err) {
      console.error('Errore voto:', err)
      setError('Ops, riprova.')
      setVoting(null)
    }
  }, [voting, voted, onVoted, user, loadProfile])

  if (!matchData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-[#ab2d00] border-t-transparent rounded-full animate-spin" />
        <p className="font-headline text-[#757778] text-2xl font-extrabold tracking-wide">Caricamento...</p>
      </div>
    )
  }

  const { disagio_a, disagio_b } = matchData
  const hasVoted = !!voted

  // Percentages from ELO
  const eloA = disagio_a.punteggio_elo || 1000
  const eloB = disagio_b.punteggio_elo || 1000
  const percA = Math.round(eloA / (eloA + eloB) * 100)
  const percB = 100 - percA

  return (
    <div className="flex flex-col gap-3">
      {/* Duel grid - side by side */}
      <div className="relative grid grid-cols-2 gap-3">
        {/* Card A */}
        <DuelCard
          disagio={disagio_a}
          opponent={disagio_b}
          percentage={percA}
          onVote={handleVote}
          isWinner={voted === disagio_a.id}
          isLoser={hasVoted && voted !== disagio_a.id}
          isVoting={voting === disagio_a.id}
          disabled={!!voting || hasVoted}
          eloDelta={voted === disagio_a.id ? eloDelta : null}
        />

        {/* VS badge - centered between cards */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="bg-[#ab2d00] border-[3px] border-[#2c2f30] rounded-full w-12 h-12 flex items-center justify-center ink-shadow">
            <span className="font-headline text-white text-sm font-extrabold italic leading-none">VS</span>
          </div>
        </div>

        {/* Card B */}
        <DuelCard
          disagio={disagio_b}
          opponent={disagio_a}
          percentage={percB}
          onVote={handleVote}
          isWinner={voted === disagio_b.id}
          isLoser={hasVoted && voted !== disagio_b.id}
          isVoting={voting === disagio_b.id}
          disabled={!!voting || hasVoted}
          eloDelta={voted === disagio_b.id ? eloDelta : null}
        />
      </div>

      {rateLimited && (
        <div className="rounded-xl border-[3px] border-[#ab2d00] bg-[#fce8e4] px-4 py-3 text-center">
          <p className="text-[#ab2d00] text-sm font-bold">
            Stai votando troppo velocemente! Aspetta un momento.
          </p>
        </div>
      )}

      {error && !rateLimited && (
        <p className="text-center text-[#ab2d00] text-sm font-bold">{error}</p>
      )}

      {streakMsg ? (
        <p className="text-center text-[#ab2d00] text-sm font-extrabold font-headline animate-bounce-in">
          {streakMsg}
        </p>
      ) : (
        <p className="text-center text-[#757778] text-xs font-semibold">
          tocca il disagio che ti fa piu' senso di vergogna
        </p>
      )}
    </div>
  )
}

function DuelCard({ disagio, opponent, percentage, onVote, isWinner, isLoser, isVoting, disabled, eloDelta }) {
  const catConfig = CATEGORY_CONFIG[disagio.categoria] || { emoji: '\u{1F62C}', bg: '#F0F0F0' }

  let wrapperClass = 'rounded-2xl border-[3px] border-[#2c2f30] overflow-hidden flex flex-col cursor-pointer transition-all duration-200'

  if (isWinner) {
    wrapperClass += ' bg-[#fdd400] ink-shadow-lg scale-[1.02] animate-wiggle'
  } else if (isLoser) {
    wrapperClass += ' bg-white ink-shadow-sm opacity-40'
  } else if (isVoting) {
    wrapperClass += ' bg-[#fdd400]/30 ink-shadow'
  } else if (disabled) {
    wrapperClass += ' bg-white ink-shadow opacity-70'
  } else {
    wrapperClass += ' bg-white ink-shadow hover:-translate-y-1 hover:ink-shadow-lg active:translate-y-0.5'
  }

  return (
    <button
      onClick={() => onVote(disagio, opponent)}
      disabled={disabled}
      className={wrapperClass}
    >
      {/* Image area or category placeholder */}
      {disagio.foto_url ? (
        <div className="w-full aspect-[4/3] overflow-hidden border-b-[3px] border-[#2c2f30] relative">
          <img
            src={disagio.foto_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-2 left-2 text-[10px] capitalize px-2 py-0.5 rounded-full border-[2px] border-[#2c2f30] font-bold bg-white/90 text-[#2c2f30]">
            {disagio.categoria}
          </span>
        </div>
      ) : (
        <div
          className="w-full aspect-[4/3] flex items-center justify-center border-b-[3px] border-[#2c2f30] relative"
          style={{ backgroundColor: catConfig.bg }}
        >
          <span className="text-5xl lg:text-6xl select-none">{catConfig.emoji}</span>
          <span className="absolute bottom-2 left-2 text-[10px] capitalize px-2 py-0.5 rounded-full border-[2px] border-[#2c2f30] font-bold bg-white/90 text-[#2c2f30]">
            {disagio.categoria}
          </span>
        </div>
      )}

      {/* Text + vote area */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <p className={`text-sm leading-snug font-bold line-clamp-3 text-left ${isWinner ? 'text-[#594a00]' : 'text-[#2c2f30]'}`}>
          {disagio.testo}
        </p>

        <div className="mt-auto flex items-center justify-between gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isWinner ? 'bg-[#594a00]/20 text-[#594a00]' : 'bg-[#eff1f2] text-[#595c5d]'
          }`}>
            {percentage}% voti
          </span>

          <div className="flex items-center gap-1">
            {isWinner && eloDelta != null && (
              <span className="font-headline text-[#ab2d00] text-sm font-extrabold animate-bounce-in">
                +{eloDelta}
              </span>
            )}
            <span className={`w-8 h-8 flex items-center justify-center rounded-full border-[2px] border-[#2c2f30] transition-colors ${
              isWinner ? 'bg-[#fdd400]' : 'bg-[#eff1f2]'
            }`}>
              <span className="material-symbols-outlined text-base text-[#2c2f30]">thumb_up</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
