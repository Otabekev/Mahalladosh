import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/core/api/client'
import { useMarkAllRead, useNotifications } from '@/core/queries/notifications'
import { Card, EmptyState, ErrorNote, PageTitle, Spinner, timeAgo } from '@/components/ui'

export default function NotificationsScreen() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useNotifications()
  const markRead = useMarkAllRead()

  // opening the screen clears the unread badge
  useEffect(() => {
    if (data && data.unread > 0) markRead.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.unread])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <PageTitle title="Bildirishnomalar" />
        <ErrorNote message={error instanceof ApiError ? error.message : 'Xatolik yuz berdi'} />
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div>
      <PageTitle title="Bildirishnomalar" subtitle="Mahallangizda nima bo'lyapti" />
      {items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Hozircha bildirishnoma yo'q"
          text="Qo'shnilaringiz faollashganda bu yerda ko'rasiz."
        />
      ) : (
        <Card className="p-0 divide-y divide-line">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => n.link && navigate(n.link)}
              className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 transition hover:bg-gray-50 ${
                n.read ? '' : 'bg-blue-50/40'
              }`}
            >
              <span className={`text-sm text-ink line-clamp-2 ${n.read ? '' : 'font-semibold'}`}>
                {n.text}
              </span>
              <span className="text-xs text-sub">{timeAgo(n.created_at)}</span>
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
