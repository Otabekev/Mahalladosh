/** App-wide styled confirm dialog.
 *
 * Replaces window.confirm — a browser dialog is jarring, unbranded, and (worst for
 * our audience) shows in the phone's system language, not the elder's chosen one.
 *
 * The API is deliberately imperative so a call site barely changes:
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title, body, confirmLabel, danger: true })) doTheThing()
 *
 * One dialog instance lives at the app root; `confirm()` opens it and resolves to
 * true/false when the user chooses. The visual matches the danger-zone dialog in
 * SettingsScreen so every confirmation in the app looks the same.
 */

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button, Modal } from '@/components/ui'
import { useStrings } from '@/core/i18n'
import { common } from '@/core/i18n/common'

export interface ConfirmOptions {
  /** Short heading (usually the action verb). */
  title: string
  /** Plain-language explanation of what will happen. */
  body?: string
  /** Label on the affirmative button. */
  confirmLabel: string
  /** Overrides the default "Cancel". */
  cancelLabel?: string
  /** Red affirmative button for destructive actions (delete, remove, reject). */
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) throw new Error('useConfirm must be used within <ConfirmProvider>')
  return fn
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const c = useStrings(common)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((next) => {
    // If a prior confirm is somehow still open, resolve it false before reusing.
    resolver.current?.(false)
    setOpts(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpts(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={opts !== null} onClose={() => settle(false)} title={opts?.title}>
        {opts?.body && <p className="text-[15px] leading-relaxed text-ink">{opts.body}</p>}
        <div className={`flex gap-2.5 ${opts?.body ? 'mt-5' : ''}`}>
          <Button variant="secondary" full onClick={() => settle(false)}>
            {opts?.cancelLabel ?? c.cancel}
          </Button>
          <Button variant={opts?.danger ? 'danger' : 'primary'} full onClick={() => settle(true)}>
            {opts?.confirmLabel}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}
