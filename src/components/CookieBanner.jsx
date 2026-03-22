import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('ildisagio_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('ildisagio_cookie_consent', 'accepted')
    setVisible(false)
  }

  function decline() {
    localStorage.setItem('ildisagio_cookie_consent', 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center">
      <div className="bg-[#f5f6f7] border-[3px] border-[#2c2f30] rounded-2xl ink-shadow-xl max-w-2xl w-full p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-headline font-extrabold text-[#2c2f30] text-sm">Cookie tecnici</p>
          <p className="text-[#595c5d] text-xs mt-0.5 leading-snug">
            Usiamo solo cookie tecnici per il funzionamento del sito. Nessun tracking.{' '}
            <Link to="/privacy" className="underline hover:text-[#2c2f30]">Privacy policy</Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 rounded-xl border-[2px] border-[#2c2f30] text-[#595c5d] font-headline font-bold text-xs hover:bg-[#e0e3e4] transition-colors"
          >
            Rifiuta
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-xl border-[2px] border-[#2c2f30] bg-[#fdd400] text-[#2c2f30] font-headline font-bold text-xs btn-cartoon"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  )
}
