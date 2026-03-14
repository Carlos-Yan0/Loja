import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const CART_KEY = 'loja_cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { product, quantity = 1 } = action.payload;
      const existing = state.find((i) => i.productId === product.id);
      let next;
      if (existing) {
        next = state.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock ?? 999) }
            : i
        );
      } else {
        next = [
          ...state,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0],
            quantity: Math.min(quantity, product.stock ?? 999),
          },
        ];
      }
      saveCart(next);
      return next;
    }
    case 'UPDATE': {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        const next = state.filter((i) => i.productId !== productId);
        saveCart(next);
        return next;
      }
      const next = state.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      saveCart(next);
      return next;
    }
    case 'REMOVE': {
      const next = state.filter((i) => i.productId !== action.payload.productId);
      saveCart(next);
      return next;
    }
    case 'CLEAR': {
      saveCart([]);
      return [];
    }
    case 'HYDRATE': {
      return action.payload;
    }
    default:
      return state;
  }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], (initial) => {
    const loaded = loadCart();
    return loaded.length ? loaded : initial;
  });

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    dispatch({ type: 'ADD', payload: { product, quantity } });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    dispatch({ type: 'UPDATE', payload: { productId, quantity } });
  }, []);

  const removeItem = useCallback((productId) => {
    dispatch({ type: 'REMOVE', payload: { productId } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice = items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const value = {
    items,
    totalItems,
    totalPrice,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
