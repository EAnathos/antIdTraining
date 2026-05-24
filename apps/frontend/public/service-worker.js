const CACHE_NAME = 'ant-id-training-pwa-v2'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
]

// Limite pour le cache utilisateur (en nombre de fichiers et taille estimée)
const MAX_CACHE_SIZE = 50 // Maximum 50 fichiers
const MAX_CACHE_AGE = 1000 * 60 * 60 * 24 * 7 // 7 jours

/**
 * Nettoyage du cache - supprime les fichiers les plus anciens si la limite est dépassée.
 */
async function cleanupCache(cacheName) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()

  if (keys.length > MAX_CACHE_SIZE) {
    // Supprime les fichiers en excès (approximativement)
    const keysToDelete = keys.slice(0, keys.length - MAX_CACHE_SIZE + 10)
    await Promise.all(keysToDelete.map((key) => cache.delete(key)))
  }
}

/**
 * Ajoute un fichier au cache avec gestion du timestamp.
 */
async function addToCache(cacheName, url, response) {
  const cache = await caches.open(cacheName)
  const clonedResponse = response.clone()
  
  // Ajoute un timestamp personnalisé dans les headers
  const newResponse = new Response(clonedResponse.body, {
    status: clonedResponse.status,
    statusText: clonedResponse.statusText,
    headers: new Headers(clonedResponse.headers),
  })
  
  await cache.put(url, newResponse)
  await cleanupCache(cacheName)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

/**
 * Événement fetch optimisé avec stratégies de caching intelligentes.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignore les requêtes non-GET
  if (request.method !== 'GET') return

  // Ignore les requêtes vers d'autres domaines
  if (url.origin !== self.location.origin) return

  // Ignore les requêtes API (mises en cache côté serveur)
  if (url.pathname.startsWith('/api/')) return

  // Stratégie spéciale pour les pages de navigation (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache la réponse réussie
          if (response.ok) {
            addToCache(CACHE_NAME, request.url, response)
          }
          return response
        })
        .catch(() => {
          // Retour à la page en cache si hors ligne
          return caches.match('/index.html').then((cached) => cached || new Response('Offline', { status: 503 }))
        })
    )
    return
  }

  // Stratégie Stale-While-Revalidate pour les assets (CSS, JS, images, fonts)
  const isAsset =
    url.pathname.startsWith('/assets/') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'

  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalide en arrière-plan sans bloquer la réponse
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                addToCache(CACHE_NAME, request.url, networkResponse)
              }
            })
            .catch(() => {
              // Silence les erreurs réseau en arrière-plan
            })
          return cachedResponse
        }

        // Pas de cache, essaie le réseau
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              addToCache(CACHE_NAME, request.url, networkResponse)
            }
            return networkResponse
          })
          .catch(() => new Response('Offline', { status: 503 }))
      })
    )
    return
  }

  // Fallback : Cache-First avec Network-Fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => cachedResponse || fetch(request))
      .then((response) => {
        if (response.ok && request.method === 'GET') {
          addToCache(CACHE_NAME, request.url, response)
        }
        return response
      })
      .catch(() => new Response('Offline', { status: 503 }))
  )
})