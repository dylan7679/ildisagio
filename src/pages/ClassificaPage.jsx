import { useState } from 'react'
import { Link } from 'react-router-dom'
import Classifica from '../components/Classifica'
import ClassificaPersonale from '../components/ClassificaPersonale'
import { useAuth } from '../context/AuthContext'

export default function ClassificaPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('globale')

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto lg:mx-0">
      <div className="mb-2 rotate-[-0.5deg]">
        <h1 className="font-headline text-[#2c2f30] text-3xl sm:text-4xl font-extrabold italic uppercase tracking-tight leading-none">
          La Hall of <span className="text-[#ab2d00]">CRINGE</span>
        </h1>
        <p className="text-[#595c5d] text-sm mt-2">
          Le situazioni più imbarazzanti d'Italia, classificate dall'algoritmo ELO della vergogna.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 bg-[#e6e8ea] border-[3px] border-[#2c2f30] rounded-xl p-1 ink-shadow-sm">
        <TabBtn active={tab === 'globale'} onClick={() => setTab('globale')} icon="public">
          Globale
        </TabBtn>
        {user ? (
          <TabBtn active={tab === 'personale'} onClick={() => setTab('personale')} icon="person">
            La mia
          </TabBtn>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1 text-[#757778] text-xs font-bold py-2 font-headline">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span>Accedi per la tua classifica</span>
          </div>
        )}
      </div>

      {tab === 'globale' ? (
        <Classifica limit={50} />
      ) : (
        <ClassificaPersonale />
      )}
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
      {children}
    </button>
  )
}
