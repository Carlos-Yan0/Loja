const DEFAULT_MAX_STOCK = 999;

export const sanitizeStock = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_MAX_STOCK;
  return parsed;
};

export const clampQuantityToStock = (quantity, stock) =>
  Math.max(1, Math.min(Number(quantity) || 1, sanitizeStock(stock)));

export const normalizeCartItem = (item) => ({
  ...item,
  stock: sanitizeStock(item?.stock),
  quantity: clampQuantityToStock(item?.quantity, item?.stock),
});
