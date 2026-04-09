import { useEffect, useMemo, useState } from 'react'
import { validateProductForm } from '../utils/validation'
import { formatPrice } from '../utils/format'
import styles from './ProductForm.module.css'

const EMPTY_FORM = {
  name: '',
  price: '',
  category: '',
  tags: '',
  stock: '',
  existingImages: [],
  newFiles: [],
}

const toForm = (product) => {
  if (!product) {
    return EMPTY_FORM
  }

  return {
    name: product.name ?? '',
    price: product.price != null ? String(product.price) : '',
    category: product.category ?? '',
    tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
    stock: product.stock != null ? String(product.stock) : '',
    existingImages: Array.isArray(product.images) ? product.images : [],
    newFiles: [],
  }
}

export function ProductForm({ isOpen, product, onSave, onClose, loading }) {
  if (!isOpen) {
    return null
  }

  return (
    <ProductFormDialog
      key={product?.id ?? 'new'}
      product={product}
      onSave={onSave}
      onClose={onClose}
      loading={loading}
    />
  )
}

function ProductFormDialog({ product, onSave, onClose, loading }) {
  const isEdit = Boolean(product)
  const [form, setForm] = useState(() => toForm(product))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const filePreviews = useMemo(
    () =>
      form.newFiles.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}`,
        url: URL.createObjectURL(file),
        file,
      })),
    [form.newFiles]
  )

  useEffect(
    () => () => {
      for (const preview of filePreviews) {
        URL.revokeObjectURL(preview.url)
      }
    },
    [filePreviews]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleFilesChange = (event) => {
    const selectedFiles = Array.from(event.target.files ?? [])

    if (selectedFiles.length === 0) {
      return
    }

    setForm((current) => ({
      ...current,
      newFiles: [...current.newFiles, ...selectedFiles].slice(0, 10),
    }))
    setErrors((current) => ({ ...current, images: undefined }))
    event.target.value = ''
  }

  const removeExistingImage = (imageUrl) => {
    setForm((current) => ({
      ...current,
      existingImages: current.existingImages.filter((entry) => entry !== imageUrl),
    }))
  }

  const removeNewFile = (previewKey) => {
    setForm((current) => ({
      ...current,
      newFiles: current.newFiles.filter(
        (file) => `${file.name}-${file.size}-${file.lastModified}` !== previewKey
      ),
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const result = validateProductForm(form)
    setErrors(result.errors)

    if (!result.isValid) {
      return
    }

    onSave({
      ...result.payload,
      newFiles: form.newFiles,
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <div className={styles.header}>
          <h2 id="form-title" className={styles.title}>
            {isEdit ? 'Editar produto' : 'Novo produto'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              Nome do produto
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Camiseta Oversized Preta"
                className={styles.input}
                required
              />
              {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
            </label>

            <label className={styles.label}>
              Preco (R$)
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={styles.input}
                required
              />
              {form.price && !errors.price && <span className={styles.helperText}>{formatPrice(form.price)}</span>}
              {errors.price && <span className={styles.fieldError}>{errors.price}</span>}
            </label>

            <label className={styles.label}>
              Estoque
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="0"
                min="0"
                className={styles.input}
                required
              />
              {errors.stock && <span className={styles.fieldError}>{errors.stock}</span>}
            </label>

            <label className={styles.label}>
              Categoria
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Ex: oversized, feminino..."
                className={styles.input}
                required
              />
              {errors.category && <span className={styles.fieldError}>{errors.category}</span>}
            </label>

            <label className={styles.label}>
              Tags <span className={styles.optional}>(separe por virgula)</span>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="Ex: lancamento, promocao"
                className={styles.input}
              />
              {errors.tags && <span className={styles.fieldError}>{errors.tags}</span>}
            </label>
          </div>

          <section className={styles.mediaSection}>
            <div className={styles.mediaHeader}>
              <div>
                <h3 className={styles.mediaTitle}>Imagens do produto</h3>
                <p className={styles.mediaHint}>
                  O produto pode ter ate 10 imagens. Novas imagens serao enviadas para o backend.
                </p>
              </div>
              <label className={styles.uploadBtn}>
                Selecionar imagens
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  onChange={handleFilesChange}
                  className={styles.fileInput}
                />
              </label>
            </div>

            {errors.images && <p className={styles.error}>{errors.images}</p>}

            <div className={styles.imageGrid}>
              {form.existingImages.map((imageUrl) => (
                <figure key={imageUrl} className={styles.imageCard}>
                  <img src={imageUrl} alt={form.name || 'Imagem do produto'} className={styles.imagePreview} />
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={() => removeExistingImage(imageUrl)}
                  >
                    Remover
                  </button>
                </figure>
              ))}

              {filePreviews.map((preview) => (
                <figure key={preview.key} className={styles.imageCard}>
                  <img src={preview.url} alt={preview.file.name} className={styles.imagePreview} />
                  <figcaption className={styles.imageCaption}>{preview.file.name}</figcaption>
                  <button
                    type="button"
                    className={styles.removeImageBtn}
                    onClick={() => removeNewFile(preview.key)}
                  >
                    Remover
                  </button>
                </figure>
              ))}

              {form.existingImages.length === 0 && filePreviews.length === 0 && (
                <div className={styles.emptyMedia}>Nenhuma imagem selecionada ainda.</div>
              )}
            </div>
          </section>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alteracoes' : 'Criar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
