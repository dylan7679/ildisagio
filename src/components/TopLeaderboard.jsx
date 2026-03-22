import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function TopLeaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('disagi') // 'users' or 'disagi'
  const { user } = useAuth()

  useEffect(() => {
    loadLeaderboard()
  }, [user])

  async function loadLeaderboard() {
    setLoading(true)

    // Try loading top users by vote count first
    if (user) {
      try {
        const { data: topUsers } = await supabase
          .from('voti')
          .select('user_id, user_profiles(nickname)')
          .not('user_id', 'is', null)
          .limit(500)

        if (topUsers && topUsers.length > 0) {
          // Aggregate votes per user
          const voteCounts = {}
          const nicknames = {}
          for (const row of topUsers) {
            const uid = row.user_id
            voteCounts[uid] = (voteCounts[uid] || 0) + 1
            if (row.user_profiles?.nickname) {
              nicknames[uid] = row.user_profiles.nickname
            }
          }

          const sorted = Object.entries(voteCounts)
            .map(([uid, count]) => ({ id: uid, name: nicknames[uid] || 'Anonimo', votes: count }))
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 10)

          if (sorted.length >= 3) {
            setEntries(sorted)
            setMode('users')
            setLoading(false)
            return
          }
        }
      } catch {
        // Fall through to disagi fallback
      }
    }

    // Fallback: top disagi by ELO
    const { data } = await supabase
      .from('disagi')
      .select('id, testo, punteggio_elo, categoria')
      .eq('stato', 'approvato')
      .order('punteggio_elo', { ascending: false })
      .limit(10)

    setEntries((data || []).map((d, i) => ({
      id: d.id,
      name: d.testo,
      votes: d.punteggio_elo,
      categoria: d.categoria,
    })))
    setMode('disagi')
    setLoading(false)
  }

  const POSITION_STYLES = [
    'bg-[#111111] text-white',     // 1st
    'bg-[#757778] text-white',     // 2nd
    'bg-[#ab2d00] text-white',     // 3rd
  ]

  return (
    <div className="sticky top-8 flex flex-col gap-4">
      <div className="bg-white border-[4px] border-[#2c2f30] rounded-2xl overflow-hidden ink-shadow-lg">
        {/* Header */}
        <div className="bg-[#111111] px-4 py-3 text-center">
          <h2 className="font-headline text-white text-lg font-extrabold uppercase tracking-wide">
            <span className="material-symbols-outlined text-[#fdd400] text-lg align-middle mr-1.5">emoji_events</span>
            Top Leaderboard
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
            {entries.map((entry, i) => {
              const isFirst = i === 0
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-[#e6e8ea] last:border-b-0 transition-colors ${
                    isFirst ? 'bg-[#fdd400]/20' : 'bg-white hover:bg-[#eff1f2]'
                  }`}
                >
                  {/* Position badge */}
                  <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-extrabold font-headline ${
                    i < 3 ? POSITION_STYLES[i] : 'bg-[#eff1f2] text-[#595c5d]'
                  }`}>
                    {i + 1}
                  </span>

                  {/* Name */}
                  <p className="text-[#2c2f30] text-xs leading-snug flex-1 line-clamp-2 font-semibold">
                    {entry.name}
                  </p>

                  {/* Score */}
                  <span className="font-headline text-[#6d5a00] text-sm font-bold shrink-0">
                    {mode === 'users' ? `${entry.votes} voti` : entry.votes}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* View all link */}
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

      {/* CTA card */}
      <div className="bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-2xl p-5 ink-shadow text-center">
        <span className="text-3xl block mb-2">&#x1F3C6;</span>
        <p className="font-headline text-[#2c2f30] text-base font-extrabold uppercase leading-tight">
          Diventa il re del disagio!
        </p>
        <p className="text-[#594a00] text-xs mt-1.5 font-semibold">
          Vota, proponi e scala la classifica
        </p>
        <Link
          to="/classifica"
          className="btn-cartoon bg-[#111111] text-white rounded-xl py-2.5 px-5 mt-3 inline-block text-xs uppercase"
        >
          Vai alla classifica
        </Link>
      </div>
    </div>
  )
}
