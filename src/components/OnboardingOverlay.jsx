import { useState, useEffect } from 'react'

const STEPS = [
  {
    emoji: '\u2694\uFE0F',
    title: 'Duello di disagi',
    desc: 'Ti mostriamo due situazioni imbarazzanti. Tu scegli quella più cringe. Semplice.'
  },
  {
    emoji: '\uD83D\uDCCA',
    title: 'Algoritmo ELO',
    desc: 'Ogni disagio ha un punteggio ELO. Chi vince sale, chi perde scende. Come negli scacchi, ma più imbarazzante.'
  },
  {
    emoji: '\uD83C\uDFC6',
    title: 'La Hall of Cringe',
    desc: 'I disagi più votati entrano nella classifica. Scopri quali situazioni mettono più in imbarazzo gli italiani.'
  }
]

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem('ildisagio_onboarded')
    if (!done) setVisible(true)
  }, [])

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else close()
  }

  function close() {
    localStorage.setItem('ildisagio_onboarded', '1')
    setVisible(false)
  }

  if (!visible) return null

  const s = STEPS[step]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#f5f6f7] border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-xl max-w-sm w-full p-6 flex flex-col gap-5 animate-[bounceIn_0.4s_ease-out]">
        {/* Steps indicator */}
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-[#fdd400]' : 'w-1.5 bg-[#dadddf]'
              } border border-[#2c2f30]`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center flex flex-col gap-3">
          <span className="text-5xl">{s.emoji}</span>
          <h2 className="font-headline text-[#2c2f30] text-xl font-extrabold">{s.title}</h2>
          <p className="text-[#595c5d] text-sm leading-relaxed">{s.desc}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={next}
            className="w-full btn-cartoon bg-[#fdd400] text-[#2c2f30] border-[3px] border-[#2c2f30] rounded-xl py-3 font-headline font-extrabold uppercase text-sm"
          >
            {step < STEPS.length - 1 ? 'Avanti \u2192' : 'Inizia a votare!'}
          </button>
          {step === 0 && (
            <button
              onClick={close}
              className="text-[#757778] text-xs font-semibold text-center hover:text-[#2c2f30] transition-colors"
            >
              Salta intro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
