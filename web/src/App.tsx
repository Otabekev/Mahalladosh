import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/core/stores/auth'
import { FullScreenSpinner } from '@/components/ui'
import AppLayout from '@/components/layout'

const LoginScreen = lazy(() => import('@/screens/auth/LoginScreen'))
const OnboardingScreen = lazy(() => import('@/screens/onboarding/OnboardingScreen'))
const WaitingScreen = lazy(() => import('@/screens/onboarding/WaitingScreen'))
const FeedScreen = lazy(() => import('@/screens/feed/FeedScreen'))
const CreatePostScreen = lazy(() => import('@/screens/feed/CreatePostScreen'))
const PostDetailScreen = lazy(() => import('@/screens/feed/PostDetailScreen'))
const MahallaScreen = lazy(() => import('@/screens/mahalla/MahallaScreen'))
const ProfileScreen = lazy(() => import('@/screens/profile/ProfileScreen'))
const SettingsScreen = lazy(() => import('@/screens/profile/SettingsScreen'))
const MyHouseholdScreen = lazy(() => import('@/screens/household/MyHouseholdScreen'))
const HouseholdDetailScreen = lazy(() => import('@/screens/household/HouseholdDetailScreen'))
const ProposalsScreen = lazy(() => import('@/screens/proposals/ProposalsScreen'))
const CreateProposalScreen = lazy(() => import('@/screens/proposals/CreateProposalScreen'))
const ProposalDetailScreen = lazy(() => import('@/screens/proposals/ProposalDetailScreen'))
const ServicesScreen = lazy(() => import('@/screens/services/ServicesScreen'))
const AdminScreen = lazy(() => import('@/screens/admin/AdminScreen'))
const NotificationsScreen = lazy(() => import('@/screens/notifications/NotificationsScreen'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: true } },
})

/** Routes the user to the right stage: login → onboarding → waiting → app. */
function RootRedirect() {
  const { me, status } = useAuth()
  if (status === 'loading') return <FullScreenSpinner />
  if (!me) return <Navigate to="/login" replace />
  if (me.mahalla && me.mahalla.status === 'active') return <Navigate to="/app" replace />
  if (me.petition) return <Navigate to="/waiting" replace />
  return <Navigate to="/onboarding" replace />
}

function RequireUser({ children }: { children: ReactNode }) {
  const { me, status } = useAuth()
  if (status === 'loading') return <FullScreenSpinner />
  if (!me) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireMember({ children }: { children: ReactNode }) {
  const { me, status } = useAuth()
  if (status === 'loading') return <FullScreenSpinner />
  if (!me) return <Navigate to="/login" replace />
  if (!me.mahalla || me.mahalla.status !== 'active') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const refresh = useAuth((s) => s.refresh)

  useEffect(() => {
    refresh().catch(() => undefined)
  }, [refresh])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<FullScreenSpinner />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route
              path="/onboarding"
              element={
                <RequireUser>
                  <OnboardingScreen />
                </RequireUser>
              }
            />
            <Route
              path="/waiting"
              element={
                <RequireUser>
                  <WaitingScreen />
                </RequireUser>
              }
            />
            <Route
              path="/app"
              element={
                <RequireMember>
                  <AppLayout />
                </RequireMember>
              }
            >
              <Route index element={<FeedScreen />} />
              <Route path="new" element={<CreatePostScreen />} />
              <Route path="posts/:id" element={<PostDetailScreen />} />
              <Route path="mahalla" element={<MahallaScreen />} />
              <Route path="profile" element={<ProfileScreen />} />
              <Route path="settings" element={<SettingsScreen />} />
              <Route path="household" element={<MyHouseholdScreen />} />
              <Route path="households/:id" element={<HouseholdDetailScreen />} />
              <Route path="proposals" element={<ProposalsScreen />} />
              <Route path="proposals/new" element={<CreateProposalScreen />} />
              <Route path="proposals/:id" element={<ProposalDetailScreen />} />
              <Route path="services" element={<ServicesScreen />} />
              <Route path="admin" element={<AdminScreen />} />
              <Route path="notifications" element={<NotificationsScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
