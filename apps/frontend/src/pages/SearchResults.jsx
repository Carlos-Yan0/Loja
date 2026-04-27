import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { productsApi } from '../services/api';
import styles from './SearchResults.module.css';

const readQueryValue = (searchParams, keys) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (String(value ?? '').trim()) {
      return value.trim();
    }
  }

  return '';
};

export function SearchResults() {
  const [searchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      search: readQueryValue(searchParams, ['q', 'search', 'busca']),
      category: readQueryValue(searchParams, ['category', 'categoria']),
      tag: readQueryValue(searchParams, ['tag']),
      sort: readQueryValue(searchParams, ['sort']),
    }),
    [searchParams]
  );

  const requestKey = useMemo(() => JSON.stringify(filters), [filters]);
  const [state, setState] = useState(() => ({
    key: requestKey,
    products: [],
    error: '',
    loading: true,
  }));

  useEffect(() => {
    let active = true;

    productsApi
      .list(filters)
      .then((products) => {
        if (!active) return;
        setState({
          key: requestKey,
          products,
          error: '',
          loading: false,
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setState({
          key: requestKey,
          products: [],
          error: requestError.message || 'Nao foi possivel buscar produtos.',
          loading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [filters, requestKey]);

  const loading = state.key !== requestKey || state.loading;
  const products = state.key === requestKey ? state.products : [];
  const error = state.key === requestKey ? state.error : '';

  const title = useMemo(() => {
    if (filters.sort === 'bestsellers') return 'Mais vendidas';
    if (filters.search) return `Busca por "${filters.search}"`;
    if (filters.tag) return `Produtos com a tag "${filters.tag}"`;
    if (filters.category) return `Categoria: ${filters.category}`;
    return 'Todos os produtos';
  }, [filters]);

  const subtitle = useMemo(() => {
    if (loading) return 'Buscando produtos...';
    return `${products.length} resultado${products.length !== 1 ? 's' : ''}`;
  }, [loading, products.length]);

  const emptyMessage = useMemo(() => {
    if (filters.sort === 'bestsellers') {
      return 'Ainda nao ha produtos vendidos.';
    }

    return 'Nenhum produto encontrado para esse filtro.';
  }, [filters.sort]);

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>

      {loading ? (
        <div className={styles.loading}>
          <p>Carregando...</p>
        </div>
      ) : products.length === 0 ? (
        <div className={styles.empty}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
