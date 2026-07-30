/** One-tap 🤲 toggle, shown on feed cards and the post detail.
 *  Optimistic (see useToggleRahmat), so it reacts on tap. stopPropagation keeps a
 *  tap on the button from also opening the card it sits inside.
 *
 *  THE WORD CHANGES ON A TA'ZIYA. "Rahmat" means thank you, and thanking someone
 *  for a death notice is offensive — but removing the tap altogether would be worse,
 *  because acknowledging a death is exactly what a neighbour wants to do. So the
 *  same 🤲 becomes "Duo qildim" (I prayed), which is the thing people actually say.
 *  One mechanism, one row per person, the only word that is not a wound. */

import { useStrings } from '@/core/i18n'
import { broadcastStrings } from '@/core/i18n/broadcast'
import { common } from '@/core/i18n/common'
import { useToggleRahmat } from '@/core/queries/posts'
import type { Post } from '@/core/api/types'

export function RahmatButton({
  post,
  size = 'md',
}: {
  post: Pick<Post, 'id' | 'rahmat_count' | 'my_rahmat'> & { type?: Post['type'] }
  size?: 'sm' | 'md'
}) {
  const c = useStrings(common)
  const b = useStrings(broadcastStrings)
  const toggle = useToggleRahmat()
  const pad = size === 'sm' ? 'px-2.5 min-h-[36px]' : 'px-3 min-h-[40px]'

  return (
    <button
      type="button"
      aria-pressed={post.my_rahmat}
      onClick={(e) => {
        e.stopPropagation()
        toggle.mutate(post.id)
      }}
      className={`inline-flex items-center gap-1.5 rounded-full ${pad} text-[14px] font-semibold transition active:scale-95 ${
        post.my_rahmat ? 'bg-brand-soft text-brand' : 'text-sub hover:bg-black/5'
      }`}
    >
      <span className="text-[17px] leading-none">🤲</span>
      <span>{post.type === 'taziya' ? b.duo : c.rahmat}</span>
      {post.rahmat_count > 0 && <span className="tabular-nums">{post.rahmat_count}</span>}
    </button>
  )
}
