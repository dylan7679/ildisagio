import { useState } from 'react'
import Classifica from '../components/Classifica'
import ClassificaPersonale from '../components/ClassificaPersonale'
import { useAuth } from '../context/AuthContext'

const CATEGORIE = [
  { value: 'sociale', label: 'Sociale' },
  { value: 'digitale', label: 'Digitale' },
  { value: 'relazionale', label: 'Relazionale' },
  { value: 'pubblico', label: 'Pubblico' },
  { value: 'lavoro', label: 'Lavoro' },
  { value: 'appuntamenti', label: 'Appuntamenti' },
]

export default function ClassificaPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('globale')
  const [categoriaFiltro, setCategoriaFiltro] = useState(null) // for globale filter
  const [categoriaTab, setCategoriaTab] = useState('sociale') // for per-categoria tab

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="mb-2 rotate-[-0.5deg]">
        <h1 className="font-headline text-[#2c2f30] text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight leading-none">
          La Hall of <span className="text-[#ab2d00]">CRINGE</span>
        </h1>
        <p className="text-[#595c5d] text-sm mt-2">
          Le situazioni più imbarazzanti d'Italia, classificate dall'algoritmo ELO della vergogna.
        </p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 bg-[#e6e8ea] border-[3px] border-[#2c2f30] rounded-xl p-1 ink-shadow-sm">
        <TabBtn active={tab === 'globale'} onClick={() => setTab('globale')} icon="public">
          Globale
        </TabBtn>
        <TabBtn active={tab === 'categoria'} onClick={() => setTab('categoria')} icon="category">
          Categorie
        </TabBtn>
        {user ? (
          <TabBtn active={tab === 'personale'} onClick={() => setTab('personale')} icon="person">
            La mia
          </TabBtn>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1 text-[#757778] text-xs font-bold py-2 font-headline">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span className="hidden sm:inline">Accedi per la tua classifica</span>
            <span className="sm:hidden">Accedi</span>
          </div>
        )}
      </div>

      {/* Globale: filtro categoria facoltativo */}
      {tab === 'globale' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <CategoryChip
              label="Tutti"
              active={categoriaFiltro === null}
              onClick={() => setCategoriaFiltro(null)}
            />
            {CATEGORIE.map(cat => (
              <CategoryChip
                key={cat.value}
                label={cat.label}
                active={categoriaFiltro === cat.value}
                onClick={() => setCategoriaFiltro(cat.value === categoriaFiltro ? null : cat.value)}
              />
            ))}
          </div>
          <Classifica limit={50} categoria={categoriaFiltro} />
        </>
      )}

      {/* Per Categoria: pill selettore + top 20 */}
      {tab === 'categoria' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {CATEGORIE.map(cat => (
              <CategoryPill
                key={cat.value}
                label={cat.label}
                active={categoriaTab === cat.value}
                onClick={() => setCategoriaTab(cat.value)}
              />
            ))}
          </div>
          <Classifica limit={20} categoria={categoriaTab} />
        </>
      )}

      {tab === 'personale' && <ClassificaPersonale />}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-headline font-extrabold uppercase transition-all
        ${active
          ? 'bg-[#fdd400] text-[#594a00] border-[2px] border-[#2c2f30] ink-shadow-sm'
          : 'text-[#595c5d] hover:bg-[#dadddf]'
        }`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`capitalize px-3 py-1 rounded-full text-xs font-bold border-[2px] transition-all font-headline whitespace-nowrap
        ${active
          ? 'bg-[#2c2f30] text-white border-[#2c2f30] ink-shadow-sm'
          : 'bg-[#ffffff] text-[#595c5d] border-[#e0e3e4] hover:border-[#2c2f30]'
        }`}
    >
      {label}
    </button>
  )
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-extrabold border-[2px] transition-all font-headline whitespace-nowrap shrink-0
        ${active
          ? 'bg-[#fdd400] text-[#594a00] border-[#2c2f30] ink-shadow-sm'
          : 'bg-[#ffffff] text-[#595c5d] border-[#e0e3e4] hover:border-[#2c2f30] hover:bg-[#f5f6f7]'
        }`}
    >
      {label}
    </button>
  )
}
