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
      <DisagioDelGiorno />

      {loadingMatch ? (
        <div className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#ab2d00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matchData ? (
        <Duello matchData={matchData} onVoted={handleVoted} />
      ) : (
        <div className="text-center py-16 flex flex-col items-center gap-3 bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-lg p-8">
          <span className="text-6xl">😶</span>
          <p className="font-headline text-[#2c2f30] text-2xl font-extrabold">Nessun duello disponibile.</p>
          <p className="text-[#595c5d] text-sm">Torna piu' tardi o proponi un disagio!</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#eff1f2] border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#6d5a00] text-lg">how_to_vote</span>
            <span className="text-xs text-[#595c5d] font-bold uppercase font-headline">Voti totali</span>
          </div>
          <p className="font-headline text-[#2c2f30] text-2xl font-extrabold">
            {totalVotes !== null ? totalVotes.toLocaleString('it-IT') : '...'}
          </p>
        </div>
        <div className="bg-[#eff1f2] border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#ab2d00] text-lg">trending_up</span>
            <span className="text-xs text-[#595c5d] font-bold uppercase font-headline">Top disagio</span>
          </div>
          <p className="text-[#2c2f30] text-sm font-bold line-clamp-2">
            {topDisagio ? topDisagio.testo : '...'}
          </p>
          {topDisagio && (
            <p className="font-headline text-[#6d5a00] text-xs font-extrabold mt-1">{topDisagio.punteggio_elo} ELO</p>
          )}
        </div>
      </div>
    </div>
  )
}
