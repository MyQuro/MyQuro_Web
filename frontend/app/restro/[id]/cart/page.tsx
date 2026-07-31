"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import {
  Plus, Minus, ShoppingBag, ChevronLeft, Trash2, ArrowLeft, ChefHat
} from "lucide-react";
import { useParams } from "next/navigation";

// --- Types (same as menu page) ---
interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  imageURL?: string;
  isVeg?: boolean;
  isActive?: boolean;
  variants: MenuItemVariant[];
}

interface MenuItemVariant {
  id: string;
  variantName: string;
  price: number;
  isActive?: boolean;
  foodType?: string;
  portionSize?: string;
  imageURL?: string;
}

interface RestaurantDetails {
  restaurantName: string;
  restaurantBanner?: string;
  restaurantLogo?: string;
  cuisine?: string[];
  rating?: number;
  deliveryTimeEstimate?: string;
  city?: string;
  isOpen?: boolean;
  costForTwo?: number;
  discount?: string;
}

// --- Components ---
const VegIndicator = ({ isVeg }: { isVeg?: boolean }) => (
  <div className={`
    w-4 h-4 border flex items-center justify-center rounded-sm bg-white flex-shrink-0
    ${isVeg ? 'border-green-600' : 'border-red-600'}
  `}>
    <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

export default function CartPage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const [cart, setCart] = useState<{ [variantId: string]: number }>({});
  const [menuData, setMenuData] = useState<{ categories: MenuCategory[] } | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart-${restaurantId}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, [restaurantId]);

  // Fetch menu data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuRes, restRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/menus/${restaurantId}/menu`),
          fetch(`${BACKEND_URL}/api/restaurants/${restaurantId}`)
        ]);

        if (menuRes.ok && restRes.ok) {
          const menu = await menuRes.json();
          const rest = await restRes.json();
          setMenuData(menu);
          setRestaurant(rest.restaurant || rest);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [restaurantId, BACKEND_URL]);

  // Handle cart changes
  const handleCart = (variantId: string, delta: number) => {
    setCart(prev => {
      const next = (prev[variantId] || 0) + delta;
      const newCart = { ...prev };
      if (next <= 0) delete newCart[variantId];
      else newCart[variantId] = next;
      localStorage.setItem(`cart-${restaurantId}`, JSON.stringify(newCart));
      return newCart;
    });
  };

  // Get cart items with details
  const cartItems = useMemo(() => {
    if (!menuData) return [];

    const items: Array<{
      variant: MenuItemVariant;
      item: MenuItem;
      quantity: number;
    }> = [];

    const variantMap: Record<string, { variant: MenuItemVariant; item: MenuItem }> = {};
    menuData.categories.forEach(cat =>
      cat.items.forEach(item =>
        item.variants.forEach(v => {
          variantMap[v.id] = { variant: v, item };
        })
      )
    );

    Object.entries(cart).forEach(([vid, qty]) => {
      const data = variantMap[vid];
      if (data) {
        items.push({ ...data, quantity: qty });
      }
    });

    return items;
  }, [cart, menuData]);

  // Calculate totals
  const { cartCount, cartTotal } = useMemo((): { cartCount: number; cartTotal: number } => {
    let count = 0, total = 0;
    cartItems.forEach(({ variant, quantity }) => {
      count += quantity;
      total += variant.price * quantity;
    });
    return { cartCount: count, cartTotal: total };
  }, [cartItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link href={`/restro/${restaurantId}/menu`} className="p-2 rounded-full bg-gray-100">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">Your Cart</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <ShoppingBag size={64} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 text-center mb-6">Add some delicious items from the menu</p>
          <Link
            href={`/restro/${restaurantId}/menu`}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/restro/${restaurantId}/menu`} className="p-2 rounded-full bg-gray-100">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Your Cart</h1>
          <div className="ml-auto text-sm text-gray-600">
            {cartCount} item{cartCount !== 1 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* Cart Items */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {cartItems.map(({ variant, item, quantity }) => (
            <div key={variant.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                  {variant.imageURL || item.imageURL ? (
                    <img
                      src={variant.imageURL || item.imageURL}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <ChefHat size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <VegIndicator isVeg={item.isVeg} />
                        <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{variant.variantName}</p>
                      <p className="text-sm font-semibold text-red-600">₹{variant.price}</p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 ml-4">
                      <button
                        onClick={() => handleCart(variant.id, -1)}
                        className="p-1 bg-white rounded hover:bg-gray-100"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-bold px-2 min-w-[2rem] text-center">{quantity}</span>
                      <button
                        onClick={() => handleCart(variant.id, 1)}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="font-semibold">₹{variant.price * quantity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm mt-6">
          <h3 className="font-semibold mb-4">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Items total</span>
              <span>₹{cartTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery fee</span>
              <span>₹40</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>₹{(cartTotal * 0.18).toFixed(0)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{(cartTotal + 40 + cartTotal * 0.18).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="mt-6">
          <button className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors">
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}