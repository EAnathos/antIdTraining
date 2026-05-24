import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { GameQuestion, GameLevelStats, LeaderboardResponse, AuthMeResponse, Entry } from '../types/models'

const API_BASE = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:4000'

/**
 * Hook pour récupérer une nouvelle question du jeu.
 */
export const useGameQuestion = (level: 'easy' | 'medium' | 'hard') => {
  return useQuery({
    queryKey: ['gameQuestion', level],
    queryFn: async (): Promise<GameQuestion> => {
      const res = await fetch(`${API_BASE}/api/game/question/${level}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch game question')
      return res.json()
    },
  })
}

/**
 * Hook pour valider la réponse à une question du jeu.
 */
export const useValidateAnswer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      sessionId: string
      answer: Record<string, string>
      correct: boolean
    }) => {
      const res = await fetch(`${API_BASE}/api/game/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to validate answer')
      return res.json()
    },
    onSuccess: () => {
      // Invalide les statistiques après une réponse
      queryClient.invalidateQueries({ queryKey: ['gameStats'] })
    },
  })
}

/**
 * Hook pour récupérer les statistiques de jeu de l'utilisateur.
 */
export const useGameStats = (period: '7d' | '30d' | 'all' = '30d') => {
  return useQuery({
    queryKey: ['gameStats', period],
    queryFn: async (): Promise<GameLevelStats[]> => {
      const res = await fetch(`${API_BASE}/api/game/stats?period=${period}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch game stats')
      return res.json()
    },
  })
}

/**
 * Hook pour récupérer le leaderboard.
 */
export const useLeaderboard = () => {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const res = await fetch(`${API_BASE}/api/game/leaderboard`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      return res.json()
    },
  })
}

/**
 * Hook pour récupérer les informations de l'utilisateur connecté.
 */
export const useAuthMe = () => {
  return useQuery({
    queryKey: ['authMe'],
    queryFn: async (): Promise<AuthMeResponse> => {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch auth user')
      return res.json()
    },
  })
}

/**
 * Hook pour récupérer une liste d'entrées d'observation.
 */
export const useEntries = (offset = 0, limit = 20) => {
  return useQuery({
    queryKey: ['entries', offset, limit],
    queryFn: async (): Promise<{ items: Entry[]; hasMore: boolean; total: number }> => {
      const res = await fetch(`${API_BASE}/api/entries?offset=${offset}&limit=${limit}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch entries')
      return res.json()
    },
  })
}

/**
 * Hook pour rechercher des entrées.
 */
export const useSearchEntries = (query: string) => {
  return useQuery({
    queryKey: ['searchEntries', query],
    queryFn: async (): Promise<Entry[]> => {
      const res = await fetch(`${API_BASE}/api/entries/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to search entries')
      return res.json()
    },
    enabled: query.length > 0, // Ne déclenche la requête que si query n'est pas vide
  })
}

/**
 * Hook pour se déconnecter (logout).
 */
export const useLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to logout')
      return res.json()
    },
    onSuccess: () => {
      // Réinitialise les queries après logout
      queryClient.clear()
    },
  })
}
