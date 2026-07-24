/** Account-basics hooks (task #27): edit your profile, leave your household,
 * leave your mahalla, delete your account. Endpoints live in api/app/routers/me.py.
 *
 * Every mutation refreshes the auth session (names/links shown app-wide change)
 * and invalidates cached lists. The leave/delete flows then send the user home:
 * "/" re-routes through RootRedirect to the right stage (onboarding after leaving
 * a mahalla; login after a deleted account, whose session cookie the server drops). */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/core/api/client'
import type { User } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'

/** Body for PATCH /me — mirrors backend MeUpdate. */
export interface MeUpdate {
  full_name?: string
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: MeUpdate) => api<User>('/me', { method: 'PATCH', body }),
    onSuccess: async () => {
      await qc.invalidateQueries()
      await useAuth.getState().refresh()
    },
  })
}

export function useLeaveHousehold() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api<User>('/me/leave-household', { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries()
      await useAuth.getState().refresh()
      navigate('/')
    },
  })
}

export function useLeaveMahalla() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api<void>('/me/leave-mahalla', { method: 'POST' }),
    onSuccess: async () => {
      await qc.invalidateQueries()
      await useAuth.getState().refresh()
      navigate('/')
    },
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => api<void>('/me', { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries()
      // The server already cleared the session cookie, so refresh() gets a 401
      // and clears the local session — routing "/" to the login screen.
      await useAuth.getState().refresh()
      navigate('/')
    },
  })
}
