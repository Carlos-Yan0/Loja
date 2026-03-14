import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import styles from './Header.module.css';

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/#produtos', label: 'Mais vendidos' },
  { to: '/?categoria=feminino', label: 'Feminino' },
  { to: '/?categoria=masculino', label: 'Masculino' },
  { to: '/?categoria=oversized', label: 'Oversized' },
  { to: '/?categoria=lancamento', label: 'Lançamento' },
  { to: '/carrinho', label: 'Carrinho' },
];

export function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    if (sidebarOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.top}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
          >
            <span className={styles.menuIcon} aria-hidden>☰</span>
          </button>
          <div className={styles.search}>
            <span className={styles.searchIcon} aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="O que você está buscando?"
              className={styles.searchInput}
              aria-label="Buscar produtos"
            />
          </div>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMain}>GF</span>
            <span className={styles.logoSmall}>STORE</span>
          </Link>
          <div className={styles.actions}>
            {isAuthenticated ? (
              <button type="button" onClick={handleLogout} className={styles.linkBtn}>
                Sair
              </button>
            ) : (
              <Link to="/login" className={styles.linkBtn}>
                Login &gt;
              </Link>
            )}
            <Link to="/carrinho" className={styles.cart} aria-label="Carrinho">
              <span className={styles.cartIcon}>🛒</span>
              <span className={styles.cartCount}>{totalItems}</span>
            </Link>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Navegação principal">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={label} to={to}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div
        className={styles.sidebarOverlay}
        data-open={sidebarOpen}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <aside
        className={styles.sidebar}
        data-open={sidebarOpen}
        aria-label="Menu de navegação"
      >
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Menu</span>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={closeSidebar}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={label}
              to={to}
              className={styles.sidebarLink}
              onClick={closeSidebar}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
