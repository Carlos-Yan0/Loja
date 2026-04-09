import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../context/useCart'
import { productsApi } from '../services/api'
import { formatPrice } from '../utils/format'
import styles from './Product.module.css'

export function Product() {
  const { id } = useParams()

  if (!id) {
    return null
  }

  return <ProductDetails key={id} productId={id} />
}

function ProductDetails({ productId }) {
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    productsApi
      .get(productId)
      .then((response) => {
        if (cancelled) return
        setProduct(response)
        setActiveImageIndex(0)
        setError(null)
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  const images = useMemo(() => (Array.isArray(product?.images) ? product.images : []), [product])
  const activeImage = images[activeImageIndex] ?? null

  const handleAddToCart = () => {
    if (!product) return

    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const goToPreviousImage = () => {
    if (images.length <= 1) return
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1))
  }

  const goToNextImage = () => {
    if (images.length <= 1) return
    setActiveImageIndex((current) => (current === images.length - 1 ? 0 : current + 1))
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <p>Produto nao encontrado. {error}</p>
        <Link to="/">Voltar para a loja</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        &lt; Voltar
      </Link>
      <article className={styles.card}>
        <div className={styles.mediaColumn}>
          <div className={styles.imageWrap}>
            {activeImage ? (
              <img src={activeImage} alt={product.name} className={styles.image} />
            ) : (
              <div className={styles.placeholder}>Sem imagem</div>
            )}

            {images.length > 1 && (
              <>
                <button type="button" className={styles.galleryNavLeft} onClick={goToPreviousImage}>
                  &lt;
                </button>
                <button type="button" className={styles.galleryNavRight} onClick={goToNextImage}>
                  &gt;
                </button>
                <div className={styles.galleryCounter}>
                  {activeImageIndex + 1}/{images.length}
                </div>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className={styles.thumbnailRow}>
              {images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  className={`${styles.thumbnailBtn} ${
                    index === activeImageIndex ? styles.thumbnailBtnActive : ''
                  }`}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className={styles.thumbnail} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.name}>{product.name}</h1>
          <p className={styles.price}>{formatPrice(product.price)}</p>
          <p className={styles.label}>Preco de fabrica</p>
          {product.category && (
            <p className={styles.category}>
              Categoria:{' '}
              <Link to={`/buscar?category=${encodeURIComponent(product.category)}`}>
                {product.category}
              </Link>
            </p>
          )}
          {product.tags.length > 0 && (
            <ul className={styles.tags}>
              {product.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  <Link to={`/buscar?tag=${encodeURIComponent(tag)}`}>{tag}</Link>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.stock}>Estoque disponivel: {product.stock}</p>
          <div className={styles.quantity}>
            <label>
              Quantidade
              <input
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(event) => {
                  const nextQuantity = Number(event.target.value) || 1
                  setQuantity(Math.max(1, Math.min(nextQuantity, product.stock || 1)))
                }}
                className={styles.qtyInput}
              />
            </label>
          </div>
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            {added ? 'Adicionado com sucesso' : 'Adicionar ao carrinho'}
          </button>
        </div>
      </article>
    </div>
  )
}
