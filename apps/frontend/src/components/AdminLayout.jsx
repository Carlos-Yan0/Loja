import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLayout.module.css';

const NAV_ITEMS = [
  { to: '/admin/produtos', icon: '📦', label: 'Produtos' },
  { to: '/admin/pedidos',  icon: '📋', label: 'Pedidos'  },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    if (drawerOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className={styles.layout}>

      {/* ── Mobile top bar (hidden on desktop) ── */}
      <header className={styles.topBar}>
        <div className={styles.topBarBrand}>
          <span className={styles.brandMain}>GF</span>
          <span className={styles.brandSub}>Admin</span>
        </div>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menu"
        >
          ☰
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      <div
        className={`${styles.drawerOverlay} ${drawerOpen ? styles.drawerOverlayOpen : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile drawer ── */}
      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`} role="dialog" aria-modal="true">
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Menu Admin</span>
          <button type="button" className={styles.drawerClose} onClick={() => setDrawerOpen(false)} aria-label="Fechar">✕</button>
        </div>
        <nav className={styles.drawerNav}>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.drawerFooter}>
          <a href="/" className={styles.drawerStoreLink}>← Voltar à loja</a>
          <button type="button" onClick={handleLogout} className={styles.drawerLogout}>Sair</button>
        </div>
      </div>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMain}>GF</span>
          <span className={styles.brandSub}>Admin</span>
        </div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <a href="/" className={styles.storeLink}>
            <span>←</span>
            <span>Ir para a loja</span>
          </a>
          <button type="button" onClick={handleLogout} className={styles.logoutBtn}>Sair</button>
        </div>
      </aside>

      {/* ── Page content ── */}
      <div className={styles.content}>
        <Outlet />
      </div>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav className={styles.bottomNav} aria-label="Navegação admin">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `${styles.bottomNavLink} ${isActive ? styles.bottomNavActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{icon}</span>
            <span className={styles.bottomNavLabel}>{label}</span>
          </NavLink>
        ))}
        <button type="button" className={styles.bottomNavLink} onClick={handleLogout}>
          <span className={styles.bottomNavIcon}>🚪</span>
          <span className={styles.bottomNavLabel}>Sair</span>
        </button>
      </nav>

    </div>
  );
}
