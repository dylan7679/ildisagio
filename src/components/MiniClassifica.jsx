import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MiniClassifica() {
  const [disagi, setDisagi] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('disagi')
      .select('id, testo, punteggio_elo, categoria')
      .eq('stato', 'approvato')
      .order('punteggio_elo', { ascending: false })
      .limit(10)
      .then(({ data }) => { setDisagi(data || []); setLoading(false) })
  }, [])

  return (
    <div className="sticky top-8">
      <div className="bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-2xl overflow-hidden ink-shadow-lg">

        {/* Header with rotated badge */}
        <div className="bg-[#fdd400] border-b-[4px] border-[#2c2f30] px-4 py-3 text-center relative">
          <h2 className="font-headline text-[#2c2f30] text-xl font-extrabold italic tracking-wide uppercase">
            <span className="material-symbols-outlined text-xl align-middle mr-1">emoji_events</span>
            TOP CRINGE
          </h2>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#eff1f2] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div>
            {disagi.map((d, i) => (
              <Link
                key={d.id}
                to={`/disagio/${d.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e6e8ea] hover:bg-[#eff1f2] transition-colors last:border-b-0"
              >
                <span className={`font-headline shrink-0 w-7 text-center font-extrabold italic ${
                  i === 0 ? 'text-[#6d5a00] text-lg' :
                  i === 1 ? 'text-[#595c5d] text-base' :
                  i === 2 ? 'text-[#ab2d00] text-base' :
                  'text-[#757778] text-sm'
                }`}>
                  {i + 1}
                </span>
                <p className="text-[#2c2f30] text-xs leading-snug flex-1 line-clamp-2 font-semibold">
                  {d.testo}
                </p>
                <span className="font-headline text-[#6d5a00] text-sm font-bold shrink-0">{d.punteggio_elo}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="border-t-[3px] border-[#2c2f30] p-3 text-center bg-[#eff1f2]">
          <Link
            to="/classifica"
            className="text-[#0058ba] text-xs font-bold font-headline hover:text-[#004594] transition-colors"
          >
            Vedi tutta la classifica
            <span className="material-symbols-outlined text-xs align-middle ml-1">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Decorative sticker */}
      <div className="mt-4 bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-xl p-3 ink-shadow text-center rotate-[-1deg]">
        <p className="font-headline text-[#594a00] text-sm font-bold">
          ogni disagio parte da 1000 ELO
        </p>
      </div>
    </div>
  )
}
