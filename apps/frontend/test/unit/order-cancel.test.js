import { describe, expect, it } from 'bun:test';
import { canOrderBeCanceled, resolveCancelWindowHours } from '../../src/utils/order-cancel';

describe('order cancel utils', () => {
  it('resolves cancellation window with safe fallback', () => {
    expect(resolveCancelWindowHours(undefined)).toBe(8);
    expect(resolveCancelWindowHours('3')).toBe(3);
    expect(resolveCancelWindowHours('0')).toBe(1);
  });

  it('allows cancellation while order is in valid status and window', () => {
    const recentOrder = {
      status: 'PROCESSING',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };

    expect(canOrderBeCanceled(recentOrder, 8)).toBe(true);
  });

  it('blocks cancellation when status is finalized or time has expired', () => {
    const expiredOrder = {
      status: 'PROCESSING',
      createdAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    };
    const deliveredOrder = {
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
    };

    expect(canOrderBeCanceled(expiredOrder, 8)).toBe(false);
    expect(canOrderBeCanceled(deliveredOrder, 8)).toBe(false);
  });
});
