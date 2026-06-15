# Schéma de base de données

Modèle Prisma simplifié. Le schéma complet est dans [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma).

```mermaid
erDiagram
    direction LR

    User {
        string id PK
        string username UK
        string email UK
        string avatar
        string bio
        int points
        string role
        datetime emailVerifiedAt
        datetime createdAt
    }

    AdminHistoryEvent {
        string id PK
        string actorUserId FK
        string actorUsername
        string action
        string detail
        string tone
        string entityType
        string entityId
        datetime createdAt
    }

    Taxon {
        string id PK
        string subfamily
        string tribe
        string genus
        string subgenus
        string speciesGroup
        string species
        boolean invasive
        int swarmingStartMonth
        int swarmingEndMonth
        json distribution
    }

    TaxonConfusion {
        string id PK
        string taxonId FK
        string confusedTaxonId FK
        string detail
        datetime createdAt
        datetime updatedAt
    }

    TaxonLevelProfile {
        string id PK
        string level
        string value
        string genusValue
        string description
        string sizeWorker
        string sizeQueen
        string sizeMale
    }

    TaxonLevelCriterion {
        string id PK
        string profileId FK
        string label
        int position
    }

    ObservationEntry {
        string id PK
        string taxonId FK
        string taxonLevel
        string taxonValue
        string subfamily
        string genus
        string subgenus
        string species
        string speciesGroup
        string size
        string caste
        string department
        datetime observedAt
        string biotope
        string photoCredit
    }

    EntryImage {
        string id PK
        string entryId FK
        string imageUrl
        int position
        datetime createdAt
    }

    GameSession {
        string id PK
        string entryId FK
        string userId FK
        string level
        boolean finalCorrect
        datetime validatedAt
        datetime createdAt
    }

    EntryProposal {
        string id PK
        string userId FK
        string taxonLevel
        string taxonValue
        string subfamily
        string genus
        string subgenus
        string species
        string speciesGroup
        string size
        string caste
        string department
        datetime observedAt
        string biotope
        string photoCredit
        string status
        string rejectionMessage
        datetime createdAt
        datetime processedAt
    }

    EntryProposalImage {
        string id PK
        string proposalId FK
        string imageUrl
        int position
        datetime createdAt
    }

    Reference {
        string id PK
        string title
        string type
        string url
        datetime createdAt
        datetime updatedAt
    }

    Suggestion {
        string id PK
        string userId FK
        string name
        string email
        string message
        string status
        string rejectionMessage
        datetime createdAt
        datetime processedAt
    }

    User ||--o{ AdminHistoryEvent : writes
    User ||--o{ GameSession : plays
    User ||--o{ Suggestion : submits
    User ||--o{ EntryProposal : submits

    Taxon ||--o{ ObservationEntry : classifies
    Taxon }o..o{ Reference : linked_to
    Taxon ||--o{ TaxonConfusion : source
    Taxon ||--o{ TaxonConfusion : target

    TaxonLevelProfile ||--o{ TaxonLevelCriterion : contains

    ObservationEntry ||--o{ EntryImage : has
    ObservationEntry ||--o{ GameSession : used_in

    EntryProposal ||--o{ EntryProposalImage : has
```

## Description des entités

| Entité              | Description                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`              | Comptes utilisateur et admin. Email vérifié avant activation. Les champs `passwordHash`, `emailVerificationCodeHash` et `passwordResetToken` (haché SHA-256) ne sont pas exposés dans le diagramme. |
| `Taxon`             | Référentiel scientifique principal. `distribution` est un objet JSON de présence par département.                                                                                                   |
| `TaxonConfusion`    | Confusions possibles entre taxons (enregistrées en miroir pour apparaître sur les deux taxons).                                                                                                     |
| `TaxonLevelProfile` | Profils de niveau de jeu (critères d'identification par sous-famille/genre/espèce).                                                                                                                 |
| `ObservationEntry`  | Entrées de jeu validées. Le département accepte les codes `01`–`95`, `2A`, `2B` et DOM-TOM (`971`–`976`).                                                                                           |
| `GameSession`       | Historique des parties par entrée et par utilisateur.                                                                                                                                               |
| `EntryProposal`     | Propositions de contribution utilisateur, avec workflow de validation (PENDING → ACCEPTED/REJECTED).                                                                                                |
| `Reference`         | Références bibliographiques liées aux taxons.                                                                                                                                                       |
| `Suggestion`        | Retours libres des utilisateurs, avec workflow de traitement.                                                                                                                                       |
| `AdminHistoryEvent` | Journal d'audit des actions d'administration.                                                                                                                                                       |

## Champs chiffrés

Les champs suivants sont chiffrés AES-256-GCM en base (préfixe `enc:v1:`) lorsque `DATA_ENCRYPTION_KEY` est défini :

- `ObservationEntry.photoCredit`
- `EntryProposal.photoCredit`
- `Suggestion.name`, `Suggestion.email`
