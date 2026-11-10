import { useParams, Link } from 'react-router-dom'
import { decodeShareCode, type ShareCode } from '@/lib/code'
import { getLang } from '@/lib/languages'

export default function CodeViewer() {
  const { code } = useParams<{ code: string }>()
  const res = code ? decodeShareCode(code) : null

  if (!res || !res.ok) {
    const err = res ? res.error : 'bad_length'
    return (
      <div className="max-w-xl mx-auto py-16 px-6 space-y-4">
        <h1 className="display text-3xl text-vermilion">Invalid Share Code</h1>
        <p className="text-muted">
          The code <code className="font-mono bg-card px-2 py-0.5 border border-rule">{code}</code> could not be verified.
        </p>
        <p className="text-sm">
          Reason: <strong className="font-mono">{err === 'bad_crc' ? 'Checksum mismatch (single-character typo detected)' : err}</strong>
        </p>
        <div className="pt-4">
          <Link to="/try" className="btn no-underline">
            Go to Live Console
          </Link>
        </div>
      </div>
    )
  }

  const sc: ShareCode = res.code
  const langInfo = getLang(sc.langCode)

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 space-y-8">
      <header className="border-b border-rule pb-4">
        <span className="font-mono text-xs uppercase px-2 py-0.5 border border-rule bg-card">
          Awaaz Emergency Fact Packet · v{sc.version}
        </span>
        <h1 className="display mt-3 text-3xl">Verified Share Code</h1>
        <div className="font-mono text-sm mt-1 text-muted">
          Language: <strong>{langInfo?.nameEn || sc.langCode}</strong> ({langInfo?.nameNative})
        </div>
      </header>

      <div className="p-6 border border-rule bg-card space-y-4 font-mono">
        <div>
          <span className="text-xs text-muted block mb-1">PLACES</span>
          {sc.facts.places.length ? sc.facts.places.join(', ') : <span className="text-muted">None</span>}
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">NUMBERS & UNITS</span>
          {sc.facts.numbers.length ? (
            sc.facts.numbers.map((n: { value: number; unit: string }, i: number) => (
              <span key={i} className="inline-block mr-3">
                {n.value} {n.unit}
              </span>
            ))
          ) : (
            <span className="text-muted">None</span>
          )}
        </div>

        <div>
          <span className="text-xs text-muted block mb-1">TIMES</span>
          {sc.facts.times.length ? (
            sc.facts.times.map((t: { hour: number; period: string }, i: number) => (
              <span key={i} className="inline-block mr-3">
                {t.hour} {t.period}
              </span>
            ))
          ) : (
            <span className="text-muted">None</span>
          )}
        </div>

        {sc.version === 2 && 'needs' in sc && (
          <div>
            <span className="text-xs text-muted block mb-1">CRITICAL NEEDS</span>
            {sc.needs.length ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {sc.needs.map((nd: string) => (
                  <span key={nd} className="px-2 py-0.5 bg-vermilion/15 text-vermilion border border-vermilion text-xs rounded">
                    {nd}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted">None</span>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Link to="/try" className="btn no-underline">
          Open in Live Console
        </Link>
        <Link to="/" className="btn btn-ghost no-underline">
          Return to Story
        </Link>
      </div>
    </div>
  )
}
