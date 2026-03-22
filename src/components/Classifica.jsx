import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FlagButton from './FlagButton'

const PAGE_SIZE = 20

export default function Classifica({ limit = 50, categoria = null }) {
  const [disagi, setDisagi] = useState([])
  const [rankIeri, setRankIeri] = useState({}) // { disagio_id: rank_pos }
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const loadMore = useCallback(async (currentPage, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)

    const offset = (currentPage - 1) * PAGE_SIZE

    let query = supabase
      .from('disagi')
      .select('id, testo, categoria, punteggio_elo, numero_sfide, rank_precedente')
      .eq('stato', 'approvato')
      .order('punteggio_elo', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (categoria) query = query.eq('categoria', categoria)

    const [{ data, error: disErr }, storicoMap] = await Promise.all([
      query,
      append ? Promise.resolve(rankIeri) : fetchRankStorico(),
    ])

    if (disErr) {
      setError('Impossibile caricare la classifica.')
    } else {
      if (append) {
        setDisagi(prev => [...prev, ...(data || [])])
      } else {
        setDisagi(data || [])
        setRankIeri(storicoMap)
      }
      setHasMore((data?.length ?? 0) === PAGE_SIZE)
    }

    if (append) setLoadingMore(false)
    else setLoading(false)
  }, [categoria, rankIeri])

  // Reset and reload when categoria changes
  useEffect(() => {
    setPage(1)
    setDisagi([])
    setHasMore(false)
    loadMore(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await loadMore(nextPage, true)
  }

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
  if (disagi.length === 0) return (
    <p className="text-center text-[#757778] font-bold py-16">
      Nessun disagio in questa categoria ancora. <br />
      <span className="text-sm font-normal">Proponi il primo!</span>
    </p>
  )

  const top3 = categoria ? [] : disagi.slice(0, 3)
  const rest = categoria ? disagi : disagi.slice(3)
  const startPos = categoria ? 1 : 4

  return (
    <div className="flex flex-col gap-4">
      {/* Podium - Top 3 (solo globale) */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top3.map((d, index) => (
            <PodiumCard key={d.id} disagio={d} posizione={index + 1} />
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {rest.map((d, index) => (
          <ClassificaRow
            key={d.id}
            disagio={d}
            posizione={index + startPos}
            rankIeri={rankIeri[d.id] ?? null}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && limit >= PAGE_SIZE && (
        <div className="flex justify-center mt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn-cartoon bg-[#eff1f2] text-[#2c2f30] border-[3px] border-[#2c2f30] rounded-xl py-3 px-6 font-headline font-bold text-sm disabled:opacity-50"
          >
            {loadingMore ? 'Caricamento...' : 'Carica altri 20'}
          </button>
        </div>
      )}
    </div>
  )
}

async function fetchRankStorico() {
  const ieri = new Date()
  ieri.setDate(ieri.getDate() - 1)
  const ieriStr = ieri.toISOString().slice(0, 10) // YYYY-MM-DD

  const { data } = await supabase
    .from('rank_storico')
    .select('disagio_id, rank_pos')
    .eq('data', ieriStr)

  const map = {}
  if (data) {
    data.forEach(row => {
      map[row.disagio_id] = row.rank_pos
    })
  }
  return map
}

function RankDeltaBadge({ posizione, rankIeri }) {
  // rankIeri = null means no storico entry for yesterday
  if (rankIeri === null) {
    return (
      <span className="text-[#757778] bg-[#e6e8ea] border border-[#dadddf] text-xs font-extrabold px-1.5 py-0.5 rounded-full">
        NEW
      </span>
    )
  }

  const delta = rankIeri - posizione // positive = climbed up
  if (delta === 0) return null

  if (delta > 0) {
    return (
      <span className="text-[#1a7a4a] bg-[#e6f5ed] border border-[#b3dfca] text-xs font-extrabold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full">
        <span className="material-symbols-outlined text-xs leading-none">arrow_upward</span>
        {delta}
      </span>
    )
  }

  return (
    <span className="text-[#ab2d00] bg-[#fce8e4] border border-[#f5c2b8] text-xs font-extrabold flex items-center gap-0.5 px-1.5 py-0.5 rounded-full">
      <span className="material-symbols-outlined text-xs leading-none">arrow_downward</span>
      {Math.abs(delta)}
    </span>
  )
}

function RankDelta({ posizione, rankPrecedente }) {
  if (!rankPrecedente) return null
  const delta = rankPrecedente - posizione // positivo = salito
  if (delta === 0) return <span className="text-[#757778] text-xs font-bold">—</span>
  if (delta > 0) return (
    <span className="text-[#1a7a4a] text-xs font-extrabold flex items-center gap-0.5">
      <span className="material-symbols-outlined text-xs leading-none">arrow_upward</span>
      {delta}
    </span>
  )
  return (
    <span className="text-[#ab2d00] text-xs font-extrabold flex items-center gap-0.5">
      <span className="material-symbols-outlined text-xs leading-none">arrow_downward</span>
      {Math.abs(delta)}
    </span>
  )
}

function PodiumCard({ disagio, posizione }) {
  const bgColors = { 1: 'bg-[#fdd400]', 2: 'bg-[#bed2ff]', 3: 'bg-[#ff9475]' }
  const rotations = { 1: 'rotate-[-1deg]', 2: 'rotate-[1.5deg]', 3: 'rotate-[-2deg]' }

  return (
    <Link
      to={`/disagio/${disagio.id}`}
      className={`relative block rounded-2xl border-[4px] border-[#2c2f30] p-4 pt-10 ink-shadow-lg transition-all
        hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_0px_rgba(44,47,48,1)]
        ${bgColors[posizione]} ${rotations[posizione]}`}
    >
      <div className="absolute -top-4 -left-2 bg-[#2c2f30] border-[3px] border-[#2c2f30] rounded-full w-10 h-10 flex items-center justify-center ink-shadow-sm">
        <span className="font-headline text-white text-xl font-extrabold italic">{posizione}</span>
      </div>

      {disagio.rank_precedente && (
        <div className="absolute top-2 right-3">
          <RankDelta posizione={posizione} rankPrecedente={disagio.rank_precedente} />
        </div>
      )}

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

function ClassificaRow({ disagio, posizione, rankIeri }) {
  return (
    <Link
      to={`/disagio/${disagio.id}`}
      className="flex items-center gap-3 rounded-xl p-3 border-[3px] border-[#2c2f30] bg-[#ffffff] ink-shadow-sm transition-all
        hover:translate-x-1 hover:shadow-[5px_5px_0px_0px_rgba(44,47,48,1)]"
    >
      <div className="w-8 text-center shrink-0">
        <span className="font-headline text-[#dadddf] text-2xl font-extrabold italic leading-none">
          {posizione}
        </span>
      </div>

      <div className="w-12 flex justify-center items-center shrink-0">
        <RankDeltaBadge posizione={posizione} rankIeri={rankIeri} />
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

      <FlagButton disagioId={disagio.id} />
    </Link>
  )
}
