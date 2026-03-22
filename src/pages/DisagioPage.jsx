import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

export default function DisagioPage() {
  const { id } = useParams()
  const [disagio, setDisagio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vinti, setVinti] = useState(0)
  const [persi, setPersi] = useState(0)

  useEffect(() => {
    if (id) loadDisagio()
  }, [id])

  async function loadDisagio() {
    setLoading(true)
    try {
      const [{ data }, { count: countVinti }, { count: countPersi }] = await Promise.all([
        supabase
          .from('disagi')
          .select('id, testo, categoria, punteggio_elo, numero_sfide, data_inserimento')
          .eq('id', id)
          .eq('stato', 'approvato')
          .single(),
        supabase
          .from('voti')
          .select('*', { count: 'exact', head: true })
          .eq('id_disagio_vincitore', id),
        supabase
          .from('voti')
          .select('*', { count: 'exact', head: true })
          .eq('id_disagio_perdente', id),
      ])

      setDisagio(data)
      setVinti(countVinti || 0)
      setPersi(countPersi || 0)
    } catch (err) {
      console.error('Errore pagina disagio:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#e63946] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!disagio) {
    return (
      <div className="text-center py-12">
        <p className="text-[#a0a0b0]">Disagio non trovato.</p>
        <Link to="/" className="text-[#e63946] text-sm mt-4 inline-block">← Torna ai duelli</Link>
      </div>
    )
  }

  const winRate = disagio.numero_sfide > 0
    ? Math.round((vinti / disagio.numero_sfide) * 100)
    : 0

  const shareUrl = `https://ildisagio.it/disagio/${disagio.id}`
  const shareText = `"${disagio.testo}" — Vota il disagio più annientante su IlDisagio!`

  return (
    <>
      <Helmet>
        <title>{disagio.testo.slice(0, 60)} — IlDisagio</title>
        <meta name="description" content={`${disagio.testo} — Punteggio Elo: ${disagio.punteggio_elo}. Vota il disagio più annientante!`} />
        <meta property="og:title" content={`${disagio.testo.slice(0, 60)} — IlDisagio`} />
        <meta property="og:description" content={disagio.testo} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={disagio.testo.slice(0, 60)} />
        <meta name="twitter:description" content={`Punteggio Elo: ${disagio.punteggio_elo}`} />
      </Helmet>

      <div className="flex flex-col gap-6">
        <Link to="/" className="text-[#a0a0b0] text-sm hover:text-white transition-colors">
          ← Torna ai duelli
        </Link>

        {/* Card principale */}
        <div className="bg-[#16213e] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-[#a0a0b0] capitalize bg-white/5 px-2 py-0.5 rounded-full">
              {disagio.categoria}
            </span>
          </div>
          <p className="text-white text-xl leading-snug font-medium">
            {disagio.testo}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Elo" value={disagio.punteggio_elo} highlight />
          <StatBox label="Win rate" value={`${winRate}%`} />
          <StatBox label="Sfide" value={disagio.numero_sfide} />
        </div>

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'IlDisagio', text: shareText, url: shareUrl })
            } else {
              navigator.clipboard.writeText(shareUrl)
            }
          }}
          className="w-full bg-[#16213e] border border-white/10 hover:border-[#e63946]/30 rounded-xl py-4 text-sm text-[#a0a0b0] hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <span>🔗</span> Condividi questo disagio
        </button>
      </div>
    </>
  )
}

function StatBox({ label, value, highlight }) {
  return (
    <div className="bg-[#16213e] border border-white/5 rounded-xl p-4 text-center">
      <p className={`text-xl font-bold ${highlight ? 'text-[#e63946]' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-[#a0a0b0] mt-1">{label}</p>
    </div>
  )
}
