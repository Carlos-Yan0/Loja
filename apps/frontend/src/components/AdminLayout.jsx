import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/admin/produtos', icon: 'P', label: 'Produtos' },
  { to: '/admin/pedidos', icon: 'O', label: 'Pedidos' },
  { to: '/admin/usuarios', icon: 'U', label: 'Usuarios' },
  { to: '/admin/menu', icon: 'M', label: 'Menu' },
]

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
      }
    }

    if (drawerOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className={styles.layout}>
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
          =
        </button>
      </header>

      <div
        className={`${styles.drawerOverlay} ${drawerOpen ? styles.drawerOverlayOpen : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <div className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`} role="dialog" aria-modal="true">
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>Menu Admin</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar"
          >
            X
          </button>
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
          <a href="/" className={styles.drawerStoreLink}>
            Voltar para a loja
          </a>
          <button type="button" onClick={handleLogout} className={styles.drawerLogout}>
            Sair
          </button>
        </div>
      </div>

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
            <span>&lt;</span>
            <span>Ir para a loja</span>
          </a>
          <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </aside>

      <div className={styles.content}>
        <Outlet />
      </div>

      <nav className={styles.bottomNav} aria-label="Navegacao admin">
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
          <span className={styles.bottomNavIcon}>X</span>
          <span className={styles.bottomNavLabel}>Sair</span>
        </button>
      </nav>
    </div>
  )
}
