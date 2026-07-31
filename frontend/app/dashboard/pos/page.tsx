"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { apiClient } from '@/lib/api-client';
import { Search, ShoppingCart, Plus, Minus, Trash2, User, CreditCard, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  variants: {
    id: string;
    name: string;
    price: number;
  }[];
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function POSPage() {
  const { restaurant, isLoading: dashboardLoading } = useDashboard();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // Order Details
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');

  useEffect(() => {
    if (restaurant?.id) {
      fetchMenu();
    }
  }, [restaurant]);

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getManagementMenu(restaurant!.id);
      setCategories((data as any).categories || []);
      setMenuItems((data as any).items || []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem, variant: { id: string; name: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.variantId === variant.id);
      if (existing) {
        return prev.map(i => i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        variantId: variant.id,
        name: `${item.name} (${variant.name})`,
        price: variant.price,
        quantity: 1
      }];
    });
    toast.success('Added to cart');
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.variantId === variantId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(i => i.variantId !== variantId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (orderType === 'dine-in' && !tableNumber) {
      toast.error('Please enter table number');
      return;
    }

    try {
      const payload = {
        restaurantId: restaurant!.id,
        tableNumber: orderType === 'dine-in' ? parseInt(tableNumber) : undefined,
        items: cart.map(i => ({
          variantId: i.variantId,
          quantity: i.quantity,
          notes: i.notes
        })),
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        type: orderType
      };

      await apiClient.createPOSOrder(payload);
      toast.success('Order placed successfully');
      setCart([]);
      setTableNumber('');
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error('Failed to place order');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <div className="p-8 text-center">Loading menu...</div>;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 overflow-hidden p-2">
      {/* Left: Menu Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-50"></div>
        {/* Header & Filters */}
        <div className="p-5 border-b border-gray-100 space-y-5 relative z-10">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Utensils className="w-6 h-6 text-red-600" />
              Point of Sale
            </h1>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl focus:border-red-200 focus:ring-4 focus:ring-red-600/10 outline-none text-sm font-medium transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide custom-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-200'
                  : 'bg-white border text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-gray-200'
                }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-red-200'
                    : 'bg-white border text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-gray-200'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:shadow-gray-200/50 hover:border-red-100 transition-all duration-300 group flex flex-col h-full">
                <div className="flex-1 mb-4">
                  <h3 className="font-black text-gray-900 tracking-tight leading-tight group-hover:text-red-600 transition-colors">{item.name}</h3>
                  {item.description && <p className="text-xs font-medium text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                </div>

                <div className="space-y-2.5 mt-auto">
                  {item.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => addToCart(item, variant)}
                      className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200 group/btn"
                    >
                      <span className="text-sm font-bold text-gray-700 group-hover/btn:text-red-700 transition-colors">{variant.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black tracking-tight">{formatPrice(variant.price)}</span>
                        <div className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover/btn:bg-red-600 group-hover/btn:border-red-600 group-hover/btn:text-white transition-all shadow-sm group-hover/btn:shadow-md">
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart Section */}
      <div className="w-full lg:w-96 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col overflow-hidden relative">
        <div className="p-5 border-b border-gray-100 bg-white relative z-10">
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            </div>
            Current Order
          </h2>
        </div>

        {/* Order Details Form */}
        <div className="p-5 border-b border-gray-100 space-y-4 bg-gray-50/50">
          <div className="flex gap-2 p-1 bg-gray-200/80 rounded-xl border border-gray-100">
            <button
              onClick={() => setOrderType('dine-in')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orderType === 'dine-in' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Dine In
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${orderType === 'takeaway' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Takeaway
            </button>
          </div>

          {orderType === 'dine-in' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 pl-1">Table Number</label>
              <input
                type="number"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-red-600/10 focus:border-red-400 outline-none transition-all shadow-sm"
                placeholder="e.g. 5"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 pl-1">Customer</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-red-600/10 focus:border-red-400 outline-none transition-all shadow-sm"
                placeholder="Name (Opt)"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5 pl-1">Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-red-600/10 focus:border-red-400 outline-none transition-all shadow-sm"
                placeholder="Phone (Opt)"
              />
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8 border-2 border-dashed border-gray-100 rounded-2xl">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                <Utensils className="w-8 h-8 opacity-40" />
              </div>
              <p className="text-sm font-bold text-gray-500">Cart is empty</p>
              <p className="text-xs font-medium text-gray-400 text-center">Add items from the menu to build your order</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.variantId}-${idx}`} className="flex justify-between items-start group bg-white p-3 rounded-xl border border-gray-100 hover:border-red-100 hover:shadow-sm transition-all animate-in fade-in slide-in-from-right-2">
                <div className="flex-1 pr-3">
                  <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{item.name}</p>
                  <p className="text-xs font-black text-gray-500">{formatPrice(item.price)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.variantId, -1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:text-red-600 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <span className="text-xs font-black w-6 text-center text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:text-red-600 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Total */}
        <div className="p-5 bg-white border-t border-gray-100 space-y-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10">
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Amount</span>
            <span className="text-2xl font-black text-gray-900 tracking-tight leading-none">{formatPrice(calculateTotal())}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:shadow-xl active:scale-[0.98] text-lg"
          >
            <CreditCard className="w-5 h-5" />
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading POS...</p>
    </div>
  )
}
