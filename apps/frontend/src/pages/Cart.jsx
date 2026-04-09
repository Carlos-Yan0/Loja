import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';
import styles from './Cart.module.css';

const formatPrice = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export function Cart() {
  const { items, totalPrice, updateQuantity, removeItem, notice, clearNotice } = useCart();

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => clearNotice(), 2500);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>Seu carrinho está vazio</h2>
        <p className={styles.emptyText}>
          Adicione produtos na página inicial e volte aqui para finalizar.
        </p>
        <Link to="/" className={styles.emptyCta}>
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {notice && <div className={styles.toast}>{notice}</div>}
      <h1 className={styles.title}>Carrinho</h1>
      <div className={styles.content}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.productId} className={styles.item}>
              <div className={styles.itemImage}>
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <span>Sem imagem</span>
                )}
              </div>
              <div className={styles.itemInfo}>
                <h3 className={styles.itemName}>{item.name}</h3>
                <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                <p className={styles.stockInfo}>Disponível: {item.stock}</p>
                <div className={styles.itemActions}>
                  <div className={styles.quantity}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      aria-label="Aumentar quantidade"
                      disabled={item.quantity >= item.stock}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => removeItem(item.productId)}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <p className={styles.itemSubtotal}>
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>Resumo</h2>
          <p className={styles.summaryRow}>
            <span>Subtotal</span>
            <span>{formatPrice(totalPrice)}</span>
          </p>
          <p className={styles.summaryRow}>
            <span>Frete</span>
            <span>Calculado no checkout</span>
          </p>
          <p className={styles.summaryTotal}>
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </p>
          <Link to="/checkout" className={styles.checkoutBtn}>
            Ir para checkout
          </Link>
          <Link to="/" className={styles.keepShopping}>
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
