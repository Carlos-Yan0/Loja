import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import styles from './ProductCard.module.css';

export function ProductCard({ product }) {
  const { addItem } = useCart();
  const image = product.images?.[0];
  const priceFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(product.price);

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem(product, 1);
  };

  return (
    <article className={styles.card}>
      <Link to={`/produto/${product.id}`} className={styles.link}>
        <div className={styles.imageWrap}>
          {image ? (
            <img src={image} alt={product.name} className={styles.image} />
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
