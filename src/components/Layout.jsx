import { Link, useLocation, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import MiniClassifica from './MiniClassifica'
import AuthModal from './AuthModal'
import FeedbackButton from './FeedbackButton'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Duello', icon: 'swords', desc: 'Vota il peggio' },
  { to: '/classifica', label: 'Classifica', icon: 'emoji_events', desc: 'Chi vince' },
  { to: '/proponi', label: 'Proponi', icon: 'edit_note', desc: 'Il tuo disagio' },
]

export default function Layout() {
  const location = useLocation()
  const [totalVotes, setTotalVotes] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const { user, profile, isAdmin } = useAuth()

  useEffect(() => {
    supabase
      .from('voti')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setTotalVotes(count || 0))
  }, [])

  return (
    <div className="min-h-dvh bg-[#f5f6f7] flex flex-col lg:flex-row">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 min-h-screen sticky top-0 bg-[#ffffff] border-r-[4px] border-[#2c2f30] p-5 gap-5 shrink-0">
        <Link to="/" className="block">
          <div className="bg-[#fdd400] border-[4px] border-[#2c2f30] rounded-2xl p-4 text-center ink-shadow hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_rgba(44,47,48,1)] transition-all">
            <div className="font-headline text-[#2c2f30] text-3xl xl:text-4xl font-extrabold italic tracking-tight leading-none">
              il<span className="text-3xl xl:text-4xl">😬</span>DISAGIO
            </div>
            <div className="text-[#594a00] text-xs mt-1 font-bold uppercase tracking-widest font-headline">vota il peggio</div>
          </div>
        </Link>

        <nav className="flex flex-col gap-2">
          {navItems.map(({ to, label, icon, desc }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 p-3 rounded-xl border-[3px] border-[#2c2f30] font-bold transition-all font-headline
                  ${isActive
                    ? 'bg-[#fdd400] text-[#2c2f30] ink-shadow -translate-x-0.5 -translate-y-0.5 rotate-[-1deg]'
                    : 'bg-[#ffffff] text-[#2c2f30] ink-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(44,47,48,1)]'
                  }`}
              >
                <span className="material-symbols-outlined text-2xl">{icon}</span>
                <div>
                  <div className="text-sm leading-none">{label}</div>
                  <div className={`text-xs font-normal mt-0.5 ${isActive ? 'text-[#594a00]' : 'text-[#595c5d]'}`}>{desc}</div>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-2xl p-4 ink-shadow text-center">
            <div className="font-headline text-[#2c2f30] text-3xl font-extrabold">
              {totalVotes !== null ? totalVotes.toLocaleString('it-IT') : '...'}
            </div>
            <div className="text-[#594a00] text-xs font-bold uppercase tracking-wider mt-0.5">voti totali</div>
          </div>

          {/* Auth button sidebar */}
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="bg-[#eff1f2] border-[2px] border-[#2c2f30] rounded-xl p-3 text-center">
                <p className="font-headline font-bold text-xs text-[#2c2f30] truncate">
                  {profile?.nickname || user.email?.split('@')[0]}
                </p>
                {profile?.streak_corrente > 1 && (
                  <p className="text-xs font-bold text-[#ab2d00] mt-0.5">
                    🔥 {profile.streak_corrente} giorni di fila
                  </p>
                )}
                {isAdmin && (
                  <Link to="/admin" className="text-[#ab2d00] text-xs font-bold hover:underline block mt-1">
                    Pannello Admin
                  </Link>
                )}
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="btn-cartoon bg-[#e0e3e4] text-[#2c2f30] rounded-xl py-2 text-xs font-headline font-bold uppercase"
              >
                Esci
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="btn-cartoon bg-[#0058ba] text-white rounded-xl py-3 font-headline font-bold uppercase text-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">account_circle</span>
              Accedi
            </button>
          )}

          <p className="text-center text-[#595c5d] text-xs font-semibold italic">
            siamo tutti ugualmente imbarazzanti
          </p>
          <Link to="/privacy" className="text-center text-[#757778] text-xs font-semibold hover:text-[#2c2f30] transition-colors">
            Privacy Policy
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b-[4px] border-[#2c2f30]">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-1">
            <span className="font-headline text-[#2c2f30] text-2xl font-extrabold italic tracking-tight">
              il<span className="text-2xl">😬</span><span className="text-[#6d5a00]">DISAGIO</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {totalVotes !== null && (
              <div className="bg-[#fdd400] border-[3px] border-[#2c2f30] rounded-xl px-2.5 py-1 ink-shadow-sm">
                <span className="font-headline text-[#2c2f30] text-sm font-bold">
                  {totalVotes.toLocaleString('it-IT')} voti
                </span>
              </div>
            )}
            <button
              onClick={() => user ? supabase.auth.signOut() : setShowAuth(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border-[3px] border-[#2c2f30] bg-[#eff1f2] ink-shadow-sm transition-all active:translate-x-0.5 active:translate-y-0.5"
              title={user ? 'Esci' : 'Accedi'}
            >
              <span className="material-symbols-outlined text-sm text-[#2c2f30]">
                {user ? 'logout' : 'account_circle'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 flex min-w-0 justify-center xl:justify-start">
        <main className="w-full min-w-0 max-w-2xl lg:max-w-3xl xl:max-w-none xl:flex-1 px-4 py-5 pb-24 lg:pb-10 lg:py-8 lg:px-8">
          <Outlet />
        </main>
        <aside className="hidden xl:block w-72 py-8 pr-6 shrink-0">
          <MiniClassifica />
        </aside>
      </div>

      {/* Mobile Footer */}
      <footer className="lg:hidden text-center pb-20 pt-2">
        <Link to="/privacy" className="text-[#757778] text-xs font-semibold hover:text-[#2c2f30] transition-colors">
          Privacy Policy
        </Link>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-[4px] border-[#2c2f30] rounded-t-3xl z-50">
        <div className="flex">
          {navItems.map(({ to, label, icon }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 font-bold text-xs transition-all font-headline ${
                  isActive ? 'text-[#2c2f30]' : 'text-[#757778] hover:text-[#2c2f30]'
                }`}
              >
                <span className={`flex items-center justify-center w-12 h-8 rounded-xl transition-all duration-150 ${
                  isActive ? 'bg-[#fdd400] ink-shadow-sm scale-110' : ''
                }`}>
                  <span className="material-symbols-outlined text-xl">{icon}</span>
                </span>
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <FeedbackButton />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  )
}
