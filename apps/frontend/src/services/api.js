// Em produção usa VITE_API_URL (URL completa do backend). Em dev usa /api (proxy do Vite).
const BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : '/api';

function getCredentials() {
  return 'include';
}

export const api = {
  async get(path) {
    const res = await fetch(`${BASE}${path}`, { credentials: getCredentials() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Erro ${res.status}`);
    }
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: getCredentials(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
    return data;
  },

  async put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: getCredentials(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
    return data;
  },

  async delete(path) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      credentials: getCredentials(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Erro ${res.status}`);
    }
    return res.json().catch(() => ({}));
  },
};

export const usersApi = {
  create: (data) => api.post('/users', data),
};

export const authApi = {
  me: () => api.post('/auth/me'),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
};

export const productsApi = {
  list:   ()        => api.get('/products'),
  get:    (id)      => api.get(`/products/${id}`),
  // Admin
  create: (data)    => api.post('/products', data),
  update: (id, data)=> api.put(`/products/${id}`, data),
  remove: (id)      => api.delete(`/products/${id}`),
};

export const ordersApi = {
  create: (payload)    => api.post('/orders', payload),
  list:   ()           => api.get('/orders'),
  update: (id, data)   => api.put(`/orders/${id}`, data),
};

export const addressesApi = {
  list:   ()         => api.get('/addresses'),
  create: (data)     => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  delete: (id)       => api.delete(`/addresses/${id}`),
};