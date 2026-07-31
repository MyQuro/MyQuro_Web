/**
 * API Client for restaurant dashboard
 * Handles all API calls with proper error handling and authentication
 */

// Smart backend URL detection (same as auth-client)
// Smart backend URL detection (consistent with auth-client)
const getBackendUrl = () => {
  // 1. Priority: Localhost detection (to avoid cross-origin issues when configured with IP)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If localhost or 127.0.0.1, use backend on port 8000
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return `http://${hostname}:8000`;
    }
  }

  // 2. Configured URL (e.g. from .env.local)
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configured) {
    return configured;
  }

  // 3. Other local network detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Handle local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalIp =
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31);

    if (isLocalIp) {
      return `http://${hostname}:8000`;
    }

    // If running on Render, use the backend service URL
    if (hostname.includes('onrender.com')) {
      return 'https://myquro-web.onrender.com';
    }
  }

  return 'https://myquro-web.onrender.com';
};

const BACKEND_URL = getBackendUrl();

interface ApiError {
  message: string;
  status: number;
}

// Order Detail Types
interface OrderSession {
  sessionId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantBanner: string | null;
  restaurantCity: string;
  restaurantAddress: string;
  tableNumber: string;
  startedAt: string;
  closedAt: string | null;
  billedAt: string | null;
  paymentStatus: string;
  finalBillAmount: number;
  grandTotal: number;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  status: string;
  createdByUserId: string;
  creatorName: string | null;
  creatorEmail: string;
  creatorImage: string | null;
}

interface OrderItem {
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  status: string;
  itemName: string;
  itemDescription: string | null;
  itemImage: string | null;
  isVeg: boolean;
  variantName: string | null;
  variantSize: string | null;
  extras: Array<{
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface OrderPayment {
  id: string;
  tableSessionId: string;
  amount: number;
  method: string;
  status: string;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderDiscount {
  id: string;
  sessionId: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  voucherId: string | null;
  createdAt: string;
}

interface OrderReview {
  id: string;
  sessionId: string;
  userId: string;
  restaurantId: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailResponse {
  session: OrderSession;
  items: OrderItem[];
  payments: OrderPayment[];
  discounts: OrderDiscount[];
  hasReview: boolean;
  review: OrderReview | null;
}

interface OrderDetailsApiResponse {
  success: boolean;
  order: OrderDetailResponse;
}

interface OrderHistoryItem {
  sessionId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
  restaurantCity: string;
  tableNumber: string;
  startedAt: string;
  closedAt: string | null;
  paymentStatus: string;
  finalBillAmount: number;
  grandTotal: number;
  status: string;
  itemsCount: number;
  totalPaid: number;
  paymentMethod: string | null;
}

interface OrderHistoryApiResponse {
  success: boolean;
  orders: OrderHistoryItem[];
}

// Loyalty & Voucher Types
interface Voucher {
  id: string;
  code: string;
  userId: string;
  restaurantId: string;
  voucherType: string;
  discountValue: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  freeItemId: string | null;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedInSessionId: string | null;
  createdAt: string;
}

interface LoyaltyStatus {
  tier: string;
  points: number;
  totalSpent: number;
  visitCount: number;
}

interface SessionDiscount {
  id: string;
  sessionId: string;
  discountType: string;
  discountSourceId: string | null;
  discountName: string;
  discountValue: number;
  appliedByUserId: string | null;
  appliedAt: string;
}

interface AvailableOffer {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
  minimumOrderValue: number;
  isEligible: boolean;
}

interface VouchersApiResponse {
  success: boolean;
  data: Voucher[];
}

interface LoyaltyStatusApiResponse {
  success: boolean;
  loyalty: LoyaltyStatus | null;
}

interface SessionDiscountsApiResponse {
  success: boolean;
  data: {
    vouchers: Voucher[];
    appliedDiscounts: SessionDiscount[];
  };
}

interface RedeemVoucherApiResponse {
  success: boolean;
  message: string;
  data?: {
    voucher: Voucher;
    discount: SessionDiscount;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: `API Error: ${response.statusText}`,
        status: response.status,
      };

      try {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          error.message = errorData.error || errorData.message || error.message;

          console.error('⚠️ [API] Error Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorData,
            timestamp: new Date().toISOString()
          });
        } catch (jsonError) {
          // If JSON parsing fails, use the text content
          console.error('⚠️ [API] Non-JSON Error Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            responseText: errorText.substring(0, 500), // Log first 500 chars
            timestamp: new Date().toISOString()
          });
          // Don't overwrite error.message with raw HTML, stick to statusText or generic message
        }
      } catch (readError) {
        console.error('⚠️ [API] Error reading error response:', {
          status: response.status,
          url: response.url,
          error: readError instanceof Error ? readError.message : 'Unknown'
        });
      }

      throw error;
    }

    return response.json();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timestamp = new Date().toISOString();
    const requestId = Math.random().toString(36).substring(7);

