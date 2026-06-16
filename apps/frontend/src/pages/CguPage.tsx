import {
  StaticP,
  StaticPage,
  StaticSection,
} from '../components/layout/StaticPage'

export default function CguPage() {
  return (
    <StaticPage
      title="Conditions générales d'utilisation"
      subtitle="Dernière mise à jour : 16 juin 2026"
    >
      <StaticSection title="Objet">
        <StaticP>
          Ant ID Training est une plateforme pédagogique dédiée à l'entraînement
          à l'identification des fourmis de France métropolitaine. L'accès aux
          fonctionnalités de base est libre et gratuit. La création d'un compte
          est facultative et permet de suivre sa progression et de contribuer à
          la base de données.
        </StaticP>
        <StaticP>
          L'utilisation du site implique l'acceptation des présentes conditions
          générales d'utilisation (CGU).
        </StaticP>
      </StaticSection>

      <StaticSection title="Accès et inscription">
        <StaticP>
          L'inscription est ouverte à toute personne physique. Il est recommandé
          d'avoir au minimum 13 ans pour créer un compte. En s'inscrivant,
          l'utilisateur s'engage à fournir des informations exactes et à
          maintenir la confidentialité de ses identifiants de connexion.
        </StaticP>
        <StaticP>
          Un seul compte par personne est autorisé. Tout compte créé sous une
          fausse identité ou usurpant l'identité d'un tiers pourra être supprimé
          sans préavis.
        </StaticP>
      </StaticSection>

      <StaticSection title="Contenu soumis par l'utilisateur">
        <StaticP>
          En soumettant des photographies ou des observations via la
          fonctionnalité de proposition d'entrées, l'utilisateur garantit être
          l'auteur des contenus soumis ou détenir les droits nécessaires à leur
          diffusion sur la plateforme.
        </StaticP>
        <StaticP>
          Les contenus soumis sont susceptibles d'être modérés, modifiés ou
          rejetés par les administrateurs, sans obligation de motivation ni
          délai de préavis. Tout contenu contraire aux bonnes mœurs, hors sujet
          ou manifestement erroné pourra être supprimé.
        </StaticP>
        <StaticP>
          En soumettant un contenu, l'utilisateur accorde à l'éditeur une
          licence non exclusive d'utilisation à des fins pédagogiques dans le
          cadre de la plateforme.
        </StaticP>
      </StaticSection>

      <StaticSection title="Règles de conduite">
        <ul className="space-y-1 text-[color:var(--app-text-muted)]">
          <li>
            Ne pas soumettre de données trompeuses ou intentionnellement
            erronées
          </li>
          <li>
            Ne pas tenter de contourner les mécanismes de jeu ou de classement
          </li>
          <li>Ne pas abuser du système de suggestions ou de feedback</li>
          <li>
            Ne pas porter atteinte à la sécurité ou au bon fonctionnement de la
            plateforme
          </li>
        </ul>
        <StaticP>
          Tout manquement à ces règles pourra entraîner la suspension ou la
          suppression du compte concerné.
        </StaticP>
      </StaticSection>

      <StaticSection title="Disponibilité du service">
        <StaticP>
          La plateforme est fournie "en l'état", sans garantie de disponibilité
          continue. L'éditeur se réserve le droit de procéder à des opérations
          de maintenance, de modifier ou d'interrompre tout ou partie des
          fonctionnalités, sans préavis ni obligation d'indemnisation.
        </StaticP>
      </StaticSection>

      <StaticSection title="Propriété intellectuelle">
        <StaticP>
          L'ensemble des éléments constitutifs du site (interface, données
          taxinomiques, textes, code source) est la propriété de l'éditeur ou de
          leurs auteurs respectifs. Toute reproduction, représentation ou
          exploitation sans autorisation préalable est interdite.
        </StaticP>
      </StaticSection>

      <StaticSection title="Modification des CGU">
        <StaticP>
          L'éditeur se réserve le droit de modifier les présentes CGU à tout
          moment. La date de dernière mise à jour, indiquée en haut de cette
          page, sera mise à jour en conséquence. La poursuite de l'utilisation
          du site après modification vaut acceptation des nouvelles conditions.
        </StaticP>
      </StaticSection>

      <StaticSection title="Droit applicable">
        <StaticP>
          Les présentes CGU sont soumises au droit français. En cas de litige,
          les tribunaux français seront seuls compétents.
        </StaticP>
      </StaticSection>
    </StaticPage>
  )
}
