export default function AboutPage() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">À propos</h2>
      <div className="mt-6 space-y-8">
        <section>
          <h3 className="text-lg font-medium text-slate-900">Présentation</h3>
          <p className="mt-2 text-justify text-slate-700">
            Ant ID Training est une plateforme pédagogique dédiée à
            l'entraînement à l'identification des fourmis de France
            métropolitaine. Elle permet d'explorer les taxons du site et de
            s'exercer à partir de données structurées : descriptions, tailles,
            critères d'identification, période d'essaimage et répartition.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-medium text-slate-900">Objectif</h3>
          <p className="mt-2 text-justify text-slate-700">
            L'objectif du site est de fournir un outil simple, clair et
            interactif pour progresser en identification, du niveau le plus
            accessible jusqu'au genre, et parfois jusqu'à l'espèce lorsque les
            données disponibles le permettent.
          </p>
          <p className="mt-2 text-justify text-slate-700">
            L'identification à l'espèce peut nécessiter des observations plus
            poussées, comme l'utilisation d'une loupe binoculaire, des mesures
            biométriques ou, dans certains cas, l'examen de caractères
            morphologiques spécialisés.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-medium text-slate-900">
            Méthode et contenu
          </h3>
          <p className="mt-2 text-justify text-slate-700">
            Les critères affichés sont volontairement sélectionnés pour rester
            accessibles et pratiques à utiliser. Ils ne remplacent pas les
            descriptions originales ni les clés d'identification scientifiques,
            qui restent la référence pour une détermination rigoureuse.
          </p>
          <p className="mt-2 text-justify text-slate-700">
            Selon les taxons, d'autres caractères peuvent être utiles ou
            nécessaires ; le site propose donc une base de travail, et non une
            conclusion systématique.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-medium text-slate-900">
            Qualité des données
          </h3>
          <p className="mt-2 text-justify text-slate-700">
            Certaines informations peuvent être incomplètes sur des taxons
            encore peu documentés. Nous privilégions les données vérifiées et
            fiables afin de limiter les approximations et les informations
            incertaines.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-medium text-slate-900">Contact</h3>
          <p className="mt-2 text-justify text-slate-700">
            Pour toute question, remarque ou suggestion, vous pouvez contacter
            l'équipe à l'adresse suivante :{' '}
            <a
              className="text-indigo-700 underline decoration-indigo-300 underline-offset-4"
              href="mailto:eanathos@gmail.com"
            >
              eanathos@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h3 className="text-lg font-medium text-slate-900">
            Crédits et droits
          </h3>
          <p className="mt-2 text-justify text-slate-700">
            Merci à Dambal pour son aide dans l'agrégation des données et la
            relecture.
          </p>
          <p className="mt-2 text-justify text-slate-700">
            Nous remercions également les contributeurs ayant fourni des
            photographies pour enrichir les entrées du site.
          </p>
          <p className="mt-2 text-justify text-slate-700">
            Les images publiées sur ce site restent la propriété de leurs
            auteurs ; leur utilisation nécessite leur accord préalable.
          </p>
          <p className="mt-2 text-justify text-slate-700">
            Toute copie, reproduction ou réutilisation du site, en tout ou
            partie, est interdite sans autorisation.
          </p>
        </section>
      </div>
    </section>
  )
}
