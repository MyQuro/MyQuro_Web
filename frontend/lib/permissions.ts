/**
 * Role-based permissions system
 * Defines what each role can do in the restaurant dashboard
 */

export type UserRole = 'owner' | 'manager' | 'staff' | 'kitchen' | 'customer' | 'admin' | 'restaurant' | 'company_admin';
export type RestaurantRole = 'owner' | 'manager' | 'staff' | 'kitchen';

export interface Permission {
  canViewDashboard: boolean;
  canManageMenu: boolean;
  canViewOrders: boolean;
  canUpdateOrderStatus: boolean;
  canManageTables: boolean;
  canViewReservations: boolean;
  canManageReservations: boolean;
  canInviteStaff: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canGenerateBills: boolean;
  canProcessPayments: boolean;
  canViewKitchenDisplay: boolean;
  canViewSessions: boolean;
  canCreateNewOrders: boolean;
  canUsePOS: boolean;
  canManageOffers: boolean;
  canViewBilling: boolean;
  canViewPaymentRequests: boolean;
}

const rolePermissions: Record<UserRole, Permission> = {
  owner: {
    canViewDashboard: true,
    canManageMenu: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: true,
    canViewReservations: true,
    canManageReservations: true,
    canInviteStaff: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canViewReports: true,
    canManageSettings: true,
    canGenerateBills: true,
    canProcessPayments: true,
    canViewKitchenDisplay: true,
    canViewSessions: true,
    canCreateNewOrders: true,
    canUsePOS: true,
    canManageOffers: true,
    canViewBilling: true,
    canViewPaymentRequests: true,
  },
  company_admin: {
    canViewDashboard: true,
    canManageMenu: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: true,
    canViewReservations: true,
    canManageReservations: true,
    canInviteStaff: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canViewReports: true,
    canManageSettings: true,
    canGenerateBills: true,
    canProcessPayments: true,
    canViewKitchenDisplay: true,
    canViewSessions: true,
    canCreateNewOrders: true,
    canUsePOS: true,
    canManageOffers: true,
    canViewBilling: true,
    canViewPaymentRequests: true,
  },
  manager: {
    canViewDashboard: true,
    canManageMenu: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: true,
    canViewReservations: true,
    canManageReservations: true,
    canInviteStaff: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canViewReports: true,
    canManageSettings: false,
    canGenerateBills: true,
    canProcessPayments: true,
    canViewKitchenDisplay: true,
    canViewSessions: true,
    canCreateNewOrders: true,
    canUsePOS: true,
    canManageOffers: true,
    canViewBilling: true,
    canViewPaymentRequests: true,
  },
  staff: {
    canViewDashboard: true,
    canManageMenu: false,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: true,
    canViewReservations: true,
    canManageReservations: true,
    canInviteStaff: false,
    canManageStaff: false,
    canViewAnalytics: false,
    canViewReports: false,
    canManageSettings: false,
    canGenerateBills: true,
    canProcessPayments: true,
    canViewKitchenDisplay: true,
    canViewSessions: true,
    canCreateNewOrders: true,
    canUsePOS: true,
    canManageOffers: false,
    canViewBilling: true,
    canViewPaymentRequests: false,
  },
  kitchen: {
    canViewDashboard: true,
    canManageMenu: false,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: false,
    canViewReservations: false,
    canManageReservations: false,
    canInviteStaff: false,
    canManageStaff: false,
    canViewAnalytics: false,
    canViewReports: false,
    canManageSettings: false,
    canGenerateBills: false,
    canProcessPayments: false,
    canViewKitchenDisplay: true,
    canViewSessions: false,
    canCreateNewOrders: false,
    canUsePOS: false,
    canManageOffers: false,
    canViewBilling: false,
    canViewPaymentRequests: false,
  },
  customer: {
    canViewDashboard: false,
    canManageMenu: false,
    canViewOrders: false,
    canUpdateOrderStatus: false,
    canManageTables: false,
    canViewReservations: false,
    canManageReservations: false,
    canInviteStaff: false,
    canManageStaff: false,
    canViewAnalytics: false,
    canViewReports: false,
    canManageSettings: false,
    canGenerateBills: false,
    canProcessPayments: false,
    canViewKitchenDisplay: false,
    canViewSessions: false,
    canCreateNewOrders: false,
    canUsePOS: false,
    canManageOffers: false,
    canViewBilling: false,
    canViewPaymentRequests: false,
  },
  admin: {
    canViewDashboard: true,
    canManageMenu: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: true,
    canViewReservations: true,
    canManageReservations: true,
    canInviteStaff: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canViewReports: true,
    canManageSettings: true,
    canGenerateBills: true,
    canProcessPayments: true,
    canViewKitchenDisplay: true,
    canViewSessions: true,
    canCreateNewOrders: true,
    canUsePOS: true,
    canManageOffers: true,
    canViewBilling: true,
    canViewPaymentRequests: true,
  },
  restaurant: {
    canViewDashboard: true,
    canManageMenu: true,
    canViewOrders: true,
    canUpdateOrderStatus: true,
    canManageTables: true,
    canViewReservations: true,
    canManageReservations: true,
    canInviteStaff: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canViewReports: true,
    canManageSettings: true,
    canGenerateBills: true,
    canProcessPayments: true,
    canViewKitchenDisplay: true,
    canViewSessions: true,
    canCreateNewOrders: true,
    canUsePOS: true,
    canManageOffers: true,
    canViewBilling: true,
    canViewPaymentRequests: true,
  },
};

export function getPermissions(role: UserRole): Permission {
  return rolePermissions[role] || rolePermissions.customer;
}

export function hasPermission(
  role: UserRole,
  permission: keyof Permission
): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

export function canAccessDashboard(role: UserRole): boolean {
  return hasPermission(role, 'canViewDashboard');
}

/**
 * Get restaurant-specific permissions based on restaurant role (owner/manager/staff)
 * This is the primary function to use for permission checks in the dashboard
 */
export function getRestaurantPermissions(restaurantRole: RestaurantRole): Permission {
  return rolePermissions[restaurantRole];
}

/**
 * Check if a restaurant role has a specific permission
 */
export function hasRestaurantPermission(
  restaurantRole: RestaurantRole,
  permission: keyof Permission
): boolean {
  return rolePermissions[restaurantRole][permission];
}

export function canUserViewOrders(user: { role?: UserRole; restaurantRole?: RestaurantRole }): boolean {
  if (user?.restaurantRole) {
    return hasRestaurantPermission(user.restaurantRole, 'canViewOrders');
  }
  if (user?.role) {
    return hasPermission(user.role, 'canViewOrders');
  }
  return false;
}

export function canUserUpdateOrderStatus(user: { role?: UserRole; restaurantRole?: RestaurantRole }): boolean {
  if (user?.restaurantRole) {
    return hasRestaurantPermission(user.restaurantRole, 'canUpdateOrderStatus');
  }
  if (user?.role) {
    return hasPermission(user.role, 'canUpdateOrderStatus');
  }
  return false;
}