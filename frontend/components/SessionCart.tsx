"use client";

import { useState } from 'react';
import { ShoppingBag, Loader2, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';
import toast from 'react-hot-toast';

interface CartItem {
  variantId: string;
  menuItemId: string;
  menuItemName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
}

interface SessionCartProps {
  cart: CartItem[];
  restaurantId: string;
  onOrderPlaced?: () => void;
}

export default function SessionCart({ cart, restaurantId, onOrderPlaced }: SessionCartProps) {
  const router = useRouter();
  const { session } = useSession();
  const [placing, setPlacing] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!session?.sessionId) {
      // If no session, redirect to table selection
      router.push(`/restro/${restaurantId}/select-table?restaurantId=${restaurantId}`);
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setPlacing(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      
      const items = cart.map(item => ({
        menuItemId: item.menuItemId,
        menuItemVariantId: item.variantId,
        quantity: item.quantity,
      }));

      const response = await fetch(`${BACKEND_URL}/api/orders/make-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tableSessionId: session.sessionId,
          restaurantId,
          items,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      const data = await response.json();
      console.log('Order placed:', data);

      toast.success('Order placed successfully!');
      
      if (onOrderPlaced) {
        onOrderPlaced();
      }

      // Redirect to session summary
      router.push(`/session/${session.sessionId}`);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const handleViewSession = () => {
    if (session?.sessionId) {
      router.push(`/session/${session.sessionId}`);
    }
  };

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  if (cart.length === 0 && !session?.sessionId) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-red-600 shadow-2xl z-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Session Info */}
        {session?.sessionId && (
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Receipt className="w-4 h-4" />
              <span>
                {session.tableNumber ? `Table ${session.tableNumber}` : 'Takeaway Order'}
              </span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Active Session
              </span>
            </div>
            <button
              onClick={handleViewSession}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View All Orders →
            </button>
          </div>
        )}

        {/* Cart Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
              </p>
              <p className="text-sm text-gray-500">
                Total: {formatPrice(totalAmount)}
              </p>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={placing || cart.length === 0}
            className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {placing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <>
                <span>{session?.sessionId ? 'Place Order' : 'Select Table & Order'}</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
