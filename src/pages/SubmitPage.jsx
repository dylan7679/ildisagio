import FormSubmission from '../components/FormSubmission'

export default function SubmitPage() {
  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      <div className="mb-2">
        <div className="inline-block bg-[#ff9475] border-[3px] border-[#2c2f30] rounded-full px-4 py-1 ink-shadow-sm rotate-[-1deg] mb-3">
          <span className="font-headline text-[#2c2f30] text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">add_circle</span>
            Nuovo disagio
          </span>
        </div>
        <div className="rotate-[0.5deg]">
          <h1 className="font-headline text-[#2c2f30] text-2xl sm:text-3xl font-extrabold italic">
            Hai vissuto un momento <span className="text-[#ab2d00]">Cringe</span>?
          </h1>
        </div>
        <p className="text-[#595c5d] text-sm mt-2">
          Condividilo con tutti. Se rispetta le linee guida, entrera' in classifica.
        </p>
      </div>

      <FormSubmission />
    </div>
  )
}
