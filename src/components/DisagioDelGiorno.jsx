import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DisagioDelGiorno() {
  const [disagio, setDisagio] = useState(null)
  const [votiOggi, setVotiOggi] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDisagioDelGiorno() }, [])

  async function loadDisagioDelGiorno() {
    setLoading(true)
    try {
      const { data: disagioId } = await supabase.rpc('seleziona_disagio_del_giorno')
      if (!disagioId) { setLoading(false); return }

      const { data } = await supabase
        .from('disagi')
        .select('id, testo, categoria, punteggio_elo')
        .eq('id', disagioId)
        .single()

      if (!data) { setLoading(false); return }
      setDisagio(data)

      const oggi = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('voti')
        .select('*', { count: 'exact', head: true })
        .or(`id_disagio_vincitore.eq.${data.id},id_disagio_perdente.eq.${data.id}`)
        .gte('timestamp', `${oggi}T00:00:00`)
      setVotiOggi(count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl bg-[#ffffff] border-[4px] border-[#2c2f30] p-5 ink-shadow-lg animate-pulse">
        <div className="h-4 bg-[#e6e8ea] rounded w-1/2 mb-3" />
        <div className="h-6 bg-[#e6e8ea] rounded w-full mb-2" />
        <div className="h-6 bg-[#e6e8ea] rounded w-2/3" />
      </div>
    )
  }

  if (!disagio) return null

  return (
    <div className="mb-6 relative">
      {/* Floating badge */}
      <div className="absolute -top-4 left-5 z-10">
        <div className="bg-[#ff9475] border-[3px] border-[#2c2f30] rounded-full px-4 py-1 ink-shadow-sm rotate-[-2deg]">
          <span className="font-headline text-[#2c2f30] text-sm font-extrabold tracking-wider">
            <span className="material-symbols-outlined text-sm align-middle mr-1">local_fire_department</span>
            CRINGE ALERT
          </span>
        </div>
      </div>

      <div className="bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-2xl p-5 pt-8 ink-shadow-lg">
        <h3 className="font-headline text-[#2c2f30] text-lg font-extrabold mb-2">Disagio del Giorno</h3>
        <p className="text-[#2c2f30] text-base leading-snug font-bold mb-4">
          {disagio.testo}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#595c5d] capitalize bg-[#eff1f2] border-[2px] border-[#e0e3e4] px-2.5 py-0.5 rounded-full font-bold">
            {disagio.categoria}
          </span>
          <div className="bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-xl px-3 py-1 ink-shadow-sm">
            <span className="font-headline text-[#594a00] text-sm font-bold">
              {votiOggi.toLocaleString('it-IT')} duelli oggi
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
