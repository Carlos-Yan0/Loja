import { useCallback, useEffect, useMemo, useState } from 'react'
import { menuApi, uploadApi } from '../../services/api'
import styles from './AdminMenu.module.css'

const includesIgnoreCase = (values, target) =>
  values.some((entry) => entry.toLowerCase() === target.toLowerCase())

const createEmptyHomeSection = (index) => ({
  id: `home-section-${index + 1}`,
  enabled: false,
  type: 'CATEGORY',
  value: '',
  title: '',
})

const ensureFourSections = (sections = []) =>
  Array.from({ length: 4 }, (_, index) => ({
    ...createEmptyHomeSection(index),
    ...(sections[index] ?? {}),
    id: `home-section-${index + 1}`,
    enabled:
      sections[index]?.enabled !== false &&
      String(sections[index]?.value ?? '').trim().length > 0,
    type: sections[index]?.type === 'TAG' ? 'TAG' : 'CATEGORY',
    value: sections[index]?.value ?? '',
    title: sections[index]?.title ?? '',
  }))

const emptyBanner = {
  enabled: false,
  imageUrl: '',
  ctaEnabled: true,
  ctaTransparent: false,
  ctaLabel: 'Explorar agora',
  targetType: 'BESTSELLERS',
  targetValue: '',
}

