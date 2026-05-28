# Schéma de base de données

Documentation rapide du modèle Prisma de la base antIdTraining.

```mermaid
---
title: antIdTraining database schema
---
erDiagram
    direction LR

    User {
        string id PK
        string username UK
        string email UK
        datetime emailVerifiedAt
        string role
        int points
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

## Lecture rapide

- `User` : comptes admin et utilisateur, identifiés par un nom d’utilisateur et une adresse e-mail, avec validation e-mail avant activation.
- `Taxon` : référentiel scientifique principal.
- `TaxonConfusion` : confusions possibles entre taxons, avec explication, enregistrées de façon miroir pour apparaître sur les deux taxons.
- `ObservationEntry` : entrées de jeu et observations.
- `GameSession` : historique des parties.
- `EntryProposal` : propositions de contribution utilisateur.
- `AdminHistoryEvent` : audit des actions d’administration.
- `Reference` et `Suggestion` : documentation et retours utilisateurs.
