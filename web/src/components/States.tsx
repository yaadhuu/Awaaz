import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SourceError } from '@/data/source'

export function Loading() {
  const { t } = useTranslation()
  return (
    <p role="status" className="py-6 text-muted">
      {t('common.loading')}
    </p>
  )
}

export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useTranslation()
  const offline = (error instanceof SourceError && error.status === 0) || !navigator.onLine
  return (
    <div role="alert" className="my-4 border-l-4 border-vermilion bg-card px-4 py-3">
      <p>{offline ? t('common.offline') : t('common.error')}</p>
      {error instanceof SourceError && error.status > 0 && error.message !== 'replay' && (
        <p className="num mt-1 text-sm text-muted">
          {error.status} · {error.message}
        </p>
      )}
      {retry && (
        <button type="button" className="btn btn-ghost mt-2" onClick={retry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  return <p className="py-6 text-muted">{children ?? t('common.empty')}</p>
}

/** Render a react-query result with loading, error and empty states. */
export function Await<T>({
  q,
  children,
  isEmpty,
}: {
  q: { data: T | undefined; isPending: boolean; error: unknown; refetch: () => unknown }
  children: (data: T) => ReactNode
  isEmpty?: (data: T) => boolean
}) {
  if (q.isPending) return <Loading />
  if (q.error || q.data === undefined) return <Failure error={q.error} retry={() => void q.refetch()} />
  if (isEmpty?.(q.data)) return <Empty />
  return <>{children(q.data)}</>
}
