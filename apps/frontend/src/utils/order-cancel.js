const nonCancelableStatuses = new Set(['CANCELED', 'DELIVERED', 'COMPLETED']);

export const resolveCancelWindowHours = (value) =>
  Math.max(
    1,
    Number.isFinite(Number.parseInt(String(value ?? ''), 10))
      ? Number.parseInt(String(value ?? ''), 10)
      : 8
  );

export const canOrderBeCanceled = (order, cancelWindowHours) => {
  if (nonCancelableStatuses.has(order?.status)) return false;

  const createdAt = new Date(order?.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return false;

  const cancelWindowMs = resolveCancelWindowHours(cancelWindowHours) * 60 * 60 * 1000;
  return Date.now() - createdAt <= cancelWindowMs;
};
