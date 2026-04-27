import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useAuth } from './context/useAuth';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Product } from './pages/Product';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Register } from './pages/Register';
import { SearchResults } from './pages/SearchResults';
import { MyOrders } from './pages/MyOrders';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminMenu } from './pages/admin/AdminMenu';

function CheckoutReturnRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const hasCheckoutReturn = params.get('payment') || params.get('orderId');

  useEffect(() => {
    if (!hasCheckoutReturn) return;
    if (location.pathname === '/checkout') return;
    navigate(`/checkout${location.search}`, { replace: true });
  }, [hasCheckoutReturn, location.pathname, location.search, navigate]);

  return null;
}

function RequireAdmin(){
  const { isAuthenticated, isAdmin, loading  } = useAuth();
  if(loading) return null;
  if(!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <CheckoutReturnRedirect />
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ── Loja ── */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="produto/:id" element={<Product />} />
              <Route path="carrinho" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="buscar" element={<SearchResults />} />
              <Route path="meus-pedidos" element={<MyOrders />} />
              <Route path="login" element={<Login />} />
              <Route path="registro" element={<Register />} />
            </Route>

            {/* ── Admin ── */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/produtos" replace />} />
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="usuarios" element={<AdminUsers />} />
                <Route path="menu" element={<AdminMenu />} />
              </Route>
            </Route>
            

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
