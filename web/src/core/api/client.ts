/** Typed fetch wrapper. Lives in core/ — no DOM, no UI imports (plan §3). */

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Abort after this many ms. On a village connection a request can hang
   *  indefinitely; a caller that must not stay pending forever sets this. */
  timeoutMs?: number
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const controller = opts.timeoutMs ? new AbortController() : undefined
  const timer =
    controller && opts.timeoutMs
      ? setTimeout(() => controller.abort(), opts.timeoutMs)
      : undefined
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? 'GET',
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: controller?.signal,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') detail = data.detail
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
