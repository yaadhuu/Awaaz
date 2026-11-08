import { useTranslation } from 'react-i18next'
import { Waveform } from '@/components/Charts'
import { PageHead } from '@/components/Shell'
import { Await } from '@/components/States'
import { useBeds } from '@/lib/useData'

const base = import.meta.env.BASE_URL

const FONTS = [
  ['Fraunces', 'Undercase Type', 'SIL Open Font License 1.1'],
  ['Rozha One', 'Indian Type Foundry', 'SIL Open Font License 1.1'],
  ['Noto Serif Malayalam, Noto Serif Devanagari', 'Google', 'SIL Open Font License 1.1'],
  ['Tiro Devanagari Hindi', 'Tiro Typeworks', 'SIL Open Font License 1.1'],
  ['Anek (Latin, Malayalam, Devanagari)', 'Ek Type', 'SIL Open Font License 1.1'],
  ['IBM Plex Mono', 'IBM', 'SIL Open Font License 1.1'],
]

export default function Library() {
  const { t } = useTranslation()
  const beds = useBeds()
  return (
    <div className="space-y-12">
      <PageHead no="8" title={t('library.title')} lede={t('library.lede')} />
      <Await q={beds} isEmpty={(b) => b.length === 0}>
        {(b) => (
          <ul className="grid gap-6 md:grid-cols-2">
            {b.map((x) => (
              <li key={x.sha256} className="kasavu space-y-3 p-5" lang="en">
                <h2 className="text-lg font-semibold">{x.title}</h2>
                <Waveform peaks={x.peaks} label={`${x.title}, ${x.duration_s} s`} />
                <audio controls preload="none" src={`${base}${x.web_file}`} className="w-full" />
                <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">{t('common.source')}</dt>
                  <dd>
                    <a href={x.source_url}>{x.source}</a>
                  </dd>
                  <dt className="text-muted">{t('library.by')}</dt>
                  <dd>{x.author || '—'}</dd>
                  <dt className="text-muted">{t('library.licence')}</dt>
                  <dd>{x.licence_url ? <a href={x.licence_url}>{x.licence}</a> : x.licence}</dd>
                  <dt className="text-muted">{t('library.accessed')}</dt>
                  <dd className="num">{x.accessed}</dd>
                  <dt className="text-muted">sha256</dt>
                  <dd className="num break-all text-xs">{x.sha256}</dd>
                </dl>
                {x.description && <p className="text-sm text-muted">{x.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Await>
      <section aria-labelledby="fonts">
        <h2 id="fonts" className="display text-3xl">
          {t('library.fonts')}
        </h2>
        <table className="table-ruled mt-3 max-w-3xl" lang="en">
          <tbody>
            {FONTS.map(([name, who, lic]) => (
              <tr key={name}>
                <th scope="row">{name}</th>
                <td>{who}</td>
                <td>{lic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
