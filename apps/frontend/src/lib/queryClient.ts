import { QueryClient } from '@tanstack/react-query'

/**
 * QueryClient avec configuration optimisée pour l'application.
 * - Durée de cache par défaut : 5 minutes (300s)
 * - Retry automatique : 1 tentative sur erreur réseau
 * - Staletime : 1 minute pour éviter trop de requêtes
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (ancien cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})
