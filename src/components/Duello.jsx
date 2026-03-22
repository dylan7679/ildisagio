import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getFingerprint } from '../lib/fingerprint'
import { useAuth } from '../context/AuthContext'

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

      // Aggiorna streak e ricarica profilo
      if (user?.id) {
        // aggiorna_streak è idempotente: gestisce anche il caso già chiamato oggi
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

  return (
    <div className="flex flex-col gap-2">

      <div className="text-center mb-3">
        <h2 className="font-headline text-[#ab2d00] text-2xl lg:text-3xl font-extrabold italic uppercase tracking-tight">
          Quale ti annienta di piu'?
        </h2>
        <div className="inline-block mt-2 bg-[#ff9475] border-[3px] border-[#2c2f30] rounded-full px-4 py-1 ink-shadow-sm rotate-[-2deg]">
          <span className="font-headline text-[#2c2f30] text-xs font-extrabold uppercase tracking-wider">
            <span className="material-symbols-outlined text-xs align-middle mr-1">arrow_downward</span>
            Scegli il peggiore
          </span>
        </div>
      </div>

      {/* Card A */}
      <DisagioCard
        disagio={disagio_a}
        opponent={disagio_b}
        onVote={handleVote}
        isWinner={voted === disagio_a.id}
        isLoser={hasVoted && voted !== disagio_a.id}
        isVoting={voting === disagio_a.id}
        disabled={!!voting || hasVoted}
        eloDelta={voted === disagio_a.id ? eloDelta : null}
        tiltDeg={-2}
      />

      {/* VS badge */}
      <div className="flex items-center justify-center py-1 z-10 relative">
        <div className="bg-[#ab2d00] border-[4px] border-[#2c2f30] rounded-full w-16 h-16 flex items-center justify-center ink-shadow">
          <span className="font-headline text-white text-2xl font-extrabold italic leading-none">VS</span>
        </div>
      </div>

      {/* Card B */}
      <DisagioCard
        disagio={disagio_b}
        opponent={disagio_a}
        onVote={handleVote}
        isWinner={voted === disagio_b.id}
        isLoser={hasVoted && voted !== disagio_b.id}
        isVoting={voting === disagio_b.id}
        disabled={!!voting || hasVoted}
        eloDelta={voted === disagio_b.id ? eloDelta : null}
        tiltDeg={2}
      />

      {rateLimited && (
        <div className="mt-2 rounded-xl border-[3px] border-[#ab2d00] bg-[#fce8e4] px-4 py-3 text-center">
          <p className="text-[#ab2d00] text-sm font-bold">
            Stai votando troppo velocemente! Aspetta un momento.
          </p>
        </div>
      )}

      {error && !rateLimited && (
        <p className="text-center text-[#ab2d00] text-sm font-bold mt-2">{error}</p>
      )}

      {streakMsg ? (
        <p className="text-center text-[#ab2d00] text-sm font-extrabold font-headline mt-1 animate-bounce-in">
          {streakMsg}
        </p>
      ) : (
        <p className="text-center text-[#757778] text-xs font-semibold mt-1">
          tocca il disagio che ti fa piu' senso di vergogna
        </p>
      )}
    </div>
  )
}

function DisagioCard({ disagio, opponent, onVote, isWinner, isLoser, isVoting, disabled, eloDelta, tiltDeg }) {
  const baseTransform = `rotate(${tiltDeg}deg)`

  let cardStyle = {}
  let cardClass = ''

  if (isWinner) {
    cardStyle = { transform: 'rotate(0deg) scale(1.03)' }
    cardClass = 'bg-[#fdd400] border-[#2c2f30] ink-shadow-xl animate-wiggle'
  } else if (isLoser) {
    cardStyle = { transform: `${baseTransform} scale(0.96)`, opacity: 0.35 }
    cardClass = 'bg-[#ffffff] border-[#2c2f30] ink-shadow-sm'
  } else if (isVoting) {
    cardStyle = { transform: 'rotate(0deg) scale(1.01)' }
    cardClass = 'bg-[#fdd400]/30 border-[#6d5a00] ink-shadow'
  } else if (disabled) {
    cardStyle = { transform: baseTransform }
    cardClass = 'bg-[#ffffff] border-[#2c2f30] ink-shadow opacity-70'
  } else {
    cardStyle = { transform: baseTransform }
    cardClass = `bg-[#ffffff] border-[#2c2f30] ink-shadow-lg
      hover:shadow-[8px_8px_0px_0px_rgba(44,47,48,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-0
      active:shadow-[2px_2px_0px_0px_rgba(44,47,48,1)] active:translate-x-0.5 active:translate-y-0.5`
  }

  return (
    <button
      onClick={() => onVote(disagio, opponent)}
      disabled={disabled}
      style={{ ...cardStyle, transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      className={`w-full text-left rounded-2xl border-[4px] min-h-[120px] flex flex-col
        cursor-pointer transition-all duration-250 overflow-hidden ${cardClass}`}
    >
      {disagio.foto_url && (
        <div className="w-full aspect-square overflow-hidden border-b-[3px] border-[#2c2f30]">
          <img
            src={disagio.foto_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-5 flex flex-col justify-between flex-1">
        <p className={`text-lg leading-snug font-bold ${isWinner ? 'text-[#594a00]' : 'text-[#2c2f30]'}`}>
          {disagio.testo}
        </p>

        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs capitalize px-2.5 py-0.5 rounded-full border-[2px] font-bold ${
            isWinner
              ? 'bg-[#594a00]/20 text-[#594a00] border-[#594a00]/30'
              : 'bg-[#eff1f2] text-[#595c5d] border-[#e0e3e4]'
          }`}>
            {disagio.categoria}
          </span>

          <div className="flex items-center gap-2">
            {isWinner && eloDelta != null && (
              <span className="font-headline text-[#ab2d00] text-xl font-extrabold animate-bounce-in">
                +{eloDelta}
              </span>
            )}
            {isWinner && (
              <span className="text-2xl animate-bounce">🔥</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
