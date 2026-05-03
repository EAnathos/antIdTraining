export default function AboutPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">À propos</h2>
      <p className="mt-4 text-slate-700">
        Ant ID Training est une application éducative pour l'entraînement à l'identification d'espèces de fourmis de France métropolitaine.
        Elle permet de jouer et de consulter des informations sur un taxon (description, tailles, critères d'identification, période d'essaimage, répartition).
      </p>

      <h3 className="mt-6 text-lg font-medium text-slate-800">Mission</h3>
      <p className="mt-2 text-slate-700">Fournir un outil simple et interactif pour apprendre à reconnaître les fourmis et leurs caractéristiques.</p>

      <h3 className="mt-6 text-lg font-medium text-slate-800">Contact</h3>
      <p className="mt-2 text-slate-700">
        Pour toute question ou suggestion, contactez l'équipe :{' '}
        <a className="text-indigo-700 underline" href="mailto:eanathos@gmail.com">
          eanathos@gmail.com
        </a>
        .
      </p>

      <h3 className="mt-6 text-lg font-medium text-slate-800">Crédits</h3>
      <p className="mt-2 text-slate-700">
        Merci à Ilhan et Dambal pour leur aide dans l'aggrégation de données et la relecture.
      </p>
      <p className="mt-2 text-slate-700">
        Les images utilisées sur ce site ne sont pas libre d'utilisation : leur utilisation suppose d'avoir obtenu l'accord préalable des propriétaires.
      </p>
      <p className="mt-2 text-slate-700">
        Toute copie, reproduction ou réutilisation du site, en tout ou partie, est interdite sans autorisation.
      </p>
    </section>
  )
}
