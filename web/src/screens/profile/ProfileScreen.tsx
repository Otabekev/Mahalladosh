/** Profile screen: identity card, points, menu (household, admin, points info, logout). */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/core/stores/auth'
import { Avatar, Badge, Card, PointsBadge, Spinner } from '@/components/ui'

const POINT_RULES = [
  { icon: '🤝', label: 'Yordam berish', points: '+10' },
  { icon: '📖', label: 'Oila tarixini yozish', points: '+15' },
  { icon: '👋', label: "Yangi qo'shnini kutib olish", points: '+5' },
  { icon: '🏗', label: "Asoschi bo'lish", points: '+20' },
]

function MenuRow({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-left hover:bg-gray-50 transition ${danger ? 'text-danger' : 'text-ink'}`}
    >
      {children}
    </button>
  )
}

export default function ProfileScreen() {
  const me = useAuth((s) => s.me)
  const navigate = useNavigate()
  const [showPoints, setShowPoints] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  if (!me) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  const u = me.user

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await useAuth.getState().logout()
    } catch {
      /* even if the server call fails, send the user to login */
    }
    navigate('/login')
  }

  return (
    <div className="space-y-3">
      <Card className="p-5 text-center">
        <div className="flex justify-center">
          <Avatar name={u.full_name} src={u.photo_url} size={72} />
        </div>
        <h1 className="text-lg font-bold text-ink mt-3">{u.full_name}</h1>
        {u.username && <p className="text-sm text-sub">@{u.username}</p>}
        {me.mahalla && <p className="text-sm text-sub">{me.mahalla.name} mahallasi</p>}
        <div className="flex justify-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1.5">
            <PointsBadge points={u.rep_month} />
            <span className="text-xs text-sub self-center">bu oy</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-bold text-ink">{u.rep_alltime}</span>
            <span className="text-xs text-sub self-center">umumiy</span>
          </span>
        </div>
        {(u.is_raisi || u.is_admin) && (
          <div className="flex justify-center gap-2 mt-3">
            {u.is_raisi && <Badge color="gold">Raisi</Badge>}
            {u.is_admin && <Badge color="blue">Admin</Badge>}
          </div>
        )}
      </Card>

      <Card className="p-0 divide-y divide-line">
        <MenuRow onClick={() => navigate('/app/household')}>
          <span>🏠</span> Mening xonadonim
        </MenuRow>
        {u.is_admin && (
          <MenuRow onClick={() => navigate('/app/admin')}>
            <span>🛠</span> Admin panel
          </MenuRow>
        )}
        <div>
          <MenuRow onClick={() => setShowPoints((v) => !v)}>
            <span>ℹ️</span> Ball qanday yig'iladi?
            <span className="ml-auto text-sub">{showPoints ? '▴' : '▾'}</span>
          </MenuRow>
          {showPoints && (
            <div className="px-4 pb-4">
              <ul className="space-y-1.5">
                {POINT_RULES.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-sm text-ink">
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                    <span className="ml-auto font-bold text-gold">{r.points}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-sub mt-3">
                Ball — bu obro' belgisi. Oy oxirida eng faol qo'shni e'zozlanadi.
              </p>
            </div>
          )}
        </div>
        <MenuRow danger onClick={handleLogout}>
          {loggingOut ? <Spinner size={16} /> : <span>🚪</span>} Chiqish
        </MenuRow>
      </Card>
    </div>
  )
}
