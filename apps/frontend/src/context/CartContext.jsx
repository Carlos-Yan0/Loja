import { useReducer, useCallback, useEffect } from 'react';
import { CartContext } from './cart-context';
import { clampQuantityToStock, normalizeCartItem, sanitizeStock } from '../utils/cart-stock';

const CART_KEY = 'loja_cart';

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem);
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
            ? {
                ...i,
                stock: sanitizeStock(product.stock ?? i.stock),
                quantity: clampQuantityToStock(i.quantity + quantity, product.stock ?? i.stock),
              }
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
            stock: sanitizeStock(product.stock),
            quantity: clampQuantityToStock(quantity, product.stock),
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
        i.productId === productId
          ? {
              ...i,
              quantity: clampQuantityToStock(quantity, i.stock),
            }
          : i
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

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], (initial) => {
    const loaded = loadCart();
    return loaded.length ? loaded : initial;
  });
  const [notice, setNotice] = useReducer((_, action) => action, '');

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    const maxStock = sanitizeStock(product?.stock);
    const existingQuantity = items.find((item) => item.productId === product?.id)?.quantity ?? 0;

    if (existingQuantity + quantity > maxStock) {
      setNotice(`Limite de estoque atingido para "${product.name}".`);
    }

    dispatch({ type: 'ADD', payload: { product, quantity } });
  }, [items]);

  const updateQuantity = useCallback((productId, quantity) => {
    const currentItem = items.find((item) => item.productId === productId);
    if (currentItem && quantity > sanitizeStock(currentItem.stock)) {
      setNotice(`Estoque máximo disponível para "${currentItem.name}".`);
    }

    dispatch({ type: 'UPDATE', payload: { productId, quantity } });
  }, [items]);

  const removeItem = useCallback((productId) => {
    dispatch({ type: 'REMOVE', payload: { productId } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const clearNotice = useCallback(() => setNotice(''), []);

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
    notice,
    clearNotice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
