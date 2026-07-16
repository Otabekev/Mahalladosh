/** 3-step onboarding wizard: region → district → mahalla (search + petition/join).
 * Full-screen, outside the app shell — simple top bar with brand + logout. */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/core/api/client'
import type { District, Mahalla, Region } from '@/core/api/types'
import { useAuth } from '@/core/stores/auth'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageTitle,
  Spinner,
} from '@/components/ui'
import {
  useDistricts,
  useJoinMahalla,
  useMahallaSearch,
  usePetition,
  useRegions,
} from '@/core/queries/onboarding'

function Chevron() {
  return <span className="text-sub text-xl leading-none shrink-0">›</span>
}

function errText(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Xatolik yuz berdi'
}

export default function OnboardingScreen() {
  const navigate = useNavigate()

  const [region, setRegion] = useState<Region | null>(null)
  const [district, setDistrict] = useState<District | null>(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // petition modal
  const [petitionTarget, setPetitionTarget] = useState<Mahalla | null>(null)
  const [households, setHouseholds] = useState('')
  const [modalError, setModalError] = useState('')

  const [error, setError] = useState('')

  const regions = useRegions()
  const districts = useDistricts(region?.id)
  const mahallas = useMahallaSearch(district?.id, debouncedQ)
  const petition = usePetition()
  const join = useJoinMahalla()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const handleLogout = async () => {
    await useAuth.getState().logout()
    navigate('/login')
  }

  const handleJoin = async (m: Mahalla) => {
    setError('')
    try {
      await join.mutateAsync(m.id)
      await useAuth.getState().refresh()
      navigate('/app')
    } catch (e) {
      setError(errText(e))
    }
  }

  const openPetition = (m: Mahalla) => {
    setHouseholds('')
    setModalError('')
    setPetitionTarget(m)
  }

  const submitPetition = async () => {
    if (!petitionTarget) return
    setModalError('')
    const n = Number(households.trim())
    const estimated = households.trim() !== '' && Number.isFinite(n) && n >= 1 ? Math.floor(n) : undefined
    try {
      await petition.mutateAsync({ mahallaId: petitionTarget.id, estimated_households: estimated })
      await useAuth.getState().refresh()
      navigate('/waiting')
    } catch (e) {
      setModalError(errText(e))
    }
  }

  const step = district ? 3 : region ? 2 : 1

  return (
    <div className="min-h-dvh bg-bg">
      {/* top bar */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand text-white font-black flex items-center justify-center text-base">
              M
            </div>
            <span className="font-extrabold text-[15px] text-ink">Mahalladosh</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Chiqish
          </Button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 pb-16">
        <p className="text-xs font-semibold text-sub mb-2">{step}/3 qadam</p>

        {/* step 1: region */}
        {step === 1 && (
          <>
            <PageTitle title="Viloyatingiz" subtitle="Qaysi viloyatda yashaysiz?" />
            {regions.isPending && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}
            {regions.isError && <ErrorNote message={errText(regions.error)} />}
            <div className="space-y-2">
              {regions.data?.map((r) => (
                <Card key={r.id} onClick={() => setRegion(r)} className="px-4 py-4 flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink min-w-0">{r.name_uz}</span>
                  <Chevron />
                </Card>
              ))}
            </div>
          </>
        )}

        {/* step 2: district */}
        {step === 2 && (
          <>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 min-h-[44px]" onClick={() => setRegion(null)}>
              ← Orqaga
            </Button>
            <PageTitle title="Tumaningiz" subtitle={region ? region.name_uz : undefined} />
            {districts.isPending && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}
            {districts.isError && <ErrorNote message={errText(districts.error)} />}
            <div className="space-y-2">
              {districts.data?.map((d) => (
                <Card key={d.id} onClick={() => setDistrict(d)} className="px-4 py-4 flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink min-w-0">{d.name_uz}</span>
                  <Chevron />
                </Card>
              ))}
            </div>
          </>
        )}

        {/* step 3: mahalla */}
        {step === 3 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 min-h-[44px]"
              onClick={() => {
                setDistrict(null)
                setQ('')
                setDebouncedQ('')
              }}
            >
              ← Orqaga
            </Button>
            <PageTitle title="Mahallangiz" subtitle={district ? district.name_uz : undefined} />
            {error && <ErrorNote message={error} />}
            <div className="mb-4">
              <Input placeholder="Mahalla nomini qidiring" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {mahallas.isPending && (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )}
            {mahallas.isError && <ErrorNote message={errText(mahallas.error)} />}
            {mahallas.data && mahallas.data.length === 0 && (
              <EmptyState icon="🏘" title="Mahalla topilmadi" text="Bu tumanda mahallalar hali kiritilmagan. Tez orada qo'shiladi." />
            )}
            <div className="space-y-2">
              {mahallas.data?.map((m) => (
                <Card key={m.id} className="px-4 py-4 flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink min-w-0 line-clamp-2">{m.name}</span>

                  {m.status === 'active' ? (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <Badge color="green">Ochiq</Badge>
                        <span className="text-xs text-sub">{m.member_count} a'zo</span>
                      </div>
                      <Button
                        loading={join.isPending && join.variables === m.id}
                        onClick={() => void handleJoin(m)}
                      >
                        Qo'shilish
                      </Button>
                    </div>
                  ) : m.status === 'pending' ? (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge color="gold">Tasdiqlanmoqda</Badge>
                      <Button variant="secondary" onClick={() => openPetition(m)}>
                        So'rov yuborish
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs text-sub">
                        {m.petition_count}/{m.petition_threshold} so'rov
                      </span>
                      <Button variant="secondary" onClick={() => openPetition(m)}>
                        So'rov yuborish
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* petition modal */}
      <Modal open={petitionTarget !== null} onClose={() => setPetitionTarget(null)} title="So'rov yuborish">
        {modalError && <ErrorNote message={modalError} />}
        <Field label="Mahallada taxminan nechta xonadon bor?" hint="Shart emas">
          <Input
            type="number"
            min={1}
            placeholder="Masalan: 40"
            value={households}
            onChange={(e) => setHouseholds(e.target.value)}
          />
        </Field>
        <Button full loading={petition.isPending} onClick={() => void submitPetition()}>
          Yuborish
        </Button>
      </Modal>
    </div>
  )
}
