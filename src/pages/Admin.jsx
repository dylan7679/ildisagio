import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [password, setPassword] = useState('')
  const [localAuth, setLocalAuth] = useState(false)
  const [tab, setTab] = useState('submissions')

  // Fallback password locale per test senza account
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'disagio2024'

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6f7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ab2d00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasAccess = isAdmin || localAuth

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#f5f6f7] flex items-center justify-center p-4">
        <div className="bg-white border-[4px] border-[#2c2f30] rounded-2xl p-8 w-full max-w-sm ink-shadow-lg">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="font-headline font-extrabold text-2xl text-[#2c2f30] italic">Admin Panel</h1>
            <p className="text-[#595c5d] text-sm mt-1">Accedi con il tuo account admin oppure con la password.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (password === ADMIN_PASSWORD) setLocalAuth(true) }} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password admin"
              className="bg-[#f5f6f7] border-[3px] border-[#2c2f30] rounded-xl px-4 py-3 text-[#2c2f30] font-bold focus:outline-none focus:border-[#0058ba]"
            />
            <button type="submit" className="btn-cartoon bg-[#fdd400] text-[#594a00] rounded-xl py-3 font-headline font-extrabold uppercase">
              Accedi
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      {/* Header */}
      <header className="bg-white border-b-[4px] border-[#2c2f30] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-headline font-extrabold text-xl italic text-[#2c2f30]">
            il<span className="text-[#ab2d00]">DISAGIO</span> Admin
          </span>
          <span className="text-xs text-[#595c5d] font-bold">{user?.email || 'Admin locale'}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#e6e8ea] border-[3px] border-[#2c2f30] rounded-xl p-1 ink-shadow-sm mb-6 flex-wrap">
          {[
            { id: 'submissions', label: 'Submission', icon: 'pending_actions' },
            { id: 'disagi', label: 'Disagi', icon: 'list' },
            { id: 'utenti', label: 'Utenti', icon: 'group' },
            { id: 'segnalazioni', label: 'Segnalazioni', icon: 'flag' },
            { id: 'feedback', label: 'Feedback', icon: 'feedback' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-headline font-extrabold uppercase transition-all min-w-[80px]
                ${tab === t.id ? 'bg-[#fdd400] text-[#594a00] border-[2px] border-[#2c2f30] ink-shadow-sm' : 'text-[#595c5d] hover:bg-[#dadddf]'}`}
            >
              <span className="material-symbols-outlined text-sm">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {tab === 'submissions' && <SubmissionsPanel />}
        {tab === 'disagi' && <DisagiPanel />}
        {tab === 'utenti' && <UtentiPanel />}
        {tab === 'segnalazioni' && <SegnalazioniPanel />}
        {tab === 'feedback' && <FeedbackPanel />}
      </div>
    </div>
  )
}

/* ── Submissions (in_attesa) ── */
function SubmissionsPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editTesto, setEditTesto] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase
      .from('disagi')
      .select('*')
      .eq('stato', 'in_attesa')
      .order('data_inserimento', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  async function approva(id, testo) {
    await supabase.from('disagi').update({ stato: 'approvato', testo }).eq('id', id)
    setItems(s => s.filter(d => d.id !== id))
    setEditingId(null)
  }

  async function rifiuta(id) {
    await supabase.from('disagi').update({ stato: 'rifiutato' }).eq('id', id)
    setItems(s => s.filter(d => d.id !== id))
  }

  if (loading) return <Loader />

  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-white border-[3px] border-[#2c2f30] rounded-2xl ink-shadow">
        <span className="text-4xl block mb-3">✅</span>
        <p className="font-headline font-extrabold text-[#2c2f30]">Nessuna submission in attesa.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-[#595c5d]">{items.length} in attesa di revisione</p>
      {items.map(d => (
        <div key={d.id} className="bg-white border-[3px] border-[#2c2f30] rounded-2xl p-4 ink-shadow">
          {editingId === d.id ? (
            <textarea
              value={editTesto}
              onChange={e => setEditTesto(e.target.value)}
              rows={3}
              className="w-full bg-[#f5f6f7] border-[3px] border-[#2c2f30] rounded-xl p-3 text-[#2c2f30] text-sm font-bold resize-none focus:outline-none focus:border-[#0058ba] mb-3"
            />
          ) : (
            <p className="text-[#2c2f30] text-sm font-bold leading-snug mb-3">{d.testo}</p>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs capitalize bg-[#e6e8ea] border-[2px] border-[#2c2f30] px-2 py-0.5 rounded-full font-bold">{d.categoria}</span>
            <span className="text-xs text-[#757778] font-semibold">{new Date(d.data_inserimento).toLocaleDateString('it-IT')}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {editingId === d.id ? (
              <>
                <button onClick={() => approva(d.id, editTesto)} className="btn-cartoon bg-green-500 text-white rounded-xl py-2 px-4 text-sm font-headline font-bold">Salva e approva</button>
                <button onClick={() => setEditingId(null)} className="btn-cartoon bg-[#e6e8ea] text-[#2c2f30] rounded-xl py-2 px-4 text-sm font-headline font-bold">Annulla</button>
              </>
            ) : (
              <>
                <button onClick={() => approva(d.id, d.testo)} className="btn-cartoon bg-green-500 text-white rounded-xl py-2 px-3 text-sm font-headline font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check</span> Approva
                </button>
                <button onClick={() => { setEditingId(d.id); setEditTesto(d.testo) }} className="btn-cartoon bg-[#bed2ff] text-[#004594] rounded-xl py-2 px-3 text-sm font-headline font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">edit</span> Modifica
                </button>
                <button onClick={() => rifiuta(d.id)} className="btn-cartoon bg-[#ff9475] text-[#601500] rounded-xl py-2 px-3 text-sm font-headline font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">close</span> Rifiuta
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Tutti i disagi con upload foto ── */
function DisagiPanel() {
  const [disagi, setDisagi] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(null)
  const fileInputRef = useRef(null)
  const [activeUploadId, setActiveUploadId] = useState(null)

  useEffect(() => { loadDisagi() }, [])

  async function loadDisagi() {
    setLoading(true)
    const { data } = await supabase
      .from('disagi')
      .select('id, testo, categoria, punteggio_elo, stato, foto_url')
      .order('punteggio_elo', { ascending: false })
      .limit(200)
    setDisagi(data || [])
    setLoading(false)
  }

  async function handleUploadFoto(disagioId, file) {
    if (!file) return
    setUploading(disagioId)
    try {
      const ext = file.name.split('.').pop()
      const path = `${disagioId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('disagio-images')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('disagio-images')
        .getPublicUrl(path)

      await supabase.from('disagi').update({ foto_url: publicUrl }).eq('id', disagioId)
      setDisagi(d => d.map(item => item.id === disagioId ? { ...item, foto_url: publicUrl } : item))
    } catch (err) {
      console.error('Upload error:', err)
      alert('Errore upload: assicurati di aver creato il bucket "disagio-images" su Supabase.')
    } finally {
      setUploading(null)
      setActiveUploadId(null)
    }
  }

  async function rimuoviFoto(disagioId) {
    await supabase.from('disagi').update({ foto_url: null }).eq('id', disagioId)
    setDisagi(d => d.map(item => item.id === disagioId ? { ...item, foto_url: null } : item))
  }

  const filtrati = disagi.filter(d =>
    d.testo.toLowerCase().includes(search.toLowerCase()) ||
    d.categoria.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Loader />

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Cerca disagio..."
        className="bg-white border-[3px] border-[#2c2f30] rounded-xl px-4 py-3 text-sm font-bold text-[#2c2f30] focus:outline-none focus:border-[#0058ba] ink-shadow-sm"
      />
      <p className="text-xs font-bold text-[#595c5d]">{filtrati.length} disagi</p>
      <div className="flex flex-col gap-2">
        {filtrati.map(d => (
          <div key={d.id} className="bg-white border-[3px] border-[#2c2f30] rounded-2xl p-4 ink-shadow flex gap-3 items-start">
            {/* Thumbnail foto */}
            <div className="shrink-0">
              {d.foto_url ? (
                <img src={d.foto_url} alt="" className="w-16 h-16 object-cover rounded-xl border-[2px] border-[#2c2f30]" />
              ) : (
                <div className="w-16 h-16 bg-[#e6e8ea] border-[2px] border-[#2c2f30] rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#757778] text-2xl">image</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[#2c2f30] text-sm font-bold leading-snug line-clamp-2">{d.testo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border-[2px] font-bold capitalize
                  ${d.stato === 'approvato' ? 'bg-green-100 border-green-600 text-green-800' :
                    d.stato === 'rifiutato' ? 'bg-red-100 border-red-500 text-red-700' :
                    'bg-[#fdd400] border-[#6d5a00] text-[#594a00]'}`}>
                  {d.stato}
                </span>
                <span className="text-xs text-[#757778] font-bold">{d.categoria}</span>
                <span className="text-xs font-bold text-[#6d5a00]">ELO {d.punteggio_elo}</span>
              </div>

              {/* Upload foto */}
              <div className="flex gap-2 mt-2">
                <input
                  ref={activeUploadId === d.id ? fileInputRef : null}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => handleUploadFoto(d.id, e.target.files?.[0])}
                />
                <button
                  onClick={() => { setActiveUploadId(d.id); setTimeout(() => fileInputRef.current?.click(), 50) }}
                  disabled={uploading === d.id}
                  className="btn-cartoon bg-[#bed2ff] text-[#004594] rounded-lg py-1 px-3 text-xs font-headline font-bold flex items-center gap-1 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-xs">{uploading === d.id ? 'progress_activity' : 'upload'}</span>
                  {uploading === d.id ? 'Upload...' : d.foto_url ? 'Cambia foto' : 'Aggiungi foto'}
                </button>
                {d.foto_url && (
                  <button
                    onClick={() => rimuoviFoto(d.id)}
                    className="btn-cartoon bg-[#ff9475] text-[#601500] rounded-lg py-1 px-2 text-xs font-headline font-bold"
                  >
                    <span className="material-symbols-outlined text-xs">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Utenti registrati ── */
function UtentiPanel() {
  const [utenti, setUtenti] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadUtenti() }, [])

  async function loadUtenti() {
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('data_iscrizione', { ascending: false })
    setUtenti(data || [])
    setLoading(false)
  }

  async function toggleAdmin(id, currentValue) {
    await supabase.from('user_profiles').update({ is_admin: !currentValue }).eq('id', id)
    setUtenti(u => u.map(p => p.id === id ? { ...p, is_admin: !currentValue } : p))
  }

  if (loading) return <Loader />

  if (utenti.length === 0) {
    return (
      <div className="text-center py-16 bg-white border-[3px] border-[#2c2f30] rounded-2xl ink-shadow">
        <span className="text-4xl block mb-3">👻</span>
        <p className="font-headline font-extrabold text-[#2c2f30]">Nessun utente registrato ancora.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-[#595c5d]">{utenti.length} utenti registrati</p>
      {utenti.map(u => (
        <div key={u.id} className="bg-white border-[3px] border-[#2c2f30] rounded-2xl p-4 ink-shadow flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full border-[3px] border-[#2c2f30] flex items-center justify-center font-headline font-extrabold text-sm shrink-0 ${u.is_admin ? 'bg-[#fdd400]' : 'bg-[#e6e8ea]'}`}>
            {(u.nickname || u.email || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[#2c2f30] truncate">{u.nickname || u.email || '—'}</p>
            <p className="text-xs text-[#595c5d] truncate">{u.email}</p>
            <p className="text-xs text-[#757778]">
              {u.voti_totali || 0} voti · iscritto {new Date(u.data_iscrizione).toLocaleDateString('it-IT')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {u.is_admin && (
              <span className="text-xs bg-[#fdd400] border-[2px] border-[#2c2f30] rounded-full px-2 py-0.5 font-bold">Admin</span>
            )}
            <button
              onClick={() => toggleAdmin(u.id, u.is_admin)}
              className="text-xs text-[#0058ba] font-bold hover:underline"
            >
              {u.is_admin ? 'Rimuovi admin' : 'Rendi admin'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Segnalazioni ── */
function SegnalazioniPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('segnalazioni')
      .select('id, motivo, created_at, disagio_id, user_id, disagi(testo, categoria), user_profiles(email, nickname)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function elimina(id) {
    await supabase.from('segnalazioni').delete().eq('id', id)
    setItems(s => s.filter(x => x.id !== id))
  }

  if (loading) return <Loader />

  if (items.length === 0) return (
    <div className="text-center py-16 bg-white border-[3px] border-[#2c2f30] rounded-2xl ink-shadow">
      <span className="text-4xl block mb-3">🏳️</span>
      <p className="font-headline font-extrabold text-[#2c2f30]">Nessuna segnalazione.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-bold text-[#595c5d]">{items.length} segnalazioni totali</p>
      {items.map(s => (
        <div key={s.id} className="bg-white border-[3px] border-[#2c2f30] rounded-2xl p-4 ink-shadow flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#ab2d00] uppercase mb-1">Disagio segnalato</p>
              <p className="text-sm font-bold text-[#2c2f30] line-clamp-2">
                {s.disagi?.testo || s.disagio_id}
              </p>
              <span className="text-xs text-[#595c5d] capitalize bg-[#eff1f2] border border-[#e0e3e4] px-2 py-0.5 rounded-full font-semibold inline-block mt-1">
                {s.disagi?.categoria}
              </span>
            </div>
            <button
              onClick={() => elimina(s.id)}
              className="text-xs text-[#757778] hover:text-[#ab2d00] font-bold shrink-0"
            >
              Archivia
            </button>
          </div>
          {s.motivo && (
            <p className="text-xs text-[#595c5d] bg-[#eff1f2] rounded-lg p-2 italic">"{s.motivo}"</p>
          )}
          <p className="text-xs text-[#757778]">
            Segnalato da {s.user_profiles?.nickname || s.user_profiles?.email || 'utente'} · {new Date(s.created_at).toLocaleDateString('it-IT')}
          </p>
        </div>
      ))}
    </div>
  )
}

/* ── Feedback ── */
function FeedbackPanel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('tutti')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function segnaLetto(id) {
    await supabase.from('feedback').update({ letto: true }).eq('id', id)
    setItems(s => s.map(x => x.id === id ? { ...x, letto: true } : x))
  }

  const tipoIcon = { bug: '🐛', suggerimento: '💡', altro: '💬' }
  const filtered = filter === 'tutti' ? items : items.filter(x => x.tipo === filter)
  const nonLetti = items.filter(x => !x.letto).length

  if (loading) return <Loader />

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#595c5d]">
          {items.length} feedback · {nonLetti} non letti
        </p>
        <div className="flex gap-1">
          {['tutti', 'bug', 'suggerimento', 'altro'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`capitalize px-2 py-1 rounded-lg text-xs font-bold border-[2px] transition-all
                ${filter === f ? 'bg-[#2c2f30] text-white border-[#2c2f30]' : 'bg-white text-[#595c5d] border-[#e0e3e4]'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border-[3px] border-[#2c2f30] rounded-2xl ink-shadow">
          <span className="text-4xl block mb-3">💬</span>
          <p className="font-headline font-extrabold text-[#2c2f30]">Nessun feedback.</p>
        </div>
      ) : filtered.map(f => (
        <div key={f.id} className={`bg-white border-[3px] rounded-2xl p-4 ink-shadow flex flex-col gap-2 ${f.letto ? 'border-[#e0e3e4] opacity-70' : 'border-[#2c2f30]'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{tipoIcon[f.tipo]}</span>
              <span className="capitalize text-xs font-extrabold text-[#595c5d] font-headline">{f.tipo}</span>
              {!f.letto && (
                <span className="bg-[#ab2d00] text-white text-xs rounded-full px-2 py-0.5 font-bold">Nuovo</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#757778]">{new Date(f.created_at).toLocaleDateString('it-IT')}</span>
              {!f.letto && (
                <button onClick={() => segnaLetto(f.id)} className="text-xs text-[#0058ba] font-bold hover:underline">
                  Segna letto
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-[#2c2f30] font-medium">{f.testo}</p>
          {f.email && (
            <p className="text-xs text-[#595c5d]">
              📧 <a href={`mailto:${f.email}`} className="hover:underline text-[#0058ba]">{f.email}</a>
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function Loader() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-[#e6e8ea] rounded-2xl border-[3px] border-[#2c2f30] animate-pulse" />
      ))}
    </div>
  )
}
