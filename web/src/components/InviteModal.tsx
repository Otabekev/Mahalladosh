/** Invite-a-neighbour modal: a shareable link, a QR code for it, and the native
 *  share sheet / copy fallback. The link points at /join/:id, which joins the
 *  opener to this mahalla (see JoinScreen). */

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button, Modal } from '@/components/ui'
import { useStrings } from '@/core/i18n'
import { inviteStrings } from '@/core/i18n/invite'

export function InviteModal({
  mahallaId,
  open,
  onClose,
}: {
  mahallaId: number
  open: boolean
  onClose: () => void
}) {
  const s = useStrings(inviteStrings)
  const link = `${window.location.origin}/join/${mahallaId}`
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  useEffect(() => {
    if (!open) return
    let alive = true
    QRCode.toDataURL(link, { width: 240, margin: 1, color: { dark: '#2a1d14', light: '#fffbf0' } })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(''))
    return () => {
      alive = false
    }
  }, [open, link])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the link is on screen to copy by hand */
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'Mahalladosh', url: link })
    } catch {
      /* user dismissed the sheet */
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={s.title}>
      <p className="mb-3 text-sm text-sub">{s.hint}</p>
      {qr && <img src={qr} alt="" width={200} height={200} className="mx-auto mb-3 rounded-xl" />}
      <div className="mb-3 break-all rounded-xl border border-line bg-paper px-3 py-2 text-[13px] text-ink">
        {link}
      </div>
      <div className="flex gap-2">
        {canShare && (
          <Button full onClick={share}>
            {s.share}
          </Button>
        )}
        <Button full variant="secondary" onClick={copy}>
          {copied ? s.copied : s.copyLink}
        </Button>
      </div>
    </Modal>
  )
}
