import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <section className="py-10">
      <p className="num text-vermilion">404</p>
      <h1 className="display mt-2 text-[clamp(2.4rem,7vw,4.5rem)]">{t('notFound.title')}</h1>
      <div className="mt-3 h-[3px] w-24 border-y border-gold" aria-hidden />
      <p className="mt-4 text-lg">{t('notFound.body')}</p>
      <Link to="/" className="btn mt-6 no-underline">
        {t('notFound.home')}
      </Link>
    </section>
  )
}
