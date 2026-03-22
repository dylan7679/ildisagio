import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function DisagioPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [disagio, setDisagio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [segnalato, setSegnalato] = useState(false)
  const [segnalando, setSegnalando] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagMotivo, setFlagMotivo] = useState('')
  const [rank, setRank] = useState(null)
  const [vinti, setVinti] = useState(0)
  const [persi, setPersi] = useState(0)

  useEffect(() => {
    async function load() {
      const [{ data }, { count: countVinti }, { count: countPersi }] = await Promise.all([
        supabase
          .from('disagi')
          .select('id, testo, categoria, punteggio_elo, numero_sfide, foto_url, data_inserimento')
          .eq('id', id)
          .eq('stato', 'approvato')
          .single(),
        supabase.from('voti').select('*', { count: 'exact', head: true }).eq('id_disagio_vincitore', id),
        supabase.from('voti').select('*', { count: 'exact', head: true }).eq('id_disagio_perdente', id),
      ])

      if (!data) { setNotFound(true); setLoading(false); return }
      setDisagio(data)
      setVinti(countVinti || 0)
      setPersi(countPersi || 0)

      // Rank approssimativo
      const { count } = await supabase
        .from('disagi')
        .select('*', { count: 'exact', head: true })
        .eq('stato', 'approvato')
        .gt('punteggio_elo', data.punteggio_elo)
      setRank((count ?? 0) + 1)

      // Controlla se già segnalato
      if (user) {
        const { data: seg } = await supabase
          .from('segnalazioni')
          .select('id')
          .eq('disagio_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        if (seg) setSegnalato(true)
      }

      setLoading(false)
    }
    load()
  }, [id, user])

  async function handleSegnala() {
    if (!user || segnalando) return
    setSegnalando(true)
    const { error } = await supabase.from('segnalazioni').insert({
      disagio_id: id,
      user_id: user.id,
      motivo: flagMotivo || null,
    })
    if (!error) { setSegnalato(true); setShowFlagModal(false) }
    setSegnalando(false)
  }

  function handleShare() {
    const url = window.location.href
    const text = `"${disagio.testo}" — votalo su IlDisagio!`
    if (navigator.share) navigator.share({ title: 'IlDisagio', text, url })
    else { navigator.clipboard.writeText(url); alert('Link copiato!') }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#ab2d00] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (notFound) return (
    <div className="max-w-lg mx-auto text-center py-20 flex flex-col gap-4">
      <span className="text-6xl">😶</span>
      <h1 className="font-headline text-2xl font-extrabold text-[#2c2f30]">Disagio non trovato</h1>
      <Link to="/classifica" className="btn-cartoon bg-[#fdd400] text-[#2c2f30] rounded-xl py-3 px-6 font-headline font-extrabold uppercase inline-block">
        Vai alla classifica
      </Link>
    </div>
  )

  const winRate = disagio.numero_sfide > 0
    ? Math.round((vinti / disagio.numero_sfide) * 100)
    : 0

  return (
    <>
      <Helmet>
        <title>{disagio.testo.slice(0, 60)} — IlDisagio</title>
        <meta name="description" content={`"${disagio.testo}" — Vota i disagi più imbarazzanti d'Italia.`} />
        <meta property="og:title" content={`"${disagio.testo.slice(0, 80)}" — IlDisagio`} />
        <meta property="og:description" content={`${disagio.punteggio_elo} ELO · #${rank} in classifica · ${disagio.numero_sfide} sfide`} />
        <meta property="og:type" content="article" />
        {disagio.foto_url && <meta property="og:image" content={disagio.foto_url} />}
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="max-w-xl mx-auto flex flex-col gap-5">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#757778] font-semibold">
          <Link to="/" className="hover:text-[#2c2f30]">Home</Link>
          <span>›</span>
          <Link to="/classifica" className="hover:text-[#2c2f30]">Classifica</Link>
          <span>›</span>
          <span className="capitalize text-[#595c5d]">{disagio.categoria}</span>
        </div>

        {/* Categoria badge */}
        <div className="inline-flex">
          <span className="capitalize bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-full px-4 py-1 font-headline text-xs font-extrabold uppercase ink-shadow-sm">
            {disagio.categoria}
          </span>
        </div>

        {/* Card principale */}
        <div className="bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-xl overflow-hidden rotate-[-0.5deg]">
          {disagio.foto_url && (
            <div className="w-full aspect-video overflow-hidden border-b-[3px] border-[#2c2f30]">
              <img src={disagio.foto_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <p className="font-headline text-[#2c2f30] text-xl sm:text-2xl font-extrabold leading-snug">
              "{disagio.testo}"
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'ELO', value: disagio.punteggio_elo, bg: 'bg-[#fdd400]', text: 'text-[#594a00]' },
            { label: 'Posizione', value: `#${rank}`, bg: 'bg-[#eff1f2]', text: 'text-[#2c2f30]' },
            { label: 'Sfide', value: disagio.numero_sfide, bg: 'bg-[#eff1f2]', text: 'text-[#2c2f30]' },
            { label: 'Win rate', value: `${winRate}%`, bg: 'bg-[#eff1f2]', text: 'text-[#2c2f30]' },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className={`${bg} border-[3px] border-[#2c2f30] rounded-xl p-3 ink-shadow-sm text-center`}>
              <p className={`font-headline ${text} text-xl font-extrabold leading-none`}>{value}</p>
              <p className="text-[#757778] text-xs font-bold uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Azioni */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 btn-cartoon bg-[#0058ba] text-white rounded-xl py-3 font-headline font-extrabold uppercase text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            Condividi
          </button>
          <Link
            to="/"
            className="flex-1 btn-cartoon bg-[#fdd400] text-[#2c2f30] rounded-xl py-3 font-headline font-extrabold uppercase text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">swords</span>
            Vota ora
          </Link>
        </div>

        {/* Flag community */}
        {user && (
          <div className="flex justify-end">
            {segnalato ? (
              <p className="text-xs text-[#757778] font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                Segnalazione inviata
              </p>
            ) : (
              <button
                onClick={() => setShowFlagModal(true)}
                className="text-xs text-[#757778] font-semibold hover:text-[#ab2d00] flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">flag</span>
                Segnala questo disagio
              </button>
            )}
          </div>
        )}

        {/* Modal flag */}
        {showFlagModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#f5f6f7] border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
              <h3 className="font-headline text-[#2c2f30] text-lg font-extrabold">Segnala disagio</h3>
              <p className="text-[#595c5d] text-sm">Viola le linee guida? Dicci perché (opzionale).</p>
              <textarea
                value={flagMotivo}
                onChange={e => setFlagMotivo(e.target.value)}
                placeholder="Es. contiene riferimenti personali, è offensivo..."
                className="w-full border-[3px] border-[#2c2f30] rounded-xl p-3 text-sm resize-none bg-white focus:outline-none focus:border-[#ab2d00]"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFlagModal(false)}
                  className="flex-1 bg-[#e0e3e4] text-[#2c2f30] rounded-xl py-2.5 font-headline font-bold uppercase text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSegnala}
                  disabled={segnalando}
                  className="flex-1 btn-cartoon bg-[#ab2d00] text-white rounded-xl py-2.5 font-headline font-bold uppercase text-sm"
                >
                  {segnalando ? '...' : 'Segnala'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
