import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { menuApi } from '../services/api';
import styles from './Header.module.css';

const toMenuPath = (item) => {
  if (item.type === 'BESTSELLERS') {
    return '/buscar?sort=bestsellers';
  }

  if (item.type === 'CATEGORY' && item.value) {
    return `/buscar?category=${encodeURIComponent(item.value)}`;
  }

  if (item.type === 'TAG' && item.value) {
    return `/buscar?tag=${encodeURIComponent(item.value)}`;
  }

  return '';
};

const normalizeMenuLinks = (items) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      to: toMenuPath(item),
      label: String(item.label ?? '').trim(),
    }))
    .filter((item) => item.to && item.label);

const FALLBACK_LINKS = [
  { to: '/buscar?sort=bestsellers', label: 'Mais vendidas' },
  { to: '/buscar?category=Feminino', label: 'Feminino' },
  { to: '/buscar?category=Masculino', label: 'Masculino' },
  { to: '/buscar?category=Oversized', label: 'Oversized' },
  { to: '/buscar?tag=Lancamento', label: 'Lancamento' },
];

export function Header() {
  const { isAuthenticated, logout, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuLinks, setMenuLinks] = useState(FALLBACK_LINKS);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(query ? `/buscar?q=${encodeURIComponent(query)}` : '/buscar');
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
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

  useEffect(() => {
    let active = true;

    const refreshMenu = async () => {
      try {
        const payload = await menuApi.getPublic();
        if (!active) return;

        const normalized = normalizeMenuLinks(payload.items);
        setMenuLinks(normalized.length > 0 ? normalized : FALLBACK_LINKS);
      } catch {
        if (active) {
          setMenuLinks(FALLBACK_LINKS);
        }
      }
    };

    queueMicrotask(refreshMenu);

    const handleMenuUpdated = () => {
      void refreshMenu();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshMenu();
      }
    };

    window.addEventListener('menu-config-updated', handleMenuUpdated);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.removeEventListener('menu-config-updated', handleMenuUpdated);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const navLinks = useMemo(
    () => [{ to: '/', label: 'Inicio' }, ...menuLinks, { to: '/carrinho', label: 'Carrinho' }],
    [menuLinks]
  );

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
            <span className={styles.menuIcon} aria-hidden>
              {'\u2630'}
            </span>
          </button>

          <form className={styles.search} onSubmit={handleSearchSubmit}>
            <span className={styles.searchIcon} aria-hidden>
              {'\u{1F50D}'}
            </span>
            <input
              type="search"
              placeholder="O que voce esta buscando?"
              className={styles.searchInput}
              aria-label="Buscar produtos"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </form>

          <Link to="/" className={styles.logo}>
            <span className={styles.logoMain}>GF</span>
            <span className={styles.logoSmall}>STORE</span>
          </Link>

          <div className={styles.actions}>
            {isAuthenticated ? (
              isAdmin ? (
                <>
                  <Link to="/admin" className={styles.linkBtn}>
                    Painel admin
                  </Link>
                  <button type="button" onClick={handleLogout} className={styles.linkBtn}>
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link to="/meus-pedidos" className={styles.linkBtn}>
                    Meus pedidos
                  </Link>
                  <button type="button" onClick={handleLogout} className={styles.linkBtn}>
                    Sair
                  </button>
                </>
              )
            ) : (
              <Link to="/login" className={styles.linkBtn}>
                Login &gt;
              </Link>
            )}

            <Link to="/carrinho" className={styles.cart} aria-label="Carrinho">
              <span className={styles.cartIcon}>{'\u{1F6D2}'}</span>
              <span className={styles.cartCount}>{totalItems}</span>
            </Link>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Navegacao principal">
          {navLinks.map(({ to, label }) => (
            <Link key={`${to}-${label}`} to={to}>
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

      <aside className={styles.sidebar} data-open={sidebarOpen} aria-label="Menu de navegacao">
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>Menu</span>
          <button
            type="button"
            className={styles.sidebarClose}
            onClick={closeSidebar}
            aria-label="Fechar menu"
          >
            {'\u2715'}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {navLinks.map(({ to, label }) => (
            <Link key={`${to}-${label}-mobile`} to={to} className={styles.sidebarLink} onClick={closeSidebar}>
              {label}
            </Link>
          ))}

          {!isAdmin && isAuthenticated && (
            <Link to="/meus-pedidos" className={styles.sidebarLink} onClick={closeSidebar}>
              Meus pedidos
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
