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
          message: 'Payload invalide',
        },
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
        },
        example: {
          subfamily: 'Myrmicinae',
          tribe: 'Pheidolini',
          genus: 'Pheidole',
          subgenus: null,
          speciesGroup: null,
          species: 'pallidula',
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
          email: 'admin@antid.local',
          password: 'admin123',
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'USER'] },
        },
        example: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          role: 'ADMIN',
        },
      },
      GameValidateInput: {
        type: 'object',
        required: ['level', 'selected', 'answer'],
        properties: {
          level: { type: 'string', enum: ['easy', 'medium', 'hard'] },
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
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Vérifie la disponibilité de l’API',
        responses: {
          200: {
            description: 'API disponible',
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
        summary: 'Connexion administrateur/utilisateur',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
              example: {
                email: 'admin@antid.local',
                password: 'admin123',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Connexion réussie',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  role: 'ADMIN',
                },
              },
            },
          },
          401: {
            description: 'Identifiants invalides',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Identifiants invalides' },
              },
            },
          },
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
            description: 'Question renvoyée',
            content: {
              'application/json': {
                examples: {
                  easy: {
                    value: {
                      level: 'easy',
                      entryId: 'cmx123',
                      image: '/uploads/1712485342000-photo.jpg',
                      prompt: 'Identifier la sous-famille',
                      choices: ['Myrmicinae', 'Formicinae', 'Ponerinae', 'Dolichoderinae', 'Leptanillinae'],
                      answer: { subfamily: 'Myrmicinae' },
                    },
                  },
                  medium: {
                    value: {
                      level: 'medium',
                      entryId: 'cmx124',
                      image: '/uploads/1712485342001-photo.jpg',
                      prompt: 'Identifier la sous-famille puis le genre',
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
                      image: '/uploads/1712485342002-photo.jpg',
                      prompt: "Identifier la sous-famille, le genre et l'espèce",
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
            description: 'Aucune entrée disponible',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
                example: { message: 'Aucune entrée disponible' },
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
                selected: {
                  subfamily: 'Myrmicinae',
                  genus: 'Pheidole',
                  species: 'pallidula',
                },
                answer: {
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
            description: 'Résultat de validation',
            content: {
              'application/json': {
                examples: {
                  success: { value: { correct: true } },
                  failure: { value: { correct: false, reason: 'Sous-famille incorrecte' } },
                },
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
            description: 'Liste des taxons',
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
            description: 'Liste des références',
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
          201: { description: 'Taxon créé' },
          400: { description: 'Payload invalide' },
          401: { description: 'Non autorisé' },
          403: { description: 'Accès administrateur requis' },
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
          200: { description: 'Taxon mis à jour' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Supprime un taxon',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Taxon supprimé' },
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
          201: { description: 'Référence créée' },
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
          200: { description: 'Référence mise à jour' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Supprime une référence',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Référence supprimée' },
        },
      },
    },
    '/admin/entries': {
      get: {
        tags: ['Admin'],
        summary: 'Liste les entrées d’observation',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Entrées listées' },
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
            description: 'Entrée créée',
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
          200: { description: 'Entrée mise à jour' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Supprime une entrée',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Entrée supprimée' },
        },
      },
    },
  },
}
