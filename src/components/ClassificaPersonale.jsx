import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ClassificaPersonale() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [topVotati, setTopVotati] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadStats()
  }, [user])

  async function loadStats() {
    setLoading(true)
    try {
      // Voti totali dell'utente
      const { count: totaleVoti } = await supabase
        .from('voti')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // I disagi più votati dall'utente come vincitori
      const { data: votiUtente } = await supabase
        .from('voti')
        .select('id_disagio_vincitore')
        .eq('user_id', user.id)
        .limit(100)

      // Conta quante volte ha votato ogni disagio
      const conteggio = {}
      votiUtente?.forEach(v => {
        conteggio[v.id_disagio_vincitore] = (conteggio[v.id_disagio_vincitore] || 0) + 1
      })

      // Prendi i top 5 più votati dall'utente
      const topIds = Object.entries(conteggio)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id)

      if (topIds.length > 0) {
        const { data: disagi } = await supabase
          .from('disagi')
          .select('id, testo, categoria, punteggio_elo')
          .in('id', topIds)

        // Ordina per frequenza di voto
        const ordinati = topIds
          .map(id => disagi?.find(d => d.id === id))
          .filter(Boolean)

        setTopVotati(ordinati)
      }

      setStats({ totaleVoti: totaleVoti || 0 })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#e6e8ea] rounded-xl border-[3px] border-[#2c2f30] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stats personali */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#ffffff] border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow text-center">
          <p className="font-headline font-extrabold text-2xl text-[#2c2f30]">
            {stats?.totaleVoti?.toLocaleString('it-IT') || 0}
          </p>
          <p className="text-[#595c5d] text-xs font-bold uppercase tracking-wide mt-1">Voti dati</p>
        </div>
        <div className="bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-xl p-4 ink-shadow text-center">
          <p className="font-headline font-extrabold text-2xl text-[#594a00]">
            {profile?.nickname || user?.email?.split('@')[0] || '—'}
          </p>
          <p className="text-[#594a00] text-xs font-bold uppercase tracking-wide mt-1">Il tuo nickname</p>
        </div>
      </div>

      {/* I tuoi disagi preferiti */}
      {topVotati.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-block bg-[#ff9475] border-[2px] border-[#2c2f30] rounded-full px-3 py-0.5 ink-shadow-sm">
              <span className="font-headline text-[#601500] text-xs font-extrabold uppercase">I tuoi preferiti</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {topVotati.map((d, i) => (
              <Link
                key={d.id}
                to={`/disagio/${d.id}`}
                className="flex items-center gap-3 bg-[#ffffff] border-[3px] border-[#2c2f30] rounded-xl p-3 ink-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(44,47,48,1)] transition-all"
              >
                <span className="font-headline font-extrabold text-xl text-[#abadae] italic w-8 text-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#2c2f30] text-sm font-bold leading-snug line-clamp-2">{d.testo}</p>
                  <span className="text-xs text-[#595c5d] capitalize font-semibold">{d.categoria}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-headline font-extrabold text-base text-[#6d5a00]">{d.punteggio_elo}</p>
                  <p className="text-[#757778] text-xs">ELO</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-[#eff1f2] border-[3px] border-[#2c2f30] rounded-2xl ink-shadow">
          <span className="text-4xl block mb-3">😶</span>
          <p className="font-headline font-extrabold text-[#2c2f30]">Ancora nessun voto!</p>
          <p className="text-[#595c5d] text-sm mt-1">Vai ai duelli e inizia a votare.</p>
          <Link to="/" className="inline-block mt-4 bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-xl px-4 py-2 font-headline font-bold text-sm ink-shadow-sm">
            Vai ai Duelli
          </Link>
        </div>
      )}
    </div>
  )
}
