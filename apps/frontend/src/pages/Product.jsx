import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { productsApi } from '../services/api';
import styles from './Product.module.css';

const formatPrice = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export function Product() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    productsApi
      .get(id)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <p>Produto não encontrado. {error}</p>
        <Link to="/">Voltar à loja</Link>
      </div>
    );
  }

  const image = product.images?.[0];

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>← Voltar</Link>
      <article className={styles.card}>
        <div className={styles.imageWrap}>
          {image ? (
            <img src={image} alt={product.name} className={styles.image} />
          ) : (
            <div className={styles.placeholder}>Sem imagem</div>
          )}
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>{product.name}</h1>
          <p className={styles.price}>{formatPrice(product.price)}</p>
          <p className={styles.label}>Preço de fábrica</p>
          {product.category && (
            <p className={styles.category}>Categoria: {product.category}</p>
          )}
          <div className={styles.quantity}>
            <label>
              Quantidade
              <input
                type="number"
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
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
            {added ? 'Adicionado ✓' : 'Adicionar ao carrinho'}
          </button>
        </div>
      </article>
    </div>
  );
}
