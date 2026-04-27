import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { menuApi, productsApi } from '../services/api'
import styles from './Home.module.css'

const readParam = (searchParams, keys) => {
  for (const key of keys) {
    const value = searchParams.get(key)
    if (String(value ?? '').trim()) {
      return value.trim()
    }
  }

  return ''
}

const toSectionLink = (section) =>
  section.type === 'TAG'
    ? `/buscar?tag=${encodeURIComponent(section.value)}`
    : `/buscar?category=${encodeURIComponent(section.value)}`

const toBannerLink = (banner) => {
  if (!banner) return ''
  if (banner.targetType === 'BESTSELLERS') return '/buscar?sort=bestsellers'
  if (banner.targetType === 'CATEGORY' && banner.targetValue) {
    return `/buscar?category=${encodeURIComponent(banner.targetValue)}`
  }
  if (banner.targetType === 'TAG' && banner.targetValue) {
    return `/buscar?tag=${encodeURIComponent(banner.targetValue)}`
  }
  if (banner.targetType === 'PRODUCT' && banner.targetValue) {
    return `/produto/${encodeURIComponent(banner.targetValue)}`
  }
  return ''
}

const defaultHomeBanner = {
  enabled: false,
  imageUrl: '',
  ctaEnabled: true,
  ctaTransparent: false,
  ctaLabel: 'Ver colecao',
  targetType: 'BESTSELLERS',
  targetValue: '',
}

export function Home() {
  const [searchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      category: readParam(searchParams, ['category', 'categoria']),
      tag: readParam(searchParams, ['tag']),
      search: readParam(searchParams, ['q', 'search', 'busca']),
      sort: readParam(searchParams, ['sort']),
    }),
    [searchParams]
  )

  const hasActiveFilters = Boolean(filters.category || filters.tag || filters.search || filters.sort)
  const requestKey = useMemo(() => JSON.stringify({ filters, hasActiveFilters }), [filters, hasActiveFilters])
  const [state, setState] = useState(() => ({
    key: requestKey,
    loading: true,
    error: '',
    products: [],
    homeBanner: {
      ...defaultHomeBanner,
    },
    homeSections: [],
  }))

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        if (hasActiveFilters) {
          const products = await productsApi.list(filters)
          if (!active) return

          setState({
            key: requestKey,
            loading: false,
            error: '',
            products,
            homeBanner: defaultHomeBanner,
            homeSections: [],
          })
          return
        }

        const menu = await menuApi.getPublic()
        const sections = Array.isArray(menu.home?.sections)
          ? menu.home.sections.filter((section) => section.enabled && String(section.value ?? '').trim()).slice(0, 4)
          : []
        const sectionsWithProducts = await Promise.all(
          sections.map(async (section) => {
            const sectionFilters = section.type === 'TAG' ? { tag: section.value } : { category: section.value }
            const products = await productsApi.list(sectionFilters)
            return {
              ...section,
              products: products.slice(0, 8),
              link: toSectionLink(section),
            }
          })
        )

        if (!active) return
        setState({
          key: requestKey,
          loading: false,
          error: '',
          products: [],
          homeBanner: menu.home?.banner ?? defaultHomeBanner,
          homeSections: sectionsWithProducts,
        })
      } catch (requestError) {
        if (!active) return
        setState({
          key: requestKey,
          loading: false,
          error: requestError.message || 'Nao foi possivel carregar a home.',
          products: [],
          homeBanner: defaultHomeBanner,
          homeSections: [],
        })
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [filters, hasActiveFilters, requestKey])

  const loading = state.key !== requestKey || state.loading
  const bannerLink = toBannerLink(state.homeBanner)
  const sectionTitle = useMemo(() => {
    if (filters.sort === 'bestsellers') return 'Mais vendidas'
    if (filters.search) return `Resultados para "${filters.search}"`
    if (filters.tag) return `Tag: ${filters.tag}`
    if (filters.category) return `Categoria: ${filters.category}`
    return 'Lancamentos da loja'
  }, [filters])

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Carregando produtos...</p>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className={styles.error}>
        <p>Nao foi possivel carregar os produtos. {state.error}</p>
      </div>
    )
  }

  if (hasActiveFilters) {
    return (
      <div className={styles.page}>
        <section id="produtos" className={styles.section}>
          <h2 className={styles.resultsTitle}>{sectionTitle}</h2>
          {state.products.length === 0 ? (
            <p className={styles.empty}>Nenhum produto disponivel para esse filtro.</p>
          ) : (
            <ul className={styles.grid}>
              {state.products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {state.homeBanner.enabled && state.homeBanner.imageUrl && bannerLink && (
        <section className={styles.promoBanner}>
          <img src={state.homeBanner.imageUrl} alt="" className={styles.promoImage} loading="lazy" />
          <div className={styles.promoOverlay} />
          <div className={styles.promoContent}>
            {state.homeBanner.ctaEnabled && (
              <Link
                to={bannerLink}
                className={`${styles.promoBtn} ${
                  state.homeBanner.ctaTransparent ? styles.promoBtnTransparent : ''
                }`}
              >
                {state.homeBanner.ctaLabel || 'Ver colecao'}
              </Link>
            )}
          </div>
        </section>
      )}

      <div className={styles.sectionsStack}>
        {state.homeSections.map((section) => (
          <section key={section.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title || section.value}</h2>

            {section.products.length === 0 ? (
              <p className={styles.empty}>Nenhum produto disponivel nesta secao.</p>
            ) : (
              <>
                <ul className={styles.grid}>
                  {section.products.slice(0, 4).map((product) => (
                    <li key={`${section.id}-${product.id}`}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
                <div className={styles.sectionFooter}>
                  <Link to={section.link} className={styles.sectionCta}>
                    Ver toda colecao
                  </Link>
                </div>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
