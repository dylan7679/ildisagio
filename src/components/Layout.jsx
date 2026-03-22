import { Link, useLocation, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import TopLeaderboard from './TopLeaderboard'
import AuthModal from './AuthModal'
import FeedbackButton from './FeedbackButton'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Duello', icon: 'swords' },
  { to: '/classifica', label: 'Classifica', icon: 'emoji_events' },
  { to: '/proponi', label: 'Proponi', icon: 'edit_note' },
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

      {/* Desktop Sidebar - Dark */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-72 min-h-screen sticky top-0 bg-[#111111] p-5 gap-4 shrink-0">
        {/* Logo */}
        <Link to="/" className="block mb-2">
          <div className="text-center py-2">
            <div className="font-headline text-white text-3xl xl:text-4xl font-extrabold tracking-tight leading-none uppercase">
              DISAGIOMETRO
            </div>
            <div className="text-[#fdd400] text-xs mt-1.5 font-bold uppercase tracking-[0.2em] font-headline">
              L'arena del Cringe
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map(({ to, label, icon }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all font-headline text-sm
                  ${isActive
                    ? 'bg-[#fdd400] text-[#111111]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-xl">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User area */}
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="font-headline font-bold text-sm text-white truncate">
                {profile?.nickname || user.email?.split('@')[0]}
              </p>
              {profile?.streak_corrente > 1 && (
                <p className="text-xs font-bold text-[#fdd400] mt-0.5">
                  🔥 {profile.streak_corrente} giorni di fila
                </p>
              )}
              {isAdmin && (
                <Link to="/admin" className="text-[#ff9475] text-xs font-bold hover:underline block mt-1">
                  Pannello Admin
                </Link>
              )}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-white/50 hover:text-white text-xs font-headline font-bold uppercase py-2 transition-colors"
            >
              Esci
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 font-headline font-bold uppercase text-sm flex items-center justify-center gap-2 transition-colors border border-white/20"
          >
            <span className="material-symbols-outlined text-sm">account_circle</span>
            Accedi
          </button>
        )}

        {/* New match button */}
        <Link
          to="/"
          className="btn-cartoon bg-[#fdd400] text-[#111111] rounded-xl py-3.5 font-headline font-extrabold uppercase text-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">swords</span>
          NUOVA SFIDA
        </Link>

        <div className="flex items-center justify-between">
          <p className="text-white/30 text-xs font-semibold italic">
            siamo tutti imbarazzanti
          </p>
          <Link to="/privacy" className="text-white/30 text-xs font-semibold hover:text-white/60 transition-colors">
            Privacy
          </Link>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-[#111111]">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-1">
            <span className="font-headline text-white text-xl font-extrabold tracking-tight uppercase">
              DISAGIOMETRO
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {totalVotes !== null && (
              <div className="bg-[#fdd400] rounded-lg px-2.5 py-1">
                <span className="font-headline text-[#111111] text-xs font-bold">
                  {totalVotes.toLocaleString('it-IT')} voti
                </span>
              </div>
            )}
            <button
              onClick={() => user ? supabase.auth.signOut() : setShowAuth(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10"
              aria-label={user ? 'Esci' : 'Accedi'}
            >
              <span className="material-symbols-outlined text-sm text-white">
                {user ? 'logout' : 'account_circle'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Content area - 3 column on XL */}
      <div className="flex-1 flex min-w-0 justify-center xl:justify-start">
        <main className="w-full min-w-0 max-w-2xl lg:max-w-3xl xl:max-w-none xl:flex-1 px-4 py-5 pb-24 lg:pb-10 lg:py-8 lg:px-8">
          <Outlet />
        </main>
        <aside className="hidden xl:block w-80 py-8 pr-6 shrink-0">
          <TopLeaderboard />
        </aside>
      </div>

      {/* Mobile Footer */}
      <footer className="lg:hidden text-center pb-20 pt-2">
        <Link to="/privacy" className="text-[#757778] text-xs font-semibold hover:text-[#2c2f30] transition-colors">
          Privacy Policy
        </Link>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-white/10 z-50">
        <div className="flex">
          {navItems.map(({ to, label, icon }) => {
            const isActive = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 font-bold text-xs transition-all font-headline ${
                  isActive ? 'text-[#fdd400]' : 'text-white/50'
                }`}
              >
                <span className={`flex items-center justify-center w-12 h-8 rounded-xl transition-all duration-150 ${
                  isActive ? 'bg-[#fdd400] text-[#111111]' : ''
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