export function AdminMenu() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [fixedItems, setFixedItems] = useState([])
  const [available, setAvailable] = useState({ categories: [], tags: [], products: [] })
  const [selected, setSelected] = useState({ categories: [], tags: [] })
  const [homeBanner, setHomeBanner] = useState(emptyBanner)
  const [homeSections, setHomeSections] = useState(() => ensureFourSections())
  const [bannerFile, setBannerFile] = useState(null)

  const bannerPreviewUrl = useMemo(
    () => (bannerFile ? URL.createObjectURL(bannerFile) : ''),
    [bannerFile]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const state = await menuApi.getAdmin()
      setFixedItems(state.fixedItems)
      setAvailable(state.available)
      setSelected({
        categories: state.selected.categories,
        tags: state.selected.tags,
      })
      setHomeBanner(state.selected.homeBanner ?? emptyBanner)
      setHomeSections(ensureFourSections(state.selected.homeSections))
      setBannerFile(null)
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel carregar as opcoes do menu.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(
    () => () => {
      if (bannerPreviewUrl) {
        URL.revokeObjectURL(bannerPreviewUrl)
      }
    },
    [bannerPreviewUrl]
  )

  const toggleValue = (group, value) => {
    setSelected((current) => {
      const values = current[group]
      const hasValue = includesIgnoreCase(values, value)

      return {
        ...current,
        [group]: hasValue
          ? values.filter((entry) => entry.toLowerCase() !== value.toLowerCase())
          : [...values, value],
      }
    })
  }

  const updateHomeSection = (index, patch) => {
    setHomeSections((current) =>
      current.map((section, sectionIndex) => {
        if (sectionIndex !== index) return section

        const nextSection = {
          ...section,
          ...patch,
        }

        if (patch.type && patch.type !== section.type) {
          nextSection.value = ''
        }

        return nextSection
      })
    )
  }

  const handleBannerFileChange = (event) => {
    const file = event.target.files?.[0] ?? null
    setBannerFile(file)
    event.target.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let nextHomeBanner = homeBanner

      if (bannerFile) {
        const uploadResult = await uploadApi.uploadBannerImage(bannerFile)
        nextHomeBanner = {
          ...homeBanner,
          imageUrl: uploadResult.imageUrl,
        }
      }

      const result = await menuApi.updateAdmin({
        categories: selected.categories,
        tags: selected.tags,
        homeBanner: nextHomeBanner,
        homeSections: homeSections
          .filter((section) => String(section.value ?? '').trim())
          .map((section) => ({
            enabled: section.enabled,
            type: section.type,
            value: section.value,
            title: section.title,
          })),
      })

      setAvailable(result.available)
      setSelected({
        categories: result.selected.categories,
        tags: result.selected.tags,
      })
      setHomeBanner(result.selected.homeBanner ?? emptyBanner)
      setHomeSections(ensureFourSections(result.selected.homeSections))
      setBannerFile(null)
      setToast('Menu e home atualizados com sucesso.')
      window.dispatchEvent(new Event('menu-config-updated'))
    } catch (requestError) {
      setToast(requestError.message || 'Nao foi possivel salvar o menu.')
    } finally {
      setSaving(false)
    }
  }

  const selectedCountLabel = useMemo(
    () =>
      `${selected.categories.length} categoria(s), ${selected.tags.length} tag(s) e ${homeSections.filter((section) => section.enabled && String(section.value ?? '').trim()).length} secao(oes) ativa(s) na home`,
    [homeSections, selected.categories.length, selected.tags.length]
  )

  const bannerTargetOptions = useMemo(() => {
    if (homeBanner.targetType === 'CATEGORY') return available.categories
    if (homeBanner.targetType === 'TAG') return available.tags
    if (homeBanner.targetType === 'PRODUCT') return available.products
    return []
  }, [available, homeBanner.targetType])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Menu da loja e home</h1>
          <p className={styles.pageSubtitle}>{selectedCountLabel}</p>
        </div>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Salvando...' : 'Salvar configuracoes'}
        </button>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}

      {loading && (
        <div className={styles.state}>
          <p>Carregando configuracoes...</p>
        </div>
      )}

      {!loading && error && (
        <div className={`${styles.state} ${styles.stateError}`}>
          <p>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Opcao fixa</h2>
            <p className={styles.cardHint}>Sempre exibida no menu principal.</p>
            <ul className={styles.fixedList}>
              {fixedItems.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Categorias</h2>
            <p className={styles.cardHint}>Selecione quais categorias devem aparecer no menu.</p>
            {available.categories.length === 0 ? (
              <p className={styles.empty}>Nenhuma categoria disponivel.</p>
            ) : (
              <ul className={styles.list}>
                {available.categories.map((category) => {
                  const checked = includesIgnoreCase(selected.categories, category)
                  return (
                    <li key={category}>
                      <label className={styles.option}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleValue('categories', category)}
                        />
                        <span>{category}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Tags</h2>
            <p className={styles.cardHint}>Selecione quais tags devem aparecer no menu.</p>
            {available.tags.length === 0 ? (
              <p className={styles.empty}>Nenhuma tag disponivel.</p>
            ) : (
              <ul className={styles.list}>
                {available.tags.map((tag) => {
                  const checked = includesIgnoreCase(selected.tags, tag)
                  return (
                    <li key={tag}>
                      <label className={styles.option}>
                        <input type="checkbox" checked={checked} onChange={() => toggleValue('tags', tag)} />
                        <span>{tag}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className={`${styles.card} ${styles.wideCard}`}>
            <h2 className={styles.cardTitle}>Banner da home (fundo + botao)</h2>
            <p className={styles.cardHint}>
              Banner entre o carrossel e as secoes. Defina imagem e destino (produto/categoria/tag/mais vendidas).
            </p>

            <label className={styles.optionInline}>
              <input
                type="checkbox"
                checked={homeBanner.enabled}
                onChange={(event) =>
                  setHomeBanner((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
              <span>Ativar banner na home</span>
            </label>

            <div className={styles.bannerOptionsRow}>
              <label className={styles.optionInline}>
                <input
                  type="checkbox"
                  checked={homeBanner.ctaEnabled}
                  onChange={(event) =>
                    setHomeBanner((current) => ({ ...current, ctaEnabled: event.target.checked }))
                  }
                />
                <span>Mostrar botao</span>
              </label>

              <label className={styles.optionInline}>
                <input
                  type="checkbox"
                  checked={homeBanner.ctaTransparent}
                  disabled={!homeBanner.ctaEnabled}
                  onChange={(event) =>
                    setHomeBanner((current) => ({
                      ...current,
                      ctaTransparent: event.target.checked,
                    }))
                  }
                />
                <span>Botao transparente</span>
              </label>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                Imagem de fundo
                <div className={styles.bannerUploadRow}>
                  <label className={styles.bannerUploadBtn}>
                    Selecionar imagem
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className={styles.bannerUploadInput}
                      onChange={handleBannerFileChange}
                    />
                  </label>
                  <span className={styles.bannerUploadHint}>
                    {bannerFile?.name ?? 'Nenhum arquivo novo selecionado'}
                  </span>
                </div>
                {homeBanner.imageUrl && (
                  <a
                    href={homeBanner.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.bannerCurrentLink}
                  >
                    Ver imagem atual
                  </a>
                )}
                {(bannerPreviewUrl || homeBanner.imageUrl) && (
                  <img
                    src={bannerPreviewUrl || homeBanner.imageUrl}
                    alt="Preview do banner da home"
                    className={styles.bannerPreview}
                  />
                )}
              </label>

              <label className={styles.field}>
                Texto do botao
                <input
                  type="text"
                  value={homeBanner.ctaLabel}
                  onChange={(event) =>
                    setHomeBanner((current) => ({ ...current, ctaLabel: event.target.value }))
                  }
                  placeholder="Explorar agora"
                />
              </label>

              <label className={styles.field}>
                Tipo de destino
                <select
                  value={homeBanner.targetType}
                  onChange={(event) =>
                    setHomeBanner((current) => ({
                      ...current,
                      targetType: event.target.value,
                      targetValue: '',
                    }))
                  }
                >
                  <option value="BESTSELLERS">Mais vendidas</option>
                  <option value="CATEGORY">Categoria</option>
                  <option value="TAG">Tag</option>
                  <option value="PRODUCT">Produto</option>
                </select>
              </label>

              {homeBanner.targetType !== 'BESTSELLERS' && (
                <label className={styles.field}>
                  Destino
                  {homeBanner.targetType === 'PRODUCT' ? (
                    <select
                      value={homeBanner.targetValue}
                      onChange={(event) =>
                        setHomeBanner((current) => ({ ...current, targetValue: event.target.value }))
                      }
                    >
                      <option value="">Selecione um produto</option>
                      {bannerTargetOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={homeBanner.targetValue}
                      onChange={(event) =>
                        setHomeBanner((current) => ({ ...current, targetValue: event.target.value }))
                      }
                    >
                      <option value="">Selecione</option>
                      {bannerTargetOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              )}
            </div>
          </section>

          <section className={`${styles.card} ${styles.wideCard}`}>
            <h2 className={styles.cardTitle}>Secoes da home (4 blocos)</h2>
            <p className={styles.cardHint}>
              Configure ate 4 blocos categoria/tag entre o banner e o rodape.
            </p>

            <div className={styles.sectionsGrid}>
              {homeSections.map((section, index) => {
                const options = section.type === 'TAG' ? available.tags : available.categories
                return (
                  <article key={section.id} className={styles.sectionCard}>
                    <div className={styles.sectionCardHeader}>
                      <h3>Secao {index + 1}</h3>
                      <button
                        type="button"
                        className={section.enabled ? styles.disableBtn : styles.enableBtn}
                        onClick={() => updateHomeSection(index, { enabled: !section.enabled })}
                      >
                        {section.enabled ? 'Desativar secao' : 'Ativar secao'}
                      </button>
                    </div>

                    <label className={styles.field}>
                      Tipo
                      <select
                        value={section.type}
                        disabled={!section.enabled}
                        onChange={(event) =>
                          updateHomeSection(index, { type: event.target.value })
                        }
                      >
                        <option value="CATEGORY">Categoria</option>
                        <option value="TAG">Tag</option>
                      </select>
                    </label>

                    <label className={styles.field}>
                      Valor
                      <select
                        value={section.value}
                        disabled={!section.enabled}
                        onChange={(event) =>
                          updateHomeSection(index, { value: event.target.value })
                        }
                      >
                        <option value="">Selecione</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      Titulo da secao (opcional)
                      <input
                        type="text"
                        value={section.title}
                        disabled={!section.enabled}
                        onChange={(event) =>
                          updateHomeSection(index, { title: event.target.value })
                        }
                        placeholder={section.value || 'Titulo exibido na home'}
                      />
                    </label>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
