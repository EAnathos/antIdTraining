export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Ant ID Training API',
    version: '1.0.0',
    description: "API backend pour l'application d'entraînement à l'identification",
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Game' },
    { name: 'Taxons' },
    { name: 'References' },
    { name: 'Stats' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          "Dans Swagger, cliquez sur Authorize et collez uniquement le token JWT (sans le préfixe 'Bearer ').",
      },
    },
    schemas: {
      ErrorMessage: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        example: {
          message: 'Requête invalide.',
        },
      },
      TaxonConfusionInput: {
        type: 'object',
        required: ['confusedTaxonId', 'detail'],
        properties: {
          confusedTaxonId: { type: 'string' },
          detail: { type: 'string' },
        },
      },
      TaxonConfusion: {
        allOf: [
          { $ref: '#/components/schemas/TaxonConfusionInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              confusedTaxon: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  subfamily: { type: 'string' },
                  tribe: { type: 'string', nullable: true },
                  genus: { type: 'string' },
                  subgenus: { type: 'string', nullable: true },
                  speciesGroup: { type: 'string', nullable: true },
                  species: { type: 'string' },
                },
              },
            },
          },
        ],
      },
      TaxonInput: {
        type: 'object',
        required: ['subfamily', 'genus', 'species'],
        properties: {
          subfamily: { type: 'string' },
          tribe: { type: 'string', nullable: true },
          genus: { type: 'string' },
          subgenus: { type: 'string', nullable: true },
          speciesGroup: { type: 'string', nullable: true },
          species: { type: 'string' },
          confusions: {
            type: 'array',
            items: { $ref: '#/components/schemas/TaxonConfusionInput' },
          },
        },
        example: {
          subfamily: 'Myrmicinae',
          tribe: 'Pheidolini',
          genus: 'Pheidole',
          subgenus: null,
          speciesGroup: null,
          species: 'pallidula',
          confusions: [
            {
              confusedTaxonId: 'ckz...',
              detail: 'Espèce très proche morphologiquement, mais le clypeus est différent.',
            },
          ],
        },
      },
      Taxon: {
        allOf: [
          { $ref: '#/components/schemas/TaxonInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              tribe: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              confusions: {
                type: 'array',
                items: { $ref: '#/components/schemas/TaxonConfusion' },
              },
            },
          },
        ],
      },
      ReferenceInput: {
        type: 'object',
        required: ['title', 'type'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['WEBSITE', 'MYRMECOLOGY'] },
          url: { type: 'string', format: 'uri', nullable: true },
        },
        example: {
          title: 'AntWeb',
          description: 'Base de données',
          type: 'WEBSITE',
          url: 'https://www.antweb.org',
        },
      },
      Reference: {
        allOf: [
          { $ref: '#/components/schemas/ReferenceInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
        example: {
          email: 'admin@example.com',
          password: 'admin123',
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['token', 'role', 'user'],
        properties: {
          token: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'USER'] },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string', format: 'email', nullable: true },
              role: { type: 'string', enum: ['ADMIN', 'USER'] },
            },
          },
        },
        example: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          role: 'ADMIN',
          user: {
            id: 'user_123',
            username: 'admin',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
        },
      },
      RegisterResponse: {
        type: 'object',
        required: ['requiresEmailVerification', 'email'],
        properties: {
          requiresEmailVerification: { type: 'boolean' },
          email: { type: 'string', format: 'email' },
        },
        example: {
          requiresEmailVerification: true,
          email: 'joueur1@example.com',
        },
      },
      LeaderboardItem: {
        type: 'object',
        required: ['userId', 'username', 'gamesPlayed', 'correctCount', 'wrongCount', 'points'],
        properties: {
          userId: { type: 'string' },
          username: { type: 'string' },
          gamesPlayed: { type: 'integer', minimum: 0 },
          correctCount: { type: 'integer', minimum: 0 },
          wrongCount: { type: 'integer', minimum: 0 },
          points: { type: 'integer' },
        },
      },
      LeaderboardResponse: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/LeaderboardItem' },
          },
        },
      },
      GameValidateInput: {
        type: 'object',
        required: ['level', 'selected'],
        properties: {
          level: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          sessionId: { type: 'string' },
          entryId: { type: 'string' },
          selected: {
            type: 'object',
            properties: {
              subfamily: { type: 'string' },
              genus: { type: 'string' },
              species: { type: 'string' },
            },
          },
          answer: {
            type: 'object',
            properties: {
              subfamily: { type: 'string' },
              genus: { type: 'string' },
              species: { type: 'string' },
            },
          },
        },
      },
      GameLevelStats: {
        type: 'object',
        required: ['level', 'launchedCount', 'finalizedCount', 'finalCorrectCount', 'finalCorrectRate'],
        properties: {
          level: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          launchedCount: { type: 'integer', minimum: 0 },
          finalizedCount: { type: 'integer', minimum: 0 },
          finalCorrectCount: { type: 'integer', minimum: 0 },
          finalCorrectRate: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      GameStatsResponse: {
        type: 'object',
        required: ['period', 'levels'],
        properties: {
          period: { type: 'string', enum: ['7d', '30d', 'all'] },
          levels: {
            type: 'array',
            items: { $ref: '#/components/schemas/GameLevelStats' },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Vérifie la disponibilité de l’API',
        responses: {
          200: {
            description: 'API disponible.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                  },
                },
                example: { ok: true },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connexion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
              example: {
                email: 'admin@example.com',
                password: 'admin123',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Connexion réussie.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  role: 'ADMIN',
                  user: {
                    id: 'user_123',
                    username: 'admin',
                    email: 'admin@example.com',
                    role: 'ADMIN',
                  },
                },
              },
            },
          },
          401: {
            description: 'Identifiants invalides.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Identifiants invalides.' },
              },
            },
          },
          403: {
            description: 'Adresse e-mail non vérifiée.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Veuillez valider votre adresse e-mail avant de vous connecter.' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Création d’un compte joueur',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'email', 'password', 'confirmPassword'],
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  confirmPassword: { type: 'string' },
                },
              },
              example: {
                username: 'joueur1',
                email: 'joueur1@example.com',
                password: 'motdepasse',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Compte créé, vérification e-mail requise.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterResponse' },
                example: {
                  requiresEmailVerification: true,
                  email: 'joueur1@example.com',
                },
              },
            },
          },
          409: {
            description: 'Nom d’utilisateur déjà utilisé.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Ce nom d’utilisateur est déjà utilisé.' },
              },
            },
          },
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Vérification de l’adresse e-mail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'code'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  code: { type: 'string' },
                },
              },
              example: {
                email: 'joueur1@example.com',
                code: '123456',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Adresse e-mail vérifiée.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  role: 'USER',
                  user: {
                    id: 'user_123',
                    username: 'joueur1',
                    email: 'joueur1@example.com',
                    role: 'USER',
                  },
                },
              },
            },
          },
          400: {
            description: 'Code de vérification invalide ou expiré.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Code de vérification invalide ou expiré.' },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Profil courant',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profil courant.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'role', 'username', 'email', 'points'],
                  properties: {
                    userId: { type: 'string' },
                    role: { type: 'string', enum: ['ADMIN', 'USER'] },
                    username: { type: 'string', nullable: true },
                    email: { type: 'string', format: 'email', nullable: true },
                    points: { type: 'integer' },
                  },
                },
                example: {
                  userId: 'user_123',
                  role: 'USER',
                  username: 'joueur1',
                  email: 'joueur1@example.com',
                  points: 42,
                },
              },
            },
          },
          401: { description: 'Non autorisé.' },
        },
      },
    },
    '/game/question': {
      get: {
        tags: ['Game'],
        summary: 'Récupère une question de jeu',
        parameters: [
          {
            in: 'query',
            name: 'level',
            schema: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          },
        ],
        responses: {
          200: {
            description: 'Question renvoyée.',
            content: {
              'application/json': {
                examples: {
                  easy: {
                    value: {
                      level: 'easy',
                      entryId: 'cmx123',
                      sessionId: 'cmxSessEasy1',
                      images: ['/uploads/1712485342000-photo.jpg', '/uploads/1712485342001-photo.jpg'],
                      prompt: 'Identifier la sous-famille',
                      details: {
                        department: '53 - Mayenne',
                        observedAt: '2026-04-07T09:00:00.000Z',
                        biotope: 'Lisière forestière',
                        photoCredit: 'Jean Dupont',
                      },
                      choices: ['Myrmicinae', 'Formicinae', 'Ponerinae', 'Dolichoderinae', 'Leptanillinae'],
                      answer: { subfamily: 'Myrmicinae' },
                    },
                  },
                  medium: {
                    value: {
                      level: 'medium',
                      entryId: 'cmx124',
                      sessionId: 'cmxSessMedium1',
                      images: ['/uploads/1712485342001-photo.jpg'],
                      prompt: 'Identifier la sous-famille puis le genre',
                      details: {
                        department: '13 - Bouches-du-Rhône',
                        observedAt: '2026-04-07T09:00:00.000Z',
                        biotope: 'Prairie sèche',
                        photoCredit: 'Marie Martin',
                      },
                      choices: {
                        subfamily: ['Myrmicinae', 'Formicinae', 'Ponerinae'],
                        genus: ['Pheidole', 'Messor', 'Camponotus'],
                      },
                      answer: { subfamily: 'Myrmicinae', genus: 'Pheidole' },
                    },
                  },
                  hard: {
                    value: {
                      level: 'hard',
                      entryId: 'cmx125',
                      sessionId: 'cmxSessHard1',
                      images: ['/uploads/1712485342002-photo.jpg'],
                      prompt: "Identifier la sous-famille, le genre et l'espèce",
                      details: {
                        department: '34 - Hérault',
                        observedAt: '2026-04-07T09:00:00.000Z',
                        biotope: 'Garrigue',
                        photoCredit: 'Paul Durand',
                      },
                      choices: {
                        subfamily: ['Myrmicinae', 'Formicinae', 'Ponerinae'],
                        genus: ['Pheidole', 'Messor', 'Camponotus'],
                        species: ['pallidula', 'megacephala', 'barbara'],
                      },
                      answer: { subfamily: 'Myrmicinae', genus: 'Pheidole', species: 'pallidula' },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Aucune entrée disponible.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Aucune entrée disponible.' },
              },
            },
          },
        },
      },
    },
    '/game/validate': {
      post: {
        tags: ['Game'],
        summary: 'Valide une réponse de jeu',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GameValidateInput' },
              example: {
                level: 'hard',
                sessionId: 'cmxSessHard1',
                entryId: 'cmx125',
                selected: {
                  subfamily: 'Myrmicinae',
                  genus: 'Pheidole',
                  species: 'pallidula',
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Résultat de validation.',
            content: {
              'application/json': {
                examples: {
                  success: {
                    value: {
                      correct: true,
                      identification: {
                        subfamily: 'Myrmicinae',
                        description: 'Sous-famille caractérisée par un pédoncule en deux segments.',
                        criteria: ['Pétiole + postpétiole distincts'],
                      },
                    },
                  },
                  failure: {
                    value: {
                      correct: false,
                      reason: 'Sous-famille incorrecte',
                      identification: {
                        subfamily: 'Myrmicinae',
                        description: 'Sous-famille caractérisée par un pédoncule en deux segments.',
                        criteria: ['Pétiole + postpétiole distincts'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stats/leaderboard': {
      get: {
        tags: ['Stats'],
        summary: 'Classement des joueurs',
        parameters: [
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50 },
            description: 'Nombre maximum de joueurs renvoyés (défaut: 10).',
          },
        ],
        responses: {
          200: {
            description: 'Classement renvoyé.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LeaderboardResponse' },
              },
            },
          },
        },
      },
    },
    '/taxons/subfamilies': {
      get: {
        tags: ['Taxons'],
        summary: 'Liste les sous-familles distinctes',
        responses: {
          200: {
            description: 'Liste triée des sous-familles.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
                example: ['Dolichoderinae', 'Formicinae', 'Myrmicinae', 'Ponerinae'],
              },
            },
          },
        },
      },
    },
    '/taxons/genera': {
      get: {
        tags: ['Taxons'],
        summary: 'Liste les genres distincts pour une sous-famille',
        parameters: [
          {
            in: 'query',
            name: 'subfamily',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Liste triée des genres.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
                example: ['Camponotus', 'Formica', 'Lasius'],
              },
            },
          },
          400: {
            description: 'Le paramètre requis est manquant.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Le paramètre subfamily est requis.' },
              },
            },
          },
        },
      },
    },
    '/taxons/species': {
      get: {
        tags: ['Taxons'],
        summary: 'Liste les espèces distinctes pour un genre',
        parameters: [
          {
            in: 'query',
            name: 'genus',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Liste triée des espèces.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' },
                },
                example: ['niger', 'platythorax'],
              },
            },
          },
          400: {
            description: 'Le paramètre requis est manquant.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Le paramètre genus est requis.' },
              },
            },
          },
        },
      },
    },
    '/taxons': {
      get: {
        tags: ['Taxons'],
        summary: 'Liste les taxons',
        parameters: [
          { in: 'query', name: 'level', schema: { type: 'string', enum: ['subfamily', 'genus', 'species'] } },
          { in: 'query', name: 'q', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Liste des taxons.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Taxon' },
                },
                example: [
                  {
                    id: 'cmxTaxon123',
                    subfamily: 'Myrmicinae',
                    genus: 'Pheidole',
                    subgenus: null,
                    speciesGroup: null,
                    species: 'pallidula',
                    createdAt: '2026-04-07T09:00:00.000Z',
                    updatedAt: '2026-04-07T09:00:00.000Z',
                  },
                ],
              },
            },
          },
        },
      },
    },
    '/references': {
      get: {
        tags: ['References'],
        summary: 'Liste les références',
        responses: {
          200: {
            description: 'Liste des références.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Reference' },
                },
                example: [
                  {
                    id: 'cmxRef123',
                    title: 'AntWeb',
                    description: 'Base de données',
                    type: 'WEBSITE',
                    url: 'https://www.antweb.org',
                    createdAt: '2026-04-07T09:00:00.000Z',
                    updatedAt: '2026-04-07T09:00:00.000Z',
                  },
                ],
              },
            },
          },
        },
      },
    },
    '/admin/taxons': {
      post: {
        tags: ['Admin'],
        summary: 'Crée un taxon',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaxonInput' },
              example: {
                subfamily: 'Myrmicinae',
                genus: 'Pheidole',
                subgenus: null,
                speciesGroup: null,
                species: 'pallidula',
              },
            },
          },
        },
        responses: {
          201: { description: 'Taxon créé.' },
          400: { description: 'Requête invalide.' },
          401: { description: 'Non autorisé.' },
          403: { description: 'Accès administrateur requis.' },
        },
      },
    },
    '/admin/taxons/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Met à jour un taxon',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TaxonInput' },
            },
          },
        },
        responses: {
          200: { description: 'Taxon mis à jour.' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Supprime un taxon',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Taxon supprimé.' },
        },
      },
    },
    '/admin/references': {
      post: {
        tags: ['Admin'],
        summary: 'Crée une référence',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReferenceInput' },
              example: {
                title: 'AntWeb',
                description: 'Base de données',
                type: 'WEBSITE',
                url: 'https://www.antweb.org',
              },
            },
          },
        },
        responses: {
          201: { description: 'Référence créée.' },
        },
      },
    },
    '/admin/references/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Met à jour une référence',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReferenceInput' },
            },
          },
        },
        responses: {
          200: { description: 'Référence mise à jour.' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Supprime une référence',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Référence supprimée.' },
        },
      },
    },
    '/admin/entries': {
      get: {
        tags: ['Admin'],
        summary: 'Liste les entrées d’observation',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Entrées listées.' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Crée une entrée (multipart/form-data)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['taxonLevel', 'taxonValue', 'department', 'observedAt', 'biotope', 'photoCredit'],
                properties: {
                  taxonLevel: { type: 'string', enum: ['SUBFAMILY', 'GENUS', 'SPECIES'] },
                  taxonValue: { type: 'string' },
                  taxonGenus: { type: 'string', nullable: true, description: 'Optionnel; recommandé si taxonLevel=SPECIES' },
                  department: { type: 'string' },
                  observedAt: { type: 'string', format: 'date' },
                  biotope: { type: 'string' },
                  photoCredit: { type: 'string' },
                  images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
              encoding: {
                images: {
                  style: 'form',
                  explode: true,
                },
              },
              example: {
                taxonLevel: 'GENUS',
                taxonValue: 'Camponotus',
                taxonGenus: null,
                department: '13',
                observedAt: '2026-04-07',
                biotope: 'Garrigue',
                photoCredit: 'myrmeco_user',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Entrée créée.',
            content: {
              'application/json': {
                example: {
                  id: 'cmxEntry123',
                  taxonId: null,
                  taxonLevel: 'GENUS',
                  taxonValue: 'Camponotus',
                  subfamily: 'Formicinae',
                  genus: 'Camponotus',
                  species: null,
                  department: '13',
                  observedAt: '2026-04-07T00:00:00.000Z',
                  biotope: 'Garrigue',
                  photoCredit: 'myrmeco_user',
                  images: [{ id: 'cmxImg1', imageUrl: '/uploads/1712485342002-photo.jpg' }],
                },
              },
            },
          },
        },
      },
    },
    '/admin/entries/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Met à jour une entrée',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['taxonLevel', 'taxonValue', 'department', 'observedAt', 'biotope', 'photoCredit'],
                properties: {
                  taxonLevel: { type: 'string', enum: ['SUBFAMILY', 'GENUS', 'SPECIES'] },
                  taxonValue: { type: 'string' },
                  taxonGenus: { type: 'string', nullable: true, description: 'Optionnel; recommandé si taxonLevel=SPECIES' },
                  department: { type: 'string' },
                  observedAt: { type: 'string', format: 'date' },
                  biotope: { type: 'string' },
                  photoCredit: { type: 'string' },
                },
              },
              example: {
                taxonLevel: 'SPECIES',
                taxonValue: 'rufibarbis',
                taxonGenus: 'Formica',
                department: '34',
                observedAt: '2026-04-08',
                biotope: 'Forêt de pins',
                photoCredit: 'myrmeco_user',
              },
            },
          },
        },
        responses: {
          200: { description: 'Entrée mise à jour.' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Supprime une entrée',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Entrée supprimée.' },
        },
      },
    },
    '/admin/stats/game': {
      get: {
        tags: ['Admin'],
        summary: 'Statistiques des parties par niveau',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'period',
            required: false,
            schema: { type: 'string', enum: ['7d', '30d', 'all'] },
            description: 'Fenêtre temporelle des statistiques (défaut: all).',
          },
        ],
        responses: {
          200: {
            description: 'Statistiques renvoyées.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GameStatsResponse' },
                example: {
                  period: '30d',
                  levels: [
                    {
                      level: 'easy',
                      launchedCount: 18,
                      finalizedCount: 17,
                      finalCorrectCount: 13,
                      finalCorrectRate: 76.5,
                    },
                    {
                      level: 'medium',
                      launchedCount: 9,
                      finalizedCount: 9,
                      finalCorrectCount: 4,
                      finalCorrectRate: 44.4,
                    },
                    {
                      level: 'hard',
                      launchedCount: 0,
                      finalizedCount: 0,
                      finalCorrectCount: 0,
                      finalCorrectRate: 0,
                    },
                  ],
                },
              },
            },
          },
          401: { description: 'Non autorisé.' },
          403: { description: 'Accès administrateur requis.' },
        },
      },
    },
    '/admin/database/export': {
      get: {
        tags: ['Admin'],
        summary: 'Exporte la base de données (JSON)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Snapshot de la base.',
            content: {
              'application/json': {
                example: {
                  version: '1',
                  exportedAt: '2026-04-07T16:00:00.000Z',
                  data: {
                    taxons: [],
                    taxonLevelProfiles: [],
                    taxonLevelCriteria: [],
                    references: [],
                    observationEntries: [],
                    entryImages: [],
                    gameSessions: [],
                  },
                },
              },
            },
          },
          401: { description: 'Non autorisé.' },
          403: { description: 'Accès administrateur requis.' },
        },
      },
    },
    '/admin/database/import': {
      post: {
        tags: ['Admin'],
        summary: 'Importe un snapshot de base (remplacement complet)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                version: '1',
                exportedAt: '2026-04-07T16:00:00.000Z',
                data: {
                  taxons: [],
                  taxonLevelProfiles: [],
                  taxonLevelCriteria: [],
                  references: [],
                  observationEntries: [],
                  entryImages: [],
                  gameSessions: [],
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Import terminé.' },
          400: { description: 'Requête invalide.' },
          401: { description: 'Non autorisé.' },
          403: { description: 'Accès administrateur requis.' },
        },
      },
    },
  },
}
