import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getFingerprint } from '../lib/fingerprint'
import Duello from '../components/Duello'
import DisagioDelGiorno from '../components/DisagioDelGiorno'

export default function Home() {
  const [matchData, setMatchData] = useState(null)
  const [loadingMatch, setLoadingMatch] = useState(true)
  const [totalVotes, setTotalVotes] = useState(null)
  const [topDisagio, setTopDisagio] = useState(null)

  useEffect(() => {
    loadMatch()
    loadStats()
  }, [])

  async function loadMatch() {
    setLoadingMatch(true)
    try {
      const fingerprint = await getFingerprint()
      const { data } = await supabase.rpc('get_match', { p_fingerprint: fingerprint })
      if (data && data.length > 0) {
        const row = data[0]
        setMatchData({
          disagio_a: { id: row.id_a, testo: row.testo_a, categoria: row.categoria_a, punteggio_elo: row.punteggio_elo_a },
          disagio_b: { id: row.id_b, testo: row.testo_b, categoria: row.categoria_b, punteggio_elo: row.punteggio_elo_b },
        })
      } else {
        setMatchData(null)
      }
    } catch (err) {
      console.error(err)
      setMatchData(null)
    } finally {
      setLoadingMatch(false)
    }
  }

  async function loadStats() {
    const { count } = await supabase
      .from('voti')
      .select('*', { count: 'exact', head: true })
    setTotalVotes(count || 0)

    const { data } = await supabase
      .from('disagi')
      .select('testo, punteggio_elo')
      .eq('stato', 'approvato')
      .order('punteggio_elo', { ascending: false })
      .limit(1)
    if (data && data.length > 0) setTopDisagio(data[0])
  }

  const handleVoted = useCallback(() => { loadMatch() }, [])

  return (
    <div className="flex flex-col gap-6 max-w-xl lg:max-w-2xl mx-auto">

      {/* Header badge + title */}
      <div className="text-center">
        <div className="inline-block bg-[#ff9475] border-[3px] border-[#2c2f30] rounded-full px-5 py-1.5 ink-shadow-sm rotate-[-1deg] mb-3">
          <span className="font-headline text-[#2c2f30] text-xs font-extrabold uppercase tracking-wider">
            Vota il piu' cringe
          </span>
        </div>
        <h1 className="font-headline text-[#2c2f30] text-4xl lg:text-5xl font-extrabold uppercase tracking-tight">
          SFIDA SUPREMA
        </h1>
      </div>

      {/* Duel */}
      {loadingMatch ? (
        <div className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#ab2d00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matchData ? (
        <Duello matchData={matchData} onVoted={handleVoted} />
      ) : (
        <div className="text-center py-16 flex flex-col items-center gap-3 bg-white border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-lg p-8">
          <span className="text-6xl">😶</span>
          <p className="font-headline text-[#2c2f30] text-2xl font-extrabold">Nessun duello disponibile.</p>
          <p className="text-[#595c5d] text-sm">Torna piu' tardi o proponi un disagio!</p>
        </div>
      )}

      {/* Disagio del giorno */}
      <DisagioDelGiorno />

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow-sm text-center">
          <span className="text-2xl block mb-2">&#x26A1;</span>
          <p className="font-headline text-[#2c2f30] text-sm font-extrabold">Veloce</p>
          <p className="text-[#595c5d] text-xs mt-1">Vota in 2 secondi, senza account</p>
        </div>
        <div className="bg-white border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow-sm text-center">
          <span className="text-2xl block mb-2">&#x1F465;</span>
          <p className="font-headline text-[#2c2f30] text-sm font-extrabold">Comunita'</p>
          <p className="text-[#595c5d] text-xs mt-1">
            {totalVotes !== null ? `${totalVotes.toLocaleString('it-IT')} voti` : '...'} dalla community
          </p>
        </div>
        <div className="bg-white border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow-sm text-center">
          <span className="text-2xl block mb-2">&#x1F550;</span>
          <p className="font-headline text-[#2c2f30] text-sm font-extrabold">Archivio</p>
          <p className="text-[#595c5d] text-xs mt-1">Classifica live aggiornata in tempo reale</p>
        </div>
      </div>
    </div>
  )
}
