import { NavLink } from 'react-router-dom'

import {
  StaticP,
  StaticPage,
  StaticSection,
} from '../components/layout/StaticPage'

export default function AboutPage() {
  return (
    <StaticPage title="À propos">
      <StaticSection title="Présentation">
        <StaticP>
          Ant ID Training est une plateforme pédagogique dédiée à l'entraînement
          à l'identification des fourmis de France métropolitaine. Elle permet
          d'explorer les taxons du site et de s'exercer à partir de données
          structurées : descriptions, tailles, critères d'identification,
          période d'essaimage et répartition.
        </StaticP>
      </StaticSection>

      <StaticSection title="Objectif">
        <StaticP>
          L'objectif du site est de fournir un outil simple, clair et interactif
          pour progresser en identification, du niveau le plus accessible
          jusqu'au genre, et parfois jusqu'à l'espèce lorsque les données
          disponibles le permettent.
        </StaticP>
        <StaticP>
          L'identification à l'espèce peut nécessiter des observations plus
          poussées, comme l'utilisation d'une loupe binoculaire, des mesures
          biométriques ou, dans certains cas, l'examen de caractères
          morphologiques spécialisés.
        </StaticP>
      </StaticSection>

      <StaticSection title="Méthode et contenu">
        <StaticP>
          Les critères affichés sont volontairement sélectionnés pour rester
          accessibles et pratiques à utiliser. Ils ne remplacent pas les
          descriptions originales ni les clés d'identification scientifiques,
          qui restent la référence pour une détermination rigoureuse.
        </StaticP>
        <StaticP>
          Selon les taxons, d'autres caractères peuvent être utiles ou
          nécessaires ; le site propose donc une base de travail, et non une
          conclusion systématique.
        </StaticP>
      </StaticSection>

      <StaticSection title="Qualité des données">
        <StaticP>
          Certaines informations peuvent être incomplètes sur des taxons encore
          peu documentés. Nous privilégions les données vérifiées et fiables
          afin de limiter les approximations et les informations incertaines.
        </StaticP>
      </StaticSection>

      <StaticSection title="Contact">
        <StaticP>
          Pour toute question, remarque ou suggestion sur le contenu ou le
          fonctionnement du site :{' '}
          <a
            className="text-[color:var(--app-primary)] underline decoration-[color:var(--app-primary)] underline-offset-4 hover:opacity-85"
            href="mailto:eanathos@gmail.com"
          >
            eanathos@gmail.com
          </a>
        </StaticP>
        <StaticP>
          Pour les questions relatives à l'éditeur, à l'hébergement ou à la
          propriété intellectuelle, consultez les{' '}
          <NavLink
            to="/mentions-legales"
            className="text-[color:var(--app-primary)] underline decoration-[color:var(--app-primary)] underline-offset-4 hover:opacity-85"
          >
            Mentions légales
          </NavLink>
          .
        </StaticP>
      </StaticSection>

      <StaticSection title="Crédits">
        <StaticP>
          Merci à Dambal pour son aide dans l'agrégation des données et la
          relecture.
        </StaticP>
        <StaticP>
          Nous remercions également les contributeurs ayant fourni des
          photographies pour enrichir les entrées du site.
        </StaticP>
      </StaticSection>
    </StaticPage>
  )
}
