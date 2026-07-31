import { useState, useCallback } from 'react';

// Centralized Backend URL logic
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://myquro.com');

interface ApiResponse {
  request?: {
    requestStatus?: string;
    adminRemark?: string;
    requestedAt?: string;
    createdAt?: string;
  };
  restaurant?: {
    restaurantName?: string;
    restaurantType?: string;
    restaurantAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phoneNumber?: string;
    email?: string;
  };
  message?: string;
}

export function useRestaurantRequest() {
  const [requestData, setRequestData] = useState<{
    status?: string;
    restaurantName?: string;
    restaurantType?: string;
    restaurantAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phoneNumber?: string;
    email?: string;
    adminRemark?: string;
    createdAt?: string;
    error?: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(false);

  const fetchRequestData = useCallback(async () => {
    setLoading(true);

    // List of candidates to try fetching from (resilience logic from your original code)
    const candidates = Array.from(
      new Set([
        process.env.NEXT_PUBLIC_BACKEND_URL,
        typeof window !== 'undefined' ? window.location.origin : undefined,
        'https://myquro.com',
        'https://api.myquro.com',
      ].filter(Boolean))
    );

    let succeeded = false;

    for (const base of candidates) {
      try {
        const response = await fetch(`${base}/api/restaurants/view-request`, {
          method: 'GET',
          credentials: 'include',
        });

        // Handle non-JSON responses gracefully
        let data: ApiResponse = {};
        try {
          data = await response.json();
        } catch {
          // ignore parsing error, handled by status check below
        }

        if (response.ok && data && data.request) {
          const { request, restaurant } = data;
          setRequestData({
            status: request?.requestStatus?.toLowerCase(),
            restaurantName: restaurant?.restaurantName,
            restaurantType: restaurant?.restaurantType,
            restaurantAddress: restaurant?.restaurantAddress,
            city: restaurant?.city,
            state: restaurant?.state,
            postalCode: restaurant?.postalCode,
            phoneNumber: restaurant?.phoneNumber,
            email: restaurant?.email,
            adminRemark: request?.adminRemark,
            createdAt: request?.requestedAt || request?.createdAt,
          });
          succeeded = true;
          break; // Stop loop on success
        }

        // Handle specific 404/No Application cases
        if (!response.ok) {
          const msg = data?.message || '';
          if (msg.toLowerCase().includes('restaurant not found') || msg.toLowerCase().includes('no restaurant request')) {
            setRequestData({ error: 'You have not applied for a restaurant yet.' });
            succeeded = true;
            break;
          }
        }
      } catch {
        // Continue to next candidate on network error
        continue;
      }
    }

    if (!succeeded) {
      // If we tried all candidates and none worked (or all failed silently), set a default state
      // Note: We avoid overwriting specific error messages set during the loop if possible, 
      // but for simplicity, if succeeded is false, we assume fetch failed.
      if (!requestData?.error) { 
         setRequestData((prev) => prev?.error ? prev : { error: 'You have not applied for a restaurant yet.' });
      }
    }

    setLoading(false);
  }, [requestData]);

  return { requestData, loading, fetchRequestData };
}