import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy — IlDisagio</title>
      </Helmet>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <Link to="/" className="text-xs text-[#757778] font-semibold hover:text-[#2c2f30]">&larr; Home</Link>
        </div>

        <div className="bg-[#ffffff] border-[4px] border-[#2c2f30] rounded-2xl ink-shadow-xl p-6 flex flex-col gap-5">
          <h1 className="font-headline text-2xl font-extrabold text-[#2c2f30]">Privacy Policy</h1>
          <p className="text-[#595c5d] text-sm">Ultimo aggiornamento: marzo 2026</p>

          {[
            {
              title: 'Chi siamo',
              content: 'IlDisagio (ildisagio.it) è una piattaforma partecipativa dove gli utenti votano situazioni di disagio quotidiano. Il servizio è gestito a scopo non commerciale.'
            },
            {
              title: 'Dati raccolti',
              content: 'Non raccogliamo dati personali obbligatori. La registrazione è opzionale. Se ti registri, raccogliamo solo email e nickname. Per il funzionamento del voto utilizziamo un fingerprint tecnico del browser (non PII) per prevenire abusi.'
            },
            {
              title: 'Cookie',
              content: 'Utilizziamo esclusivamente cookie tecnici necessari al funzionamento del sito (sessione di autenticazione). Non utilizziamo cookie di profilazione o di terze parti per il tracciamento.'
            },
            {
              title: 'Fingerprint browser',
              content: 'Per prevenire voti multipli fraudolenti utilizziamo un identificatore tecnico del browser (fingerprint). Questo dato non è personalmente identificabile e non viene condiviso con terze parti. Base legale: legittimo interesse (art. 6.1.f GDPR).'
            },
            {
              title: 'I tuoi diritti',
              content: 'Hai diritto di accedere, correggere o cancellare i tuoi dati. Se sei registrato, puoi richiedere la cancellazione del tuo account scrivendo a privacy@ildisagio.it. Risponderemo entro 30 giorni.'
            },
            {
              title: 'Hosting e infrastruttura',
              content: 'Il sito è ospitato su Vercel (CDN globale, server in EU) e utilizza Supabase (PostgreSQL in EU) come database. Entrambi i fornitori sono conformi GDPR.'
            },
            {
              title: 'Modifiche',
              content: 'Potremmo aggiornare questa policy. Le modifiche saranno pubblicate su questa pagina con la data di aggiornamento.'
            }
          ].map(({ title, content }) => (
            <div key={title}>
              <h2 className="font-headline font-extrabold text-[#2c2f30] text-base mb-1">{title}</h2>
              <p className="text-[#595c5d] text-sm leading-relaxed">{content}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
