import {
  StaticP,
  StaticPage,
  StaticSection,
} from '../components/layout/StaticPage'

export default function PolitiqueConfidentialitePage() {
  return (
    <StaticPage
      title="Politique de confidentialité"
      subtitle="Dernière mise à jour : 18 juin 2026"
    >
      <StaticSection title="Responsable du traitement">
        <StaticP>
          Anathos (Eanathos) — personne physique, projet personnel non
          commercial.
          <br />
          Contact :{' '}
          <a
            href="mailto:eanathos@gmail.com"
            className="underline hover:opacity-80"
          >
            eanathos@gmail.com
          </a>
        </StaticP>
      </StaticSection>

      <StaticSection title="Données collectées">
        <StaticP>
          Lors de la création d'un compte ou de l'utilisation de la plateforme,
          les données suivantes peuvent être collectées :
        </StaticP>
        <ul className="space-y-2 text-[color:var(--app-text-muted)]">
          <li>
            <strong className="text-[color:var(--app-text)]">
              Nom d'utilisateur
            </strong>{' '}
            — public, affiché dans le classement et sur votre profil.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Adresse e-mail
            </strong>{' '}
            — optionnelle, utilisée pour l'authentification et la
            réinitialisation du mot de passe.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Mot de passe
            </strong>{' '}
            — stocké sous forme de hachage bcrypt, non lisible par l'éditeur.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">Avatar</strong> —
            image téléversée optionnelle, convertie en WebP.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">Biographie</strong>{' '}
            — texte libre optionnel (500 caractères max).
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Sessions de jeu
            </strong>{' '}
            — niveau de difficulté, résultat (correct / incorrect), horodatage.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Propositions d'entrées
            </strong>{' '}
            — photographies, biotope, département, soumis volontairement pour
            enrichir la base de données.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Suggestions
            </strong>{' '}
            — texte libre, réservées aux utilisateurs connectés.
          </li>
        </ul>
      </StaticSection>

      <StaticSection title="Finalités des traitements">
        <ul className="space-y-1 text-[color:var(--app-text-muted)]">
          <li>Authentification et gestion de votre compte</li>
          <li>Personnalisation du profil et de l'expérience utilisateur</li>
          <li>Suivi de la progression pédagogique (points, historique)</li>
          <li>
            Amélioration de la base de données naturaliste via les propositions
          </li>
          <li>Traitement des retours et suggestions</li>
        </ul>
      </StaticSection>

      <StaticSection title="Base légale">
        <StaticP>
          Les traitements reposent sur le{' '}
          <strong className="text-[color:var(--app-text)]">consentement</strong>{' '}
          de l'utilisateur (inscription volontaire, soumissions facultatives) et
          sur l'
          <strong className="text-[color:var(--app-text)]">
            intérêt légitime
          </strong>{' '}
          de l'éditeur à améliorer la plateforme et à en assurer le bon
          fonctionnement.
        </StaticP>
      </StaticSection>

      <StaticSection title="Durée de conservation">
        <ul className="space-y-1 text-[color:var(--app-text-muted)]">
          <li>
            <strong className="text-[color:var(--app-text)]">
              Données de compte :
            </strong>{' '}
            conservées pendant toute la durée d'activité du compte. En cas de
            suppression du compte, les données sont effacées dans un délai
            raisonnable.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Sessions de jeu :
            </strong>{' '}
            conservées pendant la durée d'activité du compte.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Propositions d'entrées :
            </strong>{' '}
            conservées jusqu'à traitement ou rejet par un administrateur.
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Suggestions :
            </strong>{' '}
            conservées jusqu'à leur traitement par l'équipe.
          </li>
        </ul>
      </StaticSection>

      <StaticSection title="Stockage local du navigateur">
        <StaticP>
          Lors de la connexion, des informations d'authentification (jeton JWT,
          rôle, nom d'utilisateur, adresse e-mail) sont stockées dans le
          stockage local de votre navigateur (
          <code className="text-xs">localStorage</code>). Ces données restent
          sur votre appareil et ne sont transmises au serveur qu'à chaque
          requête. Elles sont supprimées à la déconnexion ou à la suppression du
          compte.
        </StaticP>
        <StaticP>
          Aucun cookie de traçage ni de service d'analyse tiers n'est utilisé.
        </StaticP>
      </StaticSection>

      <StaticSection title="Vos droits (RGPD)">
        <StaticP>
          Conformément au Règlement général sur la protection des données (RGPD,
          Art. 15 à 22), vous disposez des droits suivants :
        </StaticP>
        <ul className="space-y-1 text-[color:var(--app-text-muted)]">
          <li>
            <strong className="text-[color:var(--app-text)]">Accès</strong> —
            consulter les données vous concernant
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Rectification
            </strong>{' '}
            — corriger des données inexactes
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Suppression
            </strong>{' '}
            — effacer votre compte et vos données (disponible depuis votre
            profil)
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Portabilité
            </strong>{' '}
            — recevoir vos données dans un format structuré
          </li>
          <li>
            <strong className="text-[color:var(--app-text)]">
              Opposition / Limitation
            </strong>{' '}
            — vous opposer à certains traitements
          </li>
        </ul>
        <StaticP>
          Pour exercer ces droits, contactez :{' '}
          <a
            href="mailto:eanathos@gmail.com"
            className="underline hover:opacity-80"
          >
            eanathos@gmail.com
          </a>
          . Délai de réponse : 30 jours. En cas de désaccord, vous pouvez
          introduire une réclamation auprès de la{' '}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noreferrer"
            className="underline hover:opacity-80"
          >
            CNIL
          </a>
          .
        </StaticP>
      </StaticSection>

      <StaticSection title="Sécurité">
        <StaticP>
          Les mots de passe sont hachés avec bcrypt et ne sont jamais stockés en
          clair. Les communications entre votre navigateur et le serveur sont
          chiffrées via HTTPS. L'accès aux fonctions d'administration est
          restreint aux comptes disposant du rôle administrateur.
        </StaticP>
      </StaticSection>
    </StaticPage>
  )
}
