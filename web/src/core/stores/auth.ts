import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import type { Me } from '../api/types'

interface AuthState {
  me: Me | null
  status: 'loading' | 'ready'
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  me: null,
  status: 'loading',
  refresh: async () => {
    try {
      const me = await api<Me>('/auth/me')
      set({ me, status: 'ready' })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        set({ me: null, status: 'ready' })
      } else {
        set({ status: 'ready' })
        throw e
      }
    }
  },
  logout: async () => {
    await api('/auth/logout', { method: 'POST' })
    set({ me: null })
  },
}))
