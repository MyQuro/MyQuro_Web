/**
 * plan-store.ts
 * Client-side localStorage store for managing restaurant plan assignments.
 * Admin sets plan → stored in localStorage → dashboard reads it.
 * Key format: "myquro_plan_{restaurantId}"
 */

export type Plan = 'basic' | 'premium';

const KEY_PREFIX = 'myquro_plan_';

export function getPlan(restaurantId: string): Plan {
  if (typeof window === 'undefined') return 'basic';
  const stored = localStorage.getItem(KEY_PREFIX + restaurantId);
  if (stored === 'premium') return 'premium';
  return 'basic'; // default is basic
}

export function setPlan(restaurantId: string, plan: Plan): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_PREFIX + restaurantId, plan);
  // Dispatch custom event so other tabs/components can react
  window.dispatchEvent(new CustomEvent('myquro_plan_changed', { detail: { restaurantId, plan } }));
}

export function getAllPlans(): Record<string, Plan> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, Plan> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) {
      const restaurantId = key.slice(KEY_PREFIX.length);
      result[restaurantId] = getPlan(restaurantId);
    }
  }
  return result;
}

/**
 * Routes accessible under the Basic plan.
 * All other dashboard routes are Premium-only.
 */
export const BASIC_PLAN_ROUTES = new Set([
  '/dashboard',
  '/dashboard/manual-billing',
  '/dashboard/menu',
  '/dashboard/past-sessions',
  '/dashboard/analytics',
  '/dashboard/settings',
]);
