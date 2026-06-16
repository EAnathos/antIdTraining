import {
  StaticP,
  StaticPage,
  StaticSection,
} from '../components/layout/StaticPage'

export default function MentionsLegalesPage() {
  return (
    <StaticPage
      title="Mentions légales"
      subtitle="Dernière mise à jour : 16 juin 2026"
    >
      <StaticSection title="Éditeur du site">
        <div className="space-y-1 text-[color:var(--app-text-muted)]">
          <p>
            <strong className="text-[color:var(--app-text)]">Nom :</strong>{' '}
            Anathos (Eanathos)
          </p>
          <p>
            <strong className="text-[color:var(--app-text)]">Statut :</strong>{' '}
            Personne physique — projet personnel non commercial
          </p>
          <p>
            <strong className="text-[color:var(--app-text)]">Contact :</strong>{' '}
            <a
              href="mailto:eanathos@gmail.com"
              className="underline hover:opacity-80"
            >
              eanathos@gmail.com
            </a>
          </p>
        </div>
      </StaticSection>

      <StaticSection title="Directeur de la publication">
        <StaticP>
          Anathos (Eanathos) —{' '}
          <a
            href="mailto:eanathos@gmail.com"
            className="underline hover:opacity-80"
          >
            eanathos@gmail.com
          </a>
        </StaticP>
      </StaticSection>

      <StaticSection title="Hébergement">
        <div className="space-y-1 text-[color:var(--app-text-muted)]">
          <p>
            <strong className="text-[color:var(--app-text)]">Société :</strong>{' '}
            Hetzner Online GmbH
          </p>
          <p>
            <strong className="text-[color:var(--app-text)]">Adresse :</strong>{' '}
            Industriestr. 25, 91710 Gunzenhausen, Allemagne
          </p>
          <p>
            <strong className="text-[color:var(--app-text)]">Site :</strong>{' '}
            <a
              href="https://www.hetzner.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:opacity-80"
            >
              www.hetzner.com
            </a>
          </p>
        </div>
      </StaticSection>

      <StaticSection title="Propriété intellectuelle">
        <StaticP>
          L'ensemble des contenus présents sur Ant ID Training (interface,
          données taxinomiques, textes, illustrations) est la propriété de
          l'éditeur ou de leurs auteurs respectifs, sauf mention contraire. Les
          photographies associées aux observations appartiennent à leurs auteurs
          et sont utilisées dans le cadre de la mission pédagogique de la
          plateforme. Toute reproduction ou diffusion sans autorisation
          préalable est interdite.
        </StaticP>
      </StaticSection>

      <StaticSection title="Limitation de responsabilité">
        <StaticP>
          Les contenus présents sur ce site sont fournis à titre informatif et
          pédagogique. L'éditeur s'efforce d'assurer l'exactitude des
          informations publiées mais ne peut garantir leur exhaustivité ni leur
          mise à jour permanente. L'éditeur décline toute responsabilité quant à
          l'utilisation faite des informations diffusées.
        </StaticP>
      </StaticSection>

      <StaticSection title="Contact">
        <StaticP>
          Pour toute question relative au site :{' '}
          <a
            href="mailto:eanathos@gmail.com"
            className="underline hover:opacity-80"
          >
            eanathos@gmail.com
          </a>
        </StaticP>
      </StaticSection>
    </StaticPage>
  )
}
