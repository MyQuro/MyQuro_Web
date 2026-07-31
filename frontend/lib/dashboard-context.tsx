"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { authClient } from './auth-client';
import { apiClient } from './api-client';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'staff' | 'kitchen' | 'customer' | 'admin' | 'restaurant' | 'company_admin';
  image?: string;
}

export interface Restaurant {
  id: string;
  restaurantName: string;
  restaurantLogo?: string;
  city?: string;
  state?: string;
  isOpen?: boolean;
  plan?: 'basic' | 'premium';
  description?: string;
  phone?: string;
  address?: string;
  fssaiLicenseNumber?: string;
  defaultGstPercentage?: number;
}

export type RestaurantRole = 'owner' | 'manager' | 'staff' | 'kitchen';

export interface DashboardContextType {
  user: User | null;
  isLoading: boolean;
  isPending: boolean;
  restaurant: Restaurant | null;
  restaurantRole: RestaurantRole | null;
  permissions: any;
  allRestaurants: Restaurant[];
  switchRestaurant: (restaurantId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshRestaurant: () => Promise<void>;
  toggleRestaurantStatus: () => Promise<void>;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantRole, setRestaurantRole] = useState<RestaurantRole | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [permissions, setPermissions] = useState<any>({});

  const switchRestaurant = async (restaurantId: string) => {
    const selected = allRestaurants.find(r => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
      // In a more complex app, we might update user preferences or session here
      localStorage.setItem('last_restaurant_id', restaurantId);
    }
  };

  const { data: session, isPending } = authClient.useSession();

  // Track loaded sessions to prevent duplicate API calls
  const loadedSessionRef = useRef<string | null>(null);

  // Load user data when session is available
  useEffect(() => {
    const loadUserData = async () => {
      console.log('🔐 DASHBOARD CONTEXT: Loading user data, session:', !!session?.user);

      if (!session?.user) {
        console.log('🔐 DASHBOARD CONTEXT: No session user, setting loading to false');
        setIsLoading(false);
        return;
      }

      // Skip if we've already loaded data for this session
      if (loadedSessionRef.current === session.user.id) {
        console.log('🔐 DASHBOARD CONTEXT: Data already loaded for this session');
        setIsLoading(false);
        return;
      }

      console.log('🔐 DASHBOARD CONTEXT: Calling getUserRestaurantStatus API');
      try {
        // Get user restaurant status
        const statusResponse = await apiClient.getUserRestaurantStatus() as {
          success: boolean;
          hasRestaurant: boolean;
          restaurant: any;
          role: string;
          restaurantRole: RestaurantRole;
          user?: any;
        };

        console.log('🔐 DASHBOARD CONTEXT: API Response:', statusResponse);

        if (statusResponse.success && statusResponse.hasRestaurant && statusResponse.restaurant) {
          console.log('🔐 DASHBOARD CONTEXT: Setting user data from API response');

          const responseAllRestaurants = (statusResponse as any).allRestaurants || [];
          const mappedRestaurants: Restaurant[] = responseAllRestaurants.map((r: any) => ({
            id: r.id,
            restaurantName: r.name,
            type: r.type,
            address: r.address,
            city: r.city,
            state: r.state,
            isOpen: r.status === 'active',
            defaultGstPercentage: r.defaultGstPercentage ? Number(r.defaultGstPercentage) : 0,
          }));

          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.name || '',
            role: statusResponse.role === 'admin' ? 'admin' :
              (statusResponse.role === 'company_admin' ? 'company_admin' :
                (statusResponse.role === 'owner' || statusResponse.role === 'manager' || statusResponse.role === 'staff' || statusResponse.role === 'kitchen' ? 'restaurant' : 'customer')),
            image: session.user.image || undefined,
          });

          setRestaurant(statusResponse.restaurant);
          setRestaurantRole(statusResponse.restaurantRole);
          setAllRestaurants(mappedRestaurants);

          // Mark this session as loaded
          loadedSessionRef.current = session.user.id;
        } else {
          console.log('🔐 DASHBOARD CONTEXT: API call failed or no restaurant data, using fallback');
          // Fallback to session user data
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.name || '',
            role: 'customer',
            image: session.user.image || undefined,
          });
          loadedSessionRef.current = session.user.id;
        }
      } catch (error) {
        console.error('🔐 DASHBOARD CONTEXT: Failed to load user data:', error);
        // Fallback to session user data
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name || '',
          role: 'customer',
          image: session.user.image || undefined,
        });
        loadedSessionRef.current = session.user.id;
      } finally {
        console.log('🔐 DASHBOARD CONTEXT: Setting loading to false');
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [session]);

  const refreshUser = async () => {
    if (!session?.user) return;

    try {
      const statusResponse = await apiClient.getUserRestaurantStatus() as {
        success: boolean;
        hasRestaurant: boolean;
        restaurant: any;
        role: string;
        restaurantRole: RestaurantRole;
        user?: any;
      };
      if (statusResponse.success && statusResponse.hasRestaurant && statusResponse.restaurant) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name || '',
          role: statusResponse.role === 'admin' ? 'admin' :
            (statusResponse.role === 'company_admin' ? 'company_admin' :
              (statusResponse.role === 'owner' || statusResponse.role === 'manager' || statusResponse.role === 'staff' || statusResponse.role === 'kitchen' ? 'restaurant' : 'customer')),
          image: session.user.image || undefined,
        });
        setRestaurant(statusResponse.restaurant);
        setRestaurantRole(statusResponse.restaurantRole);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const refreshRestaurant = async () => {
    if (!session?.user) return;

    try {
      const statusResponse = await apiClient.getUserRestaurantStatus() as {
        success: boolean;
        hasRestaurant: boolean;
        restaurant: any;
        role: string;
        restaurantRole: RestaurantRole;
      };
      if (statusResponse.success && statusResponse.hasRestaurant && statusResponse.restaurant) {
        setRestaurant(statusResponse.restaurant);
        setRestaurantRole(statusResponse.restaurantRole);
      }
    } catch (error) {
      console.error('Failed to refresh restaurant:', error);
    }
  };

  const toggleRestaurantStatus = async () => {
    if (!restaurant) return;

    try {
      const newStatus = !restaurant.isOpen;
      if (newStatus) {
        await apiClient.openRestaurant(restaurant.id);
      } else {
        await apiClient.closeRestaurant(restaurant.id);
      }

      // Update local state
      setRestaurant(prev => prev ? { ...prev, isOpen: newStatus } : null);
    } catch (error) {
      console.error('Failed to toggle restaurant status:', error);
    }
  };

  const value: DashboardContextType = {
    user,
    isLoading,
    isPending,
    restaurant,
    restaurantRole,
    allRestaurants,
    switchRestaurant,
    refreshUser,
    refreshRestaurant,
    toggleRestaurantStatus,
    isSidebarOpen,
    setSidebarOpen,
    permissions: getPermissions(user?.role),
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export function getPermissions(role?: string) {
  return {
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
  };
}
