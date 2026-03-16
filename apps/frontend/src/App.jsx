import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Product } from './pages/Product';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Register } from './pages/Register';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';

function RequireAdmin(){
  const { isAuthenticated, isAdmin, loading  } = useAuth();
  if(loading) return null;
  if(!isAuthenticated || !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ── Loja ── */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="produto/:id" element={<Product />} />
              <Route path="carrinho" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="login" element={<Login />} />
              <Route path="registro" element={<Register />} />
            </Route>

            {/* ── Admin ── */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/produtos" replace />} />
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="pedidos" element={<AdminOrders />} />
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