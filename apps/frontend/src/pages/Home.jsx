import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { productsApi } from '../services/api';
import styles from './Home.module.css';

export function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    productsApi
      .list()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Carregando produtos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Não foi possível carregar os produtos. {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroLabel}>Lançamento</span>
          <h2 className={styles.heroTitle}>Oversized</h2>
          <p className={styles.heroSubtitle}>
            Estilo, propósito e identidade em cada detalhe.
          </p>
          <Link to="#produtos" className={styles.heroCta}>
            Confira
          </Link>
        </div>
      </section>

      <section id="produtos" className={styles.section}>
        <h2 className={styles.sectionTitle}>Lançamento Oversized</h2>
        {products.length === 0 ? (
          <p className={styles.empty}>Nenhum produto disponível no momento.</p>
        ) : (
          <ul className={styles.grid}>
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
        {products.length > 0 && (
          <div className={styles.ctaWrap}>
            <Link to="/carrinho" className={styles.cta}>
              Ver toda coleção
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
