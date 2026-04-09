import { describe, expect, it } from 'bun:test';
import {
  clampQuantityToStock,
  normalizeCartItem,
  sanitizeStock,
} from '../../src/utils/cart-stock';

describe('cart stock utils', () => {
  it('sanitizes invalid stock values to a safe fallback', () => {
    expect(sanitizeStock(undefined)).toBe(999);
    expect(sanitizeStock(-10)).toBe(999);
    expect(sanitizeStock('abc')).toBe(999);
  });

  it('clamps item quantity to available stock', () => {
    expect(clampQuantityToStock(10, 3)).toBe(3);
    expect(clampQuantityToStock(0, 3)).toBe(1);
    expect(clampQuantityToStock(2, 3)).toBe(2);
  });

  it('normalizes persisted cart item shape', () => {
    const item = normalizeCartItem({
      productId: 'p1',
      quantity: 99,
      stock: 4,
    });

    expect(item.quantity).toBe(4);
    expect(item.stock).toBe(4);
  });
});
