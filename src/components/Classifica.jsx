import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Classifica({ limit = 50 }) {
  const [disagi, setDisagi] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('disagi')
      .select('id, testo, categoria, punteggio_elo, numero_sfide')
      .eq('stato', 'approvato')
      .order('punteggio_elo', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) setError('Impossibile caricare la classifica.')
        else setDisagi(data || [])
        setLoading(false)
      })
  }, [limit])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#ffffff] rounded-xl border-[3px] border-[#2c2f30] ink-shadow-sm animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-center text-[#ab2d00] font-bold py-8">{error}</p>

  const top3 = disagi.slice(0, 3)
  const rest = disagi.slice(3)

  return (
    <div className="flex flex-col gap-4">
      {/* Podium - Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top3.map((d, index) => (
            <PodiumCard key={d.id} disagio={d} posizione={index + 1} />
          ))}
        </div>
      )}

      {/* Rest of the list */}
      <div className="flex flex-col gap-2">
        {rest.map((d, index) => (
          <ClassificaRow key={d.id} disagio={d} posizione={index + 4} />
        ))}
      </div>
    </div>
  )
}

function PodiumCard({ disagio, posizione }) {
  const bgColors = {
    1: 'bg-[#fdd400]',
    2: 'bg-[#bed2ff]',
    3: 'bg-[#ff9475]',
  }
  const rotations = {
    1: 'rotate-[-1deg]',
    2: 'rotate-[1.5deg]',
    3: 'rotate-[-2deg]',
  }

  return (
    <Link
      to={`/disagio/${disagio.id}`}
      className={`relative block rounded-2xl border-[4px] border-[#2c2f30] p-4 pt-10 ink-shadow-lg transition-all
        hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(44,47,48,1)]
        ${bgColors[posizione]} ${rotations[posizione]}`}
    >
      {/* Position number */}
      <div className="absolute -top-4 -left-2 bg-[#2c2f30] border-[3px] border-[#2c2f30] rounded-full w-10 h-10 flex items-center justify-center ink-shadow-sm">
        <span className="font-headline text-white text-xl font-extrabold italic">{posizione}</span>
      </div>

      <p className="text-[#2c2f30] text-sm leading-snug font-bold line-clamp-3 mb-3">{disagio.testo}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#595c5d] capitalize bg-white/50 border-[2px] border-[#2c2f30]/20 px-2 py-0.5 rounded-full font-bold">
          {disagio.categoria}
        </span>
        <span className="font-headline text-[#2c2f30] text-lg font-extrabold">{disagio.punteggio_elo}</span>
      </div>
    </Link>
  )
}

function ClassificaRow({ disagio, posizione }) {
  return (
    <Link
      to={`/disagio/${disagio.id}`}
      className="flex items-center gap-3 rounded-xl p-3 border-[3px] border-[#2c2f30] bg-[#ffffff] ink-shadow-sm transition-all
        hover:translate-x-1 hover:shadow-[5px_5px_0px_0px_rgba(44,47,48,1)]"
    >
      <div className="w-10 text-center shrink-0">
        <span className="font-headline text-[#dadddf] text-2xl font-extrabold italic">
          {posizione}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[#2c2f30] text-sm leading-snug font-bold line-clamp-2">{disagio.testo}</p>
        <span className="text-xs text-[#595c5d] capitalize bg-[#eff1f2] border border-[#e0e3e4] px-2 py-0.5 rounded-full font-semibold inline-block mt-1">
          {disagio.categoria}
        </span>
      </div>

      <div className="text-right shrink-0">
        <p className="font-headline text-[#6d5a00] text-lg font-extrabold leading-none">{disagio.punteggio_elo}</p>
        <p className="text-[#757778] text-xs">{disagio.numero_sfide} sfide</p>
      </div>
    </Link>
  )
}
