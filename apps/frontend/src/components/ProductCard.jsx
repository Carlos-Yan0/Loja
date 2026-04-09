import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';
import styles from './ProductCard.module.css';

export function ProductCard({ product }) {
  const { addItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const imageList = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const primaryImage = imageList[0];
  const secondaryImage = imageList[1];
  const canSwapImage = Boolean(secondaryImage);
  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price);

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem(product, 1);
  };

  const activatePreview = () => {
    if (!canSwapImage) return;
    setIsHovered(true);
  };

  const deactivatePreview = () => {
    setIsHovered(false);
  };

  return (
    <article
      className={styles.card}
      onMouseEnter={activatePreview}
      onMouseLeave={deactivatePreview}
      onTouchStart={activatePreview}
      onTouchEnd={deactivatePreview}
      onTouchCancel={deactivatePreview}
      onFocus={activatePreview}
      onBlur={deactivatePreview}
    >
      <Link to={`/produto/${product.id}`} className={styles.link}>
        <div className={styles.imageWrap}>
          {primaryImage ? (
            <div className={styles.imageStack}>
              <img
                src={primaryImage}
                alt={product.name}
                className={`${styles.imagePrimary} ${isHovered && canSwapImage ? styles.imagePrimaryHidden : ''}`}
              />
              {canSwapImage ? (
                <img
                  src={secondaryImage}
                  alt=""
                  aria-hidden="true"
                  className={`${styles.imageSecondary} ${isHovered ? styles.imageSecondaryVisible : ''}`}
                />
              ) : null}
            </div>
          ) : (
            <div className={styles.placeholder}>Sem imagem</div>
          )}
        </div>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{priceFormatted}</p>
        <p className={styles.label}>Preço de fábrica</p>
      </Link>
      <button
        type="button"
        className={styles.addBtn}
        onClick={handleAddToCart}
        disabled={product.stock === 0}
      >
        Adicionar ao carrinho
      </button>
    </article>
  );
}