    console.log(`\ud83d\udce1 [API] Request [${requestId}]:`, {
      method: options.method || 'GET',
      endpoint,
      url,
      timestamp,
      hasBody: !!options.body
    });

    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const startTime = Date.now();
      const response = await fetch(url, config);
      const duration = Date.now() - startTime;

      console.log(`\u2705 [API] Response [${requestId}]:`, {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
        endpoint
      });

      const data = await this.handleResponse<T>(response);

      // Log success details for non-GET requests
      if (options.method && options.method !== 'GET') {
        console.log(`\ud83c\udf89 [API] Success [${requestId}]:`, {
          method: options.method,
          endpoint,
          dataReceived: !!data
        });
      }

      return data;
    } catch (error) {
      console.error(`\u274c [API] Error [${requestId}]:`, {
        endpoint,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Auth
  async getSession() {
    return this.request('/api/auth/get-session');
  }

  // Sessions
  async getActiveSessionForRestaurant(restaurantId: string) {
    return this.request<{
      success: boolean;
      hasActiveSession: boolean;
      session?: {
        sessionId: string;
        tableId: string;
        tableNumber: string;
        restaurantId: string;
        status: string;
        paymentStatus: string;
        billedAt: string | null;
        startedAt: string;
      };
      message?: string;
    }>(`/api/sessions/active/${restaurantId}`);
  }

  // Restaurant
  async getRestaurant(id: string) {
    return this.request(`/api/restaurants/${id}`);
  }

  async getRestaurants() {
    return this.request<{ restaurants: any[] }>('/api/restaurants');
  }

  async getMyRestaurant() {
    return this.request('/api/restaurants/my-restaurant');
  }

  async updateRestaurant(id: string, data: any) {
    return this.request(`/api/restaurants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateRestaurantPlan(id: string, plan: 'basic' | 'premium') {
    return this.request<{ success: boolean; restaurantId: string; plan: 'basic' | 'premium' }>(
      `/api/admin/restaurants/${id}/plan`,
      {
        method: 'PATCH',
        body: JSON.stringify({ plan }),
      }
    );
  }

  async getRestaurantStatus(id: string) {
    return this.request(`/api/restaurants/${id}/status`);
  }

  async getMyRestaurantRole(id: string) {
    return this.request<{ role: 'owner' | 'manager' | 'staff' }>(`/api/restaurants/${id}/my-role`);
  }

  // Get user's restaurant status
  async getUserRestaurantStatus() {
    return this.request<{
      success: boolean;
      hasRestaurant: boolean;
      restaurant: any;
      role: string;
      restaurantRole: string;
      allRestaurants: Array<{
        id: string;
        name: string;
        type: string;
        address: string;
        city: string;
        state: string;
        status: string;
        role: string;
      }>;
      totalCount: number;
    }>('/api/user/restaurant-status');
  }

  // Get user's active session
  async getActiveSession(restaurantId: string) {
    return this.request(`/api/sessions/active/${restaurantId}`);
  }

  // Companies & Groups
  async createCompanyInvitation(data: { companyName: string; ownerEmail: string; restaurantIds: string[] }) {
    return this.request('/api/companies/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCompanyInvitations() {
    return this.request<{ invitations: any[] }>('/api/companies/invitations');
  }

  async getCompanies() {
    return this.request<{ companies: any[] }>('/api/companies');
  }

  async getRestaurantCompanyInvites(restaurantId: string) {
    return this.request<{ invites: any[] }>(`/api/companies/restaurant-invites/${restaurantId}`);
  }

  async getAdminRestaurantTables(restaurantId: string) {
    return this.request<{ tables: any[] }>(`/api/admin/restaurants/${restaurantId}/tables`);
  }

  async acceptCompanyInvite(inviteId: string) {
    return this.request('/api/companies/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ inviteId }),
    });
  }
  async getUserActiveSession() {
    return this.request<{
      success: boolean;
      hasActiveSession: boolean;
      session: {
        sessionId: string;
        tableId: string;
        tableNumber: string;
        restaurantId: string;
        qrToken: string | null;
        status: string;
        paymentStatus: string;
        startedAt: string;
      } | null;
    }>('/api/user/active-session');
  }

  // Menu Management
  async getManagementMenu(restaurantId: string) {
    return this.request(`/api/menus/${restaurantId}/menu/manage`);
  }

  async createCategory(restaurantId: string, data: any) {
    return this.request(`/api/menus/${restaurantId}/menu/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deactivateCategory(restaurantId: string, categoryId: string) {
    return this.request(
      `/api/menus/${restaurantId}/menu/categories/${categoryId}/deactivate`,
      { method: 'PATCH' }
    );
  }

  async activateCategory(restaurantId: string, categoryId: string) {
    return this.request(
      `/api/menus/${restaurantId}/menu/categories/${categoryId}/activate`,
      { method: 'PATCH' }
    );
  }

  async updateCategory(restaurantId: string, categoryId: string, data: any) {
    return this.request(
      `/api/menus/${restaurantId}/menu/categories/${categoryId}/update`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteCategory(restaurantId: string, categoryId: string) {
    return this.request(
      `/api/menus/${restaurantId}/menu/categories/${categoryId}`,
      { method: 'DELETE' }
    );
  }

  async reorderCategories(restaurantId: string, orderedCategoryIds: string[]) {
    return this.request(
      `/api/menus/${restaurantId}/menu/categories/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify({ orderedCategoryIds }),
      }
    );
  }

  async createMenuItem(restaurantId: string, data: any) {
    return this.request(`/api/menus/${restaurantId}/menu/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMenuItem(restaurantId: string, itemId: string, data: any) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/update`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deactivateMenuItem(restaurantId: string, itemId: string) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/deactivate`,
      { method: 'PATCH' }
    );
  }

  async activateMenuItem(restaurantId: string, itemId: string) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/activate`,
      { method: 'PATCH' }
    );
  }

  async deleteMenuItem(restaurantId: string, itemId: string) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}`,
      { method: 'DELETE' }
    );
  }

  async createItemVariant(restaurantId: string, itemId: string, data: any) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/variants`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateItemVariant(
    restaurantId: string,
    itemId: string,
    variantId: string,
    data: any
  ) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/variants/${variantId}/update`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteItemVariant(
    restaurantId: string,
    itemId: string,
    variantId: string
  ) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/variants/${variantId}`,
      { method: 'DELETE' }
    );
  }

  async deactivateItemVariant(
    restaurantId: string,
    itemId: string,
    variantId: string
  ) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/variants/${variantId}/deactivate`,
      { method: 'PATCH' }
    );
  }

  async activateItemVariant(
    restaurantId: string,
    itemId: string,
    variantId: string
  ) {
    return this.request(
      `/api/menus/${restaurantId}/menu/items/${itemId}/variants/${variantId}/activate`,
      { method: 'PATCH' }
    );
  }

  // Tables
  async getTables(restaurantId: string) {
    return this.request(`/api/restaurant-tables/${restaurantId}/tables`);
  }

  async createTable(restaurantId: string, data: any) {
    return this.request(
      `/api/restaurant-tables/${restaurantId}/tables/create`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateTable(tableId: string, data: any) {
    return this.request(`/api/restaurant-tables/tables/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTable(tableId: string) {
    return this.request(`/api/restaurant-tables/tables/${tableId}`, {
      method: 'DELETE',
    });
  }

  async generateQRCode(tableId: string) {
    return this.request(
      `/api/restaurant-tables/tables/${tableId}/qrcode`,
      { method: 'POST' }
    );
  }



  async closeTableSession(sessionId: string) {
    return this.request(
      `/api/restaurant-tables/table-session/${sessionId}/close`,
      { method: 'PATCH' }
    );
  }

  // Orders
  async updateOrderStatus(orderId: string, status: string) {
    return this.request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Reservations
  async getRestaurantReservations(restaurantId: string) {
    console.log('🔌 API CLIENT - getRestaurantReservations called:', { restaurantId });
    const url = `/api/reservations/${restaurantId}/reservations`;
    console.log('🔌 API CLIENT - Making request to:', url);
    const response = await this.request(url);
    console.log('🔌 API CLIENT - Response received:', response);
    return response;
  }

  async assignTableToReservation(reservationId: string, data: any) {
    return this.request(
      `/api/reservations/${reservationId}/assign-table`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async rejectReservation(reservationId: string, restaurantId: string) {
    return this.request(`/api/reservations/${reservationId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ restaurantId }),
    });
  }

  // Staff
  async inviteStaff(restaurantId: string, data: any) {
    return this.request(`/api/restaurants/${restaurantId}/invite-staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStaffInvites(restaurantId: string) {
    return this.request(`/api/restaurants/${restaurantId}/staff-invites`);
  }

  async getStaffMembers(restaurantId: string) {
    return this.request(`/api/restaurants/${restaurantId}/staff`);
  }

  async updateStaffRole(restaurantId: string, staffId: string, role: string) {
    return this.request(`/api/restaurants/${restaurantId}/staff/${staffId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeStaffMember(restaurantId: string, staffId: string) {
    return this.request(`/api/restaurants/${restaurantId}/staff/${staffId}`, {
      method: 'DELETE',
    });
  }

  async revokeStaffInvite(restaurantId: string, inviteId: string) {
    return this.request(`/api/restaurants/${restaurantId}/staff-invites/${inviteId}`, {
      method: 'DELETE',
    });
  }

  // Billing
  async generateBill(sessionId: string, data: { discountPercentage: number; taxRate: number; restaurantId?: string }) {
    return this.request(`/api/billing/${sessionId}/generate-bill`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateFinalBill(sessionId: string, { discountPercentage, taxRate }: { discountPercentage: number; taxRate: number; restaurantId?: string }) {
    return this.request(`/api/billing/${sessionId}/final-amount?discountPercentage=${discountPercentage}&taxRate=${taxRate}`);
  }

  async getTotalAmount(tableSessionId: string) {
    return this.request(`/api/billing/${tableSessionId}/total`);
  }

  async getFinalAmount(
    tableSessionId: string,
    discountPercentage: number,
    taxRate: number
  ) {
    return this.request(
      `/api/billing/${tableSessionId}/final-amount?discountPercentage=${discountPercentage}&taxRate=${taxRate}`
    );
  }



  async applyDiscount(sessionId: string, discountData: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountReason?: string;
  }) {
    return this.request(`/api/sessions/apply-discount/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(discountData),
    });
  }

  // Payments
  async recordPayment(tableSessionId: string, data: any) {
    return this.request(`/api/payments/${tableSessionId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard Stats
  async getDashboardStats(restaurantId: string) {
    return this.request(`/api/restaurants/${restaurantId}/stats`);
  }

  async openRestaurant(restaurantId: string) {
    return this.request(`/api/restaurants/${restaurantId}/open`, {
      method: 'PATCH',
    });
  }

  async closeRestaurant(restaurantId: string) {
    return this.request(`/api/restaurants/${restaurantId}/close`, {
      method: 'PATCH',
    });
  }

  // Offers
  async getOffers(restaurantId: string) {
    return this.request(`/api/offers/${restaurantId}`);
  }

  async createOffer(restaurantId: string, data: any) {
    return this.request(`/api/offers/${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOffer(restaurantId: string, offerId: string, data: any) {
    return this.request(`/api/offers/${restaurantId}/${offerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOffer(restaurantId: string, offerId: string) {
    return this.request(`/api/offers/${restaurantId}/${offerId}`, {
      method: 'DELETE',
    });
  }

  async toggleOfferActive(restaurantId: string, offerId: string) {
    return this.request(`/api/offers/${restaurantId}/${offerId}/toggle`, {
      method: 'PATCH',
    });
  }

  // E-bills
  async sendEBill(billId: string, email: string) {
    return this.request(`/api/billing/${billId}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Analytics
  async getSalesAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics/sales?${query.toString()}`);
  }

  async getItemAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics/items?${query.toString()}`);
  }

  async getPeakHoursAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics/peak-hours?${query.toString()}`);
  }

  async getCategoryAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics/categories?${query.toString()}`);
  }

  async getCustomerAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics/customers?${query.toString()}`);
  }

  async getPaymentMethodAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics/payment-methods?${query.toString()}`);
  }

  // Comprehensive analytics endpoint
  async getAnalytics(restaurantId: string, period: string = 'all', startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    query.append('period', period);
    if (period === 'custom' && startDate) query.append('startDate', startDate);
    if (period === 'custom' && endDate) query.append('endDate', endDate);
    return this.request(`/api/analytics/${restaurantId}/analytics?${query.toString()}`);
  }

  // Reports
  async generateReport(restaurantId: string, type: string, startDate: string, endDate: string) {
    return this.request(`/api/reports/${restaurantId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ type, startDate, endDate }),
    });
  }

  async getReports(restaurantId: string) {
    return this.request(`/api/reports/${restaurantId}`);
  }

  async downloadReport(reportId: string) {
    // For download, we might need to handle blob response, but for now let's assume the API returns a URL or we handle it in the component
    // Or we can use window.open if it's a direct download link.
    // If the API returns a stream, we need a different approach in request method.
    // Assuming the backend returns a JSON with a download URL or we use a direct link.
    // If the backend streams the file, we should probably use a direct fetch in the component or modify request to handle blobs.
    // Let's assume for now we just trigger the endpoint.
    // Actually, for file downloads, it's often better to just open the URL in a new tab if it's a GET request with proper headers.
    // But if it requires auth headers, we need to fetch with headers and then create a blob url.

    const url = `${this.baseUrl}/api/reports/${reportId}/download`;
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`, // Assuming token is in localStorage
    };

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to download report');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `report-${reportId}.csv`; // Or get filename from headers
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  // Admin Dashboard
  async getAdminStats() {
    return this.request(`/api/admin/stats`);
  }

  async getAdminOverview() {
    return this.request<{
      overview: {
        totalRestaurants: number;
        activeRestaurants: number;
        totalUsers: number;
        todayOrders: number;
        todayRevenue: number;
        todayReservations: number;
        failedPayments: number;
      };
      recentActivity: {
        orders: any[];
        payments: any[];
      };
    }>(`/api/admin/dashboard/overview`);
  }

  async getPlatformAnalytics(period?: string, restaurantId?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (restaurantId) params.append('restaurantId', restaurantId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `/api/admin/analytics/platform${queryString ? `?${queryString}` : ''}`;
    return this.request<{
      period: string;
      startDate: string;
      endDate: string;
      orderMetrics: any;
      timeSeries: any[];
      categoryPerformance: any[];
      topItems: any[];
      paymentDistribution: any[];
      peakHours: any[];
      topPerformingRestaurants: any[];
    }>(url);
  }

  async getAdminRestaurants() {
    return this.request<{ restaurants: any[] }>(`/api/admin/restaurants`);
  }

  async approveRestaurant(id: string) {
    return this.request(`/api/admin/restaurants/${id}/approve`, { method: 'PATCH' });
  }

  async rejectRestaurant(id: string) {
    return this.request(`/api/admin/restaurants/${id}/reject`, { method: 'PATCH' });
  }

  async suspendRestaurant(id: string, reason: string) {
    return this.request(`/api/admin/restaurants/suspend/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateRestaurant(id: string) {
    return this.request(`/api/admin/restaurants/reactivate/${id}`, { method: 'PATCH' });
  }

  async generateAdminQRCode(tableId: string, restaurantId: string) {
    return this.request<{
      message: string;
      qrToken: string;
      scanUrl: string;
    }>(`/api/admin/tables/${tableId}/qrcode`, {
      method: 'POST',
      body: JSON.stringify({ restaurantId }),
    });
  }

  // ===== CUSTOMER ENDPOINTS =====

  // Public Endpoints
  async getPublicMenu(restaurantId: string) {
    return this.request(`/api/menus/${restaurantId}/menu`);
  }

  async getPublicOffers(restaurantId: string) {
    return this.request(`/api/offers/public/${restaurantId}`);
  }

  // Public: Get applied discounts for a session (no auth required — for QR customers)
  async getPublicSessionDiscounts(sessionId: string): Promise<SessionDiscountsApiResponse> {
    return this.request<SessionDiscountsApiResponse>(`/api/sessions/public-discounts/${sessionId}`);
  }

  // Place order as customer
  async placeOrder(data: {
    tableSessionId: string;
    restaurantId?: string;
    notes?: string;
    items: Array<{
      menuItemId: string;
      menuItemVariantId: string;
      quantity: number;
      itemNotes?: string;
      extras?: Array<{
        extraId: string;
        quantity?: number;
      }>;
    }>;
  }) {
    console.log('API Client - Placing order with data:', data);
    try {
      const result = await this.request(`/api/orders/make-order`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('API Client - Order placed successfully:', result);
      return result;
    } catch (error) {
      console.error('API Client - Order placement failed:', error);
      throw error;
    }
  }

  // Get orders for a session
  async getSessionOrders(tableSessionId: string) {
    return this.request(`/api/orders/${tableSessionId}`);
  }

  // Cancel order
  async cancelOrder(orderId: string) {
    return this.request(`/api/orders/${orderId}/cancel`, { method: 'PATCH' });
  }

  // Update order items
  async updateOrderItems(orderId: string, items: any[]) {
    return this.request(`/api/orders/${orderId}/items/update`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    });
  }

  // Get restaurant orders for managers
  async getRestaurantOrders(restaurantId: string, params?: { page?: number; limit?: number; status?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);

    return this.request<{
      orders: any[];
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/api/orders/restaurant/${restaurantId}/manager-orders?${query.toString()}`);
  }

  // Get session billing total
  async getSessionTotal(tableSessionId: string) {
    return this.request(`/api/billing/${tableSessionId}/total`);
  }

  // Generate final bill


  // Record payment
  async recordSessionPayment(tableSessionId: string, data: { amount: number; method: string; referenceNumber?: string }) {
    return this.request(`/api/payments/${tableSessionId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create reservation
  async createReservation(reservationId: string, data: any) {
    return this.request(`/api/reservations/${reservationId}/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get my reservations
  async getMyReservations() {
    return this.request(`/api/reservations/my`);
  }

  // Get reservation details
  async getReservation(reservationId: string) {
    return this.request(`/api/reservations/${reservationId}`);
  }

  // Cancel reservation
  async cancelReservation(reservationId: string, restaurantId: string) {
    return this.request(`/api/reservations/${reservationId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ restaurantId }),
    });
  }

  // Get user's past orders
  async getUserOrders(userId: string) {
    return this.request(`/api/orders/${userId}/user-orders`);
  }

  // ===== SESSION MANAGEMENT (STAFF) =====

  // Get all active sessions for a restaurant
  async getActiveSessions(restaurantId: string) {
    return this.request(`/api/sessions/restaurant/${restaurantId}/active-sessions`);
  }

  // Mark payment as complete
  async markPaymentComplete(sessionId: string) {
    return this.request(`/api/sessions/mark-payment-complete/${sessionId}`, {
      method: 'POST',
    });
  }

  // Emergency reset table
  async resetTable(tableId: string) {
    return this.request(`/api/sessions/reset-table/${tableId}`, {
      method: 'POST',
    });
  }

  // ===== ORDERS =====

  // Create manual order (for restaurant staff)
  async createManualOrder(data: {
    tableId: string;
    sessionId: string;
    items: Array<{
      variantId: string;
      quantity: number;
    }>;
    notes?: string;
  }) {
    return this.request('/api/orders/manual-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create POS order (for restaurant staff)
  async createPOSOrder(data: {
    restaurantId: string;
    tableNumber?: number;
    items: Array<{
      variantId: string;
      quantity: number;
      notes?: string;
    }>;
    customerName: string;
    customerPhone: string;
    type: "dine-in" | "takeaway";
  }) {
    return this.request('/api/orders/pos-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get notifications
  async getNotifications(restaurantId: string, limit: number = 20) {
    return this.request(`/api/notifications/${restaurantId}?limit=${limit}`);
  }

  // Mark notification as read
  async markNotificationRead(notificationId: string) {
    return this.request(`/api/notifications/${notificationId}/mark-read`, {
      method: 'PATCH',
    });
  }

  // Clear all notifications
  async clearAllNotifications(restaurantId: string) {
    return this.request(`/api/notifications/${restaurantId}/clear`, {
      method: 'DELETE',
    });
  }

  // Reviews

  async getRestaurantReviews(restaurantId: string, page: number = 1, limit: number = 10) {
    return this.request(`/api/reviews/${restaurantId}?page=${page}&limit=${limit}`);
  }

  async getSessionReviews(sessionId: string) {
    return this.request(`/api/reviews/session/${sessionId}`);
  }

  async updateReview(reviewId: string, data: {
    rating: number;
    reviewText?: string;
  }) {
    return this.request(`/api/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteReview(reviewId: string) {
    return this.request(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  // Session methods
  async getSessionById(sessionId: string) {
    return this.request(`/api/sessions/${sessionId}`);
  }

  async submitSessionReview(sessionId: string, data: {
    rating: number;
    reviewText?: string;
  }) {
    return this.request(`/api/reviews/session/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Loyalty & Vouchers
  async getLoyaltyStatus(restaurantId: string): Promise<LoyaltyStatusApiResponse> {
    return this.request<LoyaltyStatusApiResponse>(`/api/loyalty/loyalty/${restaurantId}/my-status`);
  }

  async getMyVouchers(restaurantId: string): Promise<VouchersApiResponse> {
    return this.request<VouchersApiResponse>(`/api/loyalty/vouchers/my-vouchers/${restaurantId}`);
  }

  async redeemVoucher(sessionId: string, voucherCode: string): Promise<RedeemVoucherApiResponse> {
    return this.request<RedeemVoucherApiResponse>('/api/loyalty/vouchers/redeem', {
      method: 'POST',
      body: JSON.stringify({ sessionId, voucherCode }),
    });
  }

  async getSessionDiscounts(sessionId: string): Promise<SessionDiscountsApiResponse> {
    return this.request<SessionDiscountsApiResponse>(`/api/loyalty/session/${sessionId}/available-discounts`);
  }

  async removeSessionDiscount(sessionId: string, discountId: string) {
    return this.request(`/api/loyalty/session/${sessionId}/discount/${discountId}`, {
      method: 'DELETE',
    });
  }

  // Customer-facing public offer apply (no auth required)
  async applyOffer(sessionId: string, data: { offerCode: string; restaurantId: string; subtotalPaise: number }) {
    return this.request<{
      success: boolean;
      message: string;
      discount?: {
        id: string;
        discountType: string;
        discountName: string;
        discountValue: number;
        discountSourceId: string;
        offerType: string;
        offerCode: string;
      }
    }>(`/api/sessions/apply-offer/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Customer-facing public offer remove (no auth required)
  async removeOffer(sessionId: string, discountId: string) {
    return this.request<{ success: boolean; message: string }>(
      `/api/sessions/remove-offer/${sessionId}/${discountId}`,
      { method: 'DELETE' }
    );
  }


  async awardLoyaltyPoints(sessionId: string, restaurantId: string, userId: string, amountPaid: number) {
    return this.request('/api/loyalty/loyalty/award-points', {
      method: 'POST',
      body: JSON.stringify({ sessionId, restaurantId, userId, amountPaid }),
    });
  }

  // Customer Orders
  async getMyOrders(): Promise<OrderHistoryApiResponse> {
    return this.request<OrderHistoryApiResponse>('/api/sessions/my-orders');
  }

  async getOrderDetails(sessionId: string): Promise<OrderDetailsApiResponse> {
    return this.request<OrderDetailsApiResponse>(`/api/sessions/my-orders/${sessionId}/details`);
  }

  // Reviews
  async submitReview(sessionId: string, restaurantId: string, rating: number, reviewText?: string) {
    return this.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ sessionId, restaurantId, rating, reviewText }),
    });
  }

  // Past Sessions
  async getPastSessions(restaurantId: string, params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    return this.request<{
      success: boolean;
      sessions: Array<{
        id: string;
        tableId: string;
        tableNumber: number;
        restaurantId: string;
        status: string;
        paymentStatus: string;
        startedAt: string;
        endedAt: string | null;
        billedAt: string | null;
        invoiceNumber: string | null;
        finalBillAmount: number;
        finalAmount: number;
        discountAmount: number;
        gstAmount: number;
        subtotal: number;
        createdByUserId: string | null;
        createdByName: string | null;
        discountPercentage: number;
        discountReason: string | null;
        orderCount: number;
        totalItems: number;
      }>;
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/api/sessions/past-sessions/${restaurantId}?${query.toString()}`);
  }

  async getPastSessionDetails(sessionId: string) {
    return this.request<{
      success: boolean;
      session: {
        id: string;
        tableId: string;
        tableNumber: number;
        restaurantId: string;
        restaurantName: string;
        restaurantAddress: string | null;
        restaurantPhone: string | null;
        status: string;
        paymentStatus: string;
        startedAt: string;
        endedAt: string | null;
        billedAt: string | null;
        invoiceNumber: string | null;
        finalBillAmount: number;
        discountAmount: number;
        gstAmount: number;
        subtotal: number;
        createdByUserId: string | null;
        discountPercentage: number;
        discountReason: string | null;
        createdByName: string | null;
      };
      orders: Array<{
        id: string;
        status: string;
        subtotal: number;
        discount: number;
        gst: number;
        grandTotal: number;
        createdAt: string;
        updatedAt: string;
        placedByUserId: string | null;
        placedByName: string | null;
        notes: string | null;
        items: Array<{
          orderId: string;
          menuItemId: string;
          menuItemName: string;
          variantId: string | null;
          variantName: string | null;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
          status: string;
          notes: string | null;
        }>;
        itemCount: number;
      }>;
      payments: Array<{
        id: string;
        amount: number;
        method: string;
        status: string;
        transactionId: string | null;
        createdAt: string;
        processedByName: string | null;
      }>;
      summary: {
        totalOrders: number;
        totalItems: number;
        totalAmount: number;
        totalPayments: number;
      };
    }>(`/api/sessions/past-session/${sessionId}`);
  }

  async getPastSessionOrderDetails(sessionId: string, orderId: string) {
    return this.request<{
      success: boolean;
      order: {
        id: string;
        tableSessionId: string;
        status: string;
        subtotal: number;
        discount: number;
        gst: number;
        grandTotal: number;
        createdAt: string;
        updatedAt: string;
        placedByUserId: string | null;
        placedByName: string | null;
        notes: string | null;
        tableNumber: number;
        restaurantName: string;
        items: Array<{
          id: string;
          menuItemId: string;
          menuItemName: string;
          variantId: string | null;
          variantName: string | null;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
          status: string;
          notes: string | null;
          createdAt: string;
          extras: Array<{
            id: string;
            name: string;
            quantity: number;
            price: number;
          }>;
        }>;
        itemCount: number;
      };
    }>(`/api/sessions/past-session/${sessionId}/order/${orderId}`);
  }

  async getPastSessionOrders() {
    return this.request<{
      success: boolean;
      orders: Array<{
        id: string;
        sessionId: string;
        sessionTableId: string;
        sessionTableNumber: number;
        sessionRestaurantId: string;
        sessionRestaurantName: string;
        sessionRestaurantAddress: string | null;
        sessionRestaurantPhone: string | null;
        sessionStartedAt: string;
        sessionEndedAt: string | null;
        sessionBilledAt: string | null;
        sessionInvoiceNumber: string | null;
        sessionFinalBillAmount: number;
        sessionDiscountAmount: number;
        sessionGstAmount: number;
        sessionSubtotal: number;
        sessionDiscountPercentage: number;
        sessionDiscountReason: string | null;
        status: string;
        subtotal: number;
        discount: number;
        gst: number;
        grandTotal: number;
        createdAt: string;
        updatedAt: string;
        placedByUserId: string | null;
        placedByName: string;
        notes: string | null;
        items: Array<{
          id: string;
          menuItemId: string;
          menuItemName: string;
          variantId: string | null;
          variantName: string | null;
          quantity: number;
          unitPrice: number;
          totalPrice: number;
          status: string;
          notes: string | null;
          createdAt: string;
          extras?: Array<{
            extraId: string;
            name: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
          }>;
        }>;
        itemCount: number;
      }>;
    }>('/api/sessions/past-sessions/orders');
  }

  // ===== EXTRAS ENDPOINTS =====

  // Get all extras for a restaurant
  async getExtras(restaurantId: string) {
    return this.request<{
      success: boolean;
      extras: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        isAvailable: boolean;
        isActive: boolean;
      }>;
    }>(`/api/extras/extras/${restaurantId}`);
  }

  // Get public extras for customers (only active/available)
  async getPublicExtras(restaurantId: string) {
    // Backend handles public/private logic in the same endpoint
    return this.request<{
      success: boolean;
      extras: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        isAvailable: boolean;
        isActive: boolean;
      }>;
    }>(`/api/extras/extras/${restaurantId}`);
  }

  // Create a new extra
  async createExtra(restaurantId: string, data: {
    name: string;
    description?: string;
    price?: number;
  }) {
    return this.request<{
      success: boolean;
      extra: {
        id: string;
        name: string;
        description: string | null;
        price: number;
        isAvailable: boolean;
        isActive: boolean;
      };
    }>(`/api/extras/extras/${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update an extra
  async updateExtra(extraId: string, data: {
    name?: string;
    description?: string;
    price?: number;
    isAvailable?: boolean;
    isActive?: boolean;
  }) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/extras/extras/${extraId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Get session details
  async getTableSession(sessionId: string) {
    return this.request<{
      success: boolean;
      data: {
        session: {
          sessionId: string;
          tableId: string | null;
          tableNumber: number;
          restaurantId: string;
          restaurantName: string;
          paymentStatus: string;
          status: string;
          startedAt: string;
          billedAt: string | null;
          discountPercentage: number;
          calculatedSubtotal: number;
          calculatedDiscount: number;
          calculatedGst: number;
          calculatedGrandTotal: number;
        };
        orders: any[];
        summary: any;
      };
    }>(`/api/sessions/${sessionId}`);
  }

  // Freeze bill (request payment)
  async freezeBill(sessionId: string) {
    return this.request<{
      success: boolean;
      message: string;
      data: any;
    }>(`/api/sessions/freeze-bill/${sessionId}`, {
      method: 'POST',
    });
  }

  // Delete an extra
  async deleteExtra(extraId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/extras/extras/${extraId}`, {
      method: 'DELETE',
    });
  }

  // Get extra assignments for a restaurant
  async getExtraAssignments(restaurantId: string) {
    return this.request<{
      success: boolean;
      assignments: Array<{
        id: string;
        extraId: string;
        extraName: string;
        extraPrice: number;
        categoryId: string | null;
        categoryName: string | null;
        menuItemId: string | null;
        menuItemName: string | null;
        variantId: string | null;
        variantName: string | null;
        isGlobal: boolean;
        isActive: boolean;
      }>;
    }>(`/api/extras/extras-assignments/${restaurantId}`);
  }

  // Create an extra assignment
  async createExtraAssignment(restaurantId: string, data: {
    extraId: string;
    categoryId?: string;
    menuItemId?: string;
    variantId?: string;
    isGlobal?: boolean;
  }) {
    return this.request<{
      success: boolean;
      assignment: {
        id: string;
        extraId: string;
        categoryId: string | null;
        menuItemId: string | null;
        variantId: string | null;
        isGlobal: boolean;
        isActive: boolean;
      };
    }>(`/api/extras/extras-assignments/${restaurantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Delete an extra assignment
  async deleteExtraAssignment(assignmentId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/extras/extras-assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  // Toggle isActive on a specific extra assignment (NOT the global extra definition)
  async toggleExtraAssignment(assignmentId: string, isActive: boolean) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/extras/extras-assignments/${assignmentId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async getAvailableExtras(restaurantId: string, params?: {
    categoryId?: string;
    menuItemId?: string;
    variantId?: string;
  }) {
    const queryParams = params ? new URLSearchParams(params as any).toString() : '';
    const url = `/api/extras/available-extras/${restaurantId}${queryParams ? `?${queryParams}` : ''}`;
    return this.request<{
      success: boolean;
      extras: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        assignmentId: string;
      }>;
    }>(url);
  }

  // Get public available extras for customers
  async getPublicAvailableExtras(restaurantId: string, params?: {
    categoryId?: string;
    menuItemId?: string;
    variantId?: string;
  }) {
    const queryParams = params ? new URLSearchParams(params as any).toString() : '';
    // Backend handles public/private logic in the same endpoint
    const url = `/api/extras/available-extras/${restaurantId}${queryParams ? `?${queryParams}` : ''}`;
    return this.request<{
      success: boolean;
      extras: Array<{
        id: string;
        name: string;
        description: string | null;
        price: number;
        assignmentId: string;
      }>;
    }>(url);
  }

  async getAdminAuditLogs() {
    return this.request<{ logs: any[] }>('/api/admin/audit-logs');
  }

  async getAdminUsers() {
    return this.request<{ users: any[] }>('/api/admin/users');
  }

  async updateAdminUserRole(userId: string, role: string) {
    return this.request<{ user: any }>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  // Favourites
  async getFavourites() {
    return this.request<{ favourites: any[] }>('/api/favourites');
  }

  async addFavourite(restaurantId: string) {
    return this.request('/api/favourites', {
      method: 'POST',
      body: JSON.stringify({ restaurantId }),
    });
  }

  async removeFavourite(restaurantId: string) {
    return this.request(`/api/favourites/${restaurantId}`, {
      method: 'DELETE',
    });
  }
}


export const apiClient = new ApiClient(BACKEND_URL);
export type { ApiError };
