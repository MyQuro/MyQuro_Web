"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard-context';
import { useWebSocket } from '@/lib/websocket-context';
import {
  Plus, Minus, ShoppingCart, ChevronLeft, Search, X,
  ChefHat, ArrowRight, Receipt, Trash2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

// --- Types ---

// Unique key generation for cart items based on variant and extras
const generateCartKey = (variantId: string, extras: CartExtra[]) => {
  const sortedExtras = [...extras].sort((a, b) => a.extraId.localeCompare(b.extraId));
  const extrasString = sortedExtras.map(e => `${e.extraId}:${e.quantity}`).join('|');
  return `${variantId}|${extrasString}`;
};

interface MenuItemVariant {
  id: string;
  variantName: string;
  price: number;
  portionSize?: string;
  available: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  isVeg: boolean;
  imageURL?: string;
  variants: MenuItemVariant[];
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

// Simplified Extra for internal logic
interface CartExtra {
  extraId: string;
  name: string;
  price: number;
  quantity: number;
}

// The actual item stored in the cart
interface CartItemEntry {
  key: string; // Unique signature
  variantId: string;
  itemId: string;
  itemName: string;
  variantName: string;
  basePrice: number;
  isVeg: boolean;
  quantity: number;
  extras: CartExtra[];
}

interface IndependentExtraEntry {
  extraId: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
}

// --- Components ---

const VegBadge = ({ isVeg, size = 'md' }: { isVeg: boolean, size?: 'sm' | 'md' }) => (
  <div
    className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} border flex items-center justify-center rounded-[3px] shrink-0 bg-white ${isVeg ? 'border-green-600' : 'border-red-600'
      }`}
  >
    <div className={`${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

// --- Item Modal (Customer Page Style) ---
const ItemModal = ({
  item,
  onClose,
  onAddToOrder,
  availableExtras
}: {
  item: MenuItem;
  onClose: () => void;
  onAddToOrder: (variantId: string, quantity: number, extras: CartExtra[]) => void;
  availableExtras: any[];
}) => {
  // Local state for the configuration being built
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    item.variants.find(v => v.available)?.id || item.variants[0]?.id
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([]);

  const selectedVariant = item.variants.find(v => v.id === selectedVariantId);

  const finalTotal = useMemo(() => {
    if (!selectedVariant) return 0;
    const extrasSum = selectedExtras.reduce((acc, extra) => {
      const extraData = availableExtras.find(e => e.id === extra.extraId);
      return acc + ((extraData?.price || 0) * extra.quantity);
    }, 0);
    return (selectedVariant.price + extrasSum) * quantity;
  }, [selectedVariant, selectedExtras, quantity, availableExtras]);

  const handleAdd = () => {
    if (!selectedVariant) return;

    onAddToOrder(selectedVariant.id, quantity, selectedExtras);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="bg-gray-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-48 sm:h-56 shrink-0 bg-white">
          {item.imageURL ? (
            <Image src={item.imageURL} alt={item.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300"><ChefHat size={56} /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40 transition-colors z-10">
            <X size={20} />
          </button>

          <div className="absolute bottom-4 left-4 right-4 text-white z-10 flex items-end justify-between">
            <div className="flex-1 pr-4">
              <div className="mb-2"><VegBadge isVeg={item.isVeg} /></div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight drop-shadow-md">{item.name}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          {item.description && <p className="text-gray-600 text-sm mb-6 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">{item.description}</p>}

          {/* Variant Selection */}
          <div className="mb-8">
            <h4 className="font-black text-gray-900 mb-4 tracking-tight flex items-center gap-2">
              Choose Option <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
            </h4>
            <div className="space-y-3">
              {item.variants.filter(v => v.available).map(variant => (
                <div
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${selectedVariantId === variant.id ? 'border-blue-600 bg-blue-50/50 shadow-sm shadow-blue-100' : 'border-transparent bg-white shadow-sm hover:border-gray-200'}`}
                >
                  <div className="flex-1">
                    <p className={`font-bold text-sm sm:text-base ${selectedVariantId === variant.id ? 'text-blue-700' : 'text-gray-900'}`}>{variant.variantName}</p>
                    {variant.portionSize && <p className="text-xs font-medium text-gray-500 mt-1">{variant.portionSize}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-black text-gray-900">{formatPrice(variant.price)}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedVariantId === variant.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                      {selectedVariantId === variant.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extras Selection - Optional */}
          {availableExtras.length > 0 && (
            <div className="mb-4">
              <h4 className="font-black text-gray-900 mb-4 tracking-tight flex items-center gap-2">
                Add-ons <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Optional</span>
              </h4>
              <div className="space-y-3">
                {availableExtras.map(extra => {
                  const selectedExtra = selectedExtras.find(e => e.extraId === extra.id);
                  return (
                    <div
                      key={extra.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${selectedExtra ? 'border-blue-600 bg-blue-50/50 shadow-sm shadow-blue-100' : 'border-transparent bg-white shadow-sm hover:border-gray-200'}`}
                    >
                      <div className="flex-1 pr-4">
                        <p className={`font-bold text-sm ${selectedExtra ? 'text-blue-700' : 'text-gray-900'}`}>{extra.name}</p>
                        {extra.description && <p className="text-xs font-medium text-gray-500 mt-1 leading-relaxed">{extra.description}</p>}
                        <p className="text-sm font-black text-gray-900 mt-1.5">{formatPrice(extra.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedExtra ? (
                          <div className="flex items-center bg-white border border-gray-200 rounded-xl h-9 shadow-sm">
                            <button
                              onClick={() => setSelectedExtras(prev => prev.map(e =>
                                e.extraId === extra.id
                                  ? { ...e, quantity: Math.max(0, e.quantity - 1) }
                                  : e
                              ).filter(e => e.quantity > 0))}
                              className="w-9 h-full flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-l-xl transition-colors"
                            >
                              <Minus size={14} strokeWidth={2.5} />
                            </button>
                            <span className="w-8 text-center text-sm font-black text-gray-900">{selectedExtra.quantity}</span>
                            <button
                              onClick={() => setSelectedExtras(prev => prev.map(e =>
                                e.extraId === extra.id
                                  ? { ...e, quantity: e.quantity + 1 }
                                  : e
                              ))}
                              className="w-9 h-full flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-r-xl transition-colors"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedExtras(prev => [...prev, { extraId: extra.id, name: extra.name, price: extra.price, quantity: 1 }])}
                            className="px-5 py-2 bg-white border border-gray-200 text-blue-600 rounded-xl font-bold shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-colors"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-gray-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-xl h-11 p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>
              <span className="w-10 text-center font-black text-gray-900 text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-full flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Item Total</p>
              <p className="text-2xl font-black text-gray-900 leading-none">{formatPrice(finalTotal)}</p>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!selectedVariantId}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black py-4 rounded-2xl disabled:opacity-50 hover:from-blue-700 hover:to-blue-800 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
          >
            Add item to cart <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function StaffMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurant } = useDashboard();
  const { isConnected } = useWebSocket();

  const sessionId = searchParams.get('sessionId');
  const tableId = searchParams.get('tableId');
  const tableNumber = searchParams.get('tableNumber');

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Revised Cart State: Array of distinct items
  const [cartItems, setCartItems] = useState<CartItemEntry[]>([]);
  const [independentExtras, setIndependentExtras] = useState<IndependentExtraEntry[]>([]);
  const [kitchenNotes, setKitchenNotes] = useState('');

  const [extras, setExtras] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Load Data
  useEffect(() => {
    if (!restaurant) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const [menuRes, extrasRes, assignRes] = await Promise.all([
          apiClient.getManagementMenu(restaurant.id),
          apiClient.getExtras(restaurant.id),
          apiClient.getExtraAssignments(restaurant.id)
        ]);

        setCategories((menuRes as any).categories?.map((c: any) => ({
          id: c.id,
          name: c.category,
          items: c.items || []
        })) || []);

        setExtras(extrasRes.extras || []);
        setAssignments(assignRes.assignments || []);
      } catch (e) {
        toast.error("Failed to load menu");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [restaurant]);

  // --- Cart Logic Redesigned ---

  const addToCart = useCallback((variantId: string, quantity: number, selectedExtras: CartExtra[]) => {
    // 1. Find Item Details
    let foundItem: MenuItem | undefined;
    let foundVariant: MenuItemVariant | undefined;

    for (const cat of categories) {
      for (const item of cat.items) {
        const v = item.variants.find(v => v.id === variantId);
        if (v) { foundItem = item; foundVariant = v; break; }
      }
      if (foundVariant) break;
    }

    if (!foundItem || !foundVariant) return;

    // 2. Generate Unique Signature (Key)
    const key = generateCartKey(variantId, selectedExtras);

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.key === key);

      if (existingIndex > -1) {
        // Item with exact same config exists, update quantity
        const newCart = [...prev];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      } else {
        // Add new line item
        return [...prev, {
          key,
          variantId,
          itemId: foundItem!.id,
          itemName: foundItem!.name,
          variantName: foundVariant!.variantName,
          basePrice: foundVariant!.price,
          isVeg: foundItem!.isVeg,
          quantity: quantity,
          extras: selectedExtras
        }];
      }
    });

    toast.success('Added to order');
  }, [categories]);

  const updateCartItemQuantity = (key: string, delta: number) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.key === key) {
          return { ...item, quantity: Math.max(0, item.quantity + delta) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeCartItem = (key: string) => {
    setCartItems(prev => prev.filter(item => item.key !== key));
  };

  // Independent Extras Logic
  const addIndependentExtra = (extraId: string) => {
    const extraInfo = extras.find(e => e.id === extraId);
    if (!extraInfo) return;

    setIndependentExtras(prev => {
      const existing = prev.find(e => e.extraId === extraId);
      if (existing) {
        return prev.map(e => e.extraId === extraId ? { ...e, quantity: e.quantity + 1 } : e);
      }
      return [...prev, { extraId, name: extraInfo.name, price: extraInfo.price, quantity: 1, description: extraInfo.description }];
    });
  };

  const updateIndependentExtraQty = (extraId: string, delta: number) => {
    setIndependentExtras(prev => prev.map(e =>
      e.extraId === extraId ? { ...e, quantity: Math.max(0, e.quantity + delta) } : e
    ).filter(e => e.quantity > 0));
  };

  // --- Filtering ---
  const filteredCategories = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => {
        if (vegOnly && !item.isVeg) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return item.name.toLowerCase().includes(q) || item.variants.some(v => v.variantName.toLowerCase().includes(q));
        }
        return true;
      })
    })).filter(cat => cat.items.length > 0 && (activeCategory === 'all' || cat.id === activeCategory));
  }, [categories, vegOnly, searchQuery, activeCategory]);

  const getExtrasForItem = useCallback((item: MenuItem) => {
    // Determine which extras apply to this item based on assignments
    if (!item) return [];
    const catId = item.categoryId;
    const applicable = assignments.filter(a =>
      a.isGlobal ||
      a.menuItemId === item.id ||
      a.categoryId === catId
    ).map(a => a.extraId);
    return extras.filter(e => applicable.includes(e.id));
  }, [assignments, extras]);

  // Totals
  const cartTotal = useMemo(() => {
    const itemsTotal = cartItems.reduce((sum, item) => {
      const extrasCost = item.extras.reduce((s, e) => s + (e.price * e.quantity), 0);
      return sum + ((item.basePrice + extrasCost) * item.quantity); // Logic assumes extras are PER item unit
    }, 0);
    const indepTotal = independentExtras.reduce((sum, e) => sum + (e.price * e.quantity), 0);
    return itemsTotal + indepTotal;
  }, [cartItems, independentExtras]);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0) + independentExtras.reduce((s, i) => s + i.quantity, 0);

  // --- Actions ---
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 && independentExtras.length === 0) return toast.error("Cart is empty");
    if (!restaurant) return toast.error("Restaurant information not available");

    const loadingToast = toast.loading("Placing order...");
    try {
      const payloadItems = [
        ...cartItems.map(item => ({
          menuItemId: item.itemId,
          menuItemVariantId: item.variantId,
          quantity: item.quantity,
          itemNotes: '',
          extras: item.extras.map(e => ({ extraId: e.extraId, quantity: e.quantity }))
        })),
        ...independentExtras.map(e => ({
          menuItemId: '', // Empty string for independent extras
          menuItemVariantId: '', // Empty string for independent extras
          quantity: e.quantity,
          itemNotes: `Independent extra: ${e.name}`,
          extras: [{ extraId: e.extraId, quantity: e.quantity }]
        }))
      ];

      await apiClient.placeOrder({
        tableSessionId: sessionId!,
        restaurantId: restaurant.id,
        items: payloadItems,
        notes: kitchenNotes
      });

      setCartItems([]);
      setIndependentExtras([]);
      setKitchenNotes('');
      setShowMobileCart(false);
      toast.success("Order Placed!", { id: loadingToast });
    } catch (e) {
      toast.error("Failed to place order", { id: loadingToast });
    }
  };

  const handleRequestBill = async () => {
    if (!restaurant) return toast.error("Restaurant information not available");

    const loadingToast = toast.loading("Requesting bill...");
    try {
      await apiClient.generateBill(sessionId!, {
        discountPercentage: 0, // Default to 0, staff can modify later
        taxRate: 0, // Will be calculated from restaurant settings
        restaurantId: restaurant.id
      });

      toast.success("Bill requested successfully!", { id: loadingToast });
    } catch (e) {
      toast.error("Failed to request bill", { id: loadingToast });
    }
  };

  if (loading) return <div className="h-dvh flex items-center justify-center"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-50 overflow-hidden text-gray-900 font-sans">

      {/* --- Fixed Header --- */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-20">
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-black leading-tight">Table {tableNumber}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setVegOnly(!vegOnly)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${vegOnly ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>
              <VegBadge isVeg={true} size="sm" /> Veg
            </button>
            <button onClick={handleRequestBill} aria-label="Request Bill" className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
              <Receipt size={18} />
            </button>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="pb-2 px-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-gray-900 focus:bg-white outline-none transition-all"
            />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full"><X size={12} /></button>}
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            <button onClick={() => setActiveCategory('all')} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              All
            </button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`flex-none px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === c.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* --- Main Content (Scrollable) --- */}
      <div className="flex-1 min-h-0 flex relative">
        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-3 scroll-smooth">
          {filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search size={40} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No items found</p>
            </div>
          ) : (
            <div className="space-y-6 pb-24 lg:pb-6">
              {filteredCategories.map(cat => (
                <div key={cat.id} className="pt-2">
                  <h2 className="text-xl font-black text-gray-900 mb-4 px-1 flex items-center gap-2">
                    {cat.name}
                    <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.items.length}</span>
                  </h2>
                  {/* Responsive Grid: More columns, smaller cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {cat.items.map(item => {
                      const minPrice = Math.min(...item.variants.map(v => v.price));
                      return (
                        <div
                          key={item.id}
                          onClick={() => { setSelectedItemForModal(item); setShowItemModal(true); }}
                          className="bg-white rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden flex flex-row sm:flex-col h-full active:scale-[0.98] transition-all duration-300 cursor-pointer hover:border-blue-200 hover:shadow-md group"
                        >
                          {/* Mobile layout: Image left. Desktop layout: Image top. */}
                          <div className="w-28 sm:w-full h-28 sm:h-36 shrink-0 bg-gray-50 relative overflow-hidden">
                            {item.imageURL ? (
                              <Image src={item.imageURL} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 112px, 200px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><ChefHat size={28} /></div>
                            )}
                            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-md px-1.5 py-1 shadow-sm"><VegBadge isVeg={item.isVeg} size="sm" /></div>
                          </div>

                          <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors">{item.name}</h3>
                              {item.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3 sm:mb-0">{item.description}</p>
                              )}
                            </div>

                            <div className="mt-auto pt-3 sm:pt-4 flex items-center justify-between">
                              <span className="text-sm sm:text-base font-black text-gray-900 tracking-tight">{formatPrice(minPrice)}</span>
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-gray-200 text-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:shadow-md transition-all duration-300">
                                <Plus size={18} strokeWidth={2.5} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Independent Extras Grid */}
              {/* {extras.length > 0 && (
                <div className="mt-8 border-t border-dashed border-gray-200 pt-6">
                  <h2 className="text-sm font-black text-gray-900 mb-2 px-1">Quick Extras</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {extras.map(e => {
                      const qty = independentExtras.find(ie => ie.extraId === e.id)?.quantity || 0;
                      return (
                        <div key={e.id} className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${qty > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'}`}>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{e.name}</p>
                            <p className="text-[10px] text-gray-500">{formatPrice(e.price)}</p>
                          </div>
                          {qty === 0 ? (
                            <button onClick={() => addIndependentExtra(e.id)} className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-600"><Plus size={14}/></button>
                          ) : (
                            <div className="flex flex-col gap-1 items-center">
                               <button onClick={() => updateIndependentExtraQty(e.id, 1)} className="w-6 h-5 bg-amber-200 rounded-t flex items-center justify-center text-amber-800 text-[10px]"><Plus size={10}/></button>
                               <span className="text-xs font-bold leading-none">{qty}</span>
                               <button onClick={() => updateIndependentExtraQty(e.id, -1)} className="w-6 h-5 bg-amber-200 rounded-b flex items-center justify-center text-amber-800 text-[10px]"><Minus size={10}/></button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )} */}
            </div>
          )}
        </div>

        {/* Desktop Cart Sidebar (Fixed Width) */}
        <div className="hidden lg:flex w-80 bg-white border-l border-gray-200 flex-col shadow-xl z-10">
          <CartContent
            cartItems={cartItems}
            independentExtras={independentExtras}
            total={cartTotal}
            onUpdateQty={updateCartItemQuantity}
            onRemove={removeCartItem}
            onUpdateIndepQty={updateIndependentExtraQty}
            onPlaceOrder={handlePlaceOrder}
            notes={kitchenNotes}
            setNotes={setKitchenNotes}
            tableNumber={tableNumber}
            clear={() => { setCartItems([]); setIndependentExtras([]); }}
          />
        </div>
      </div>

      {/* --- Mobile Cart Overlay --- */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 lg:hidden isolate">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileCart(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl h-[80dvh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-black">Your Order</h2>
              <button onClick={() => setShowMobileCart(false)} className="p-2 bg-gray-100 rounded-full"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <CartContent
                cartItems={cartItems}
                independentExtras={independentExtras}
                total={cartTotal}
                onUpdateQty={updateCartItemQuantity}
                onRemove={removeCartItem}
                onUpdateIndepQty={updateIndependentExtraQty}
                onPlaceOrder={handlePlaceOrder}
                notes={kitchenNotes}
                setNotes={setKitchenNotes}
                tableNumber={tableNumber}
                clear={() => { setCartItems([]); setIndependentExtras([]); }}
                isMobile
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Mobile) */}
      {!showMobileCart && cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-gray-900 text-white h-14 rounded-xl shadow-lg flex items-center justify-between px-4 animate-in slide-in-from-bottom duration-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white text-gray-900 rounded-full flex items-center justify-center font-bold text-sm">
                {cartCount}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
                <span className="text-sm font-bold leading-none">{formatPrice(cartTotal)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold">
              View Cart <ArrowRight size={16} />
            </div>
          </button>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && selectedItemForModal && (
        <ItemModal
          item={selectedItemForModal}
          availableExtras={getExtrasForItem(selectedItemForModal)}
          onClose={() => { setShowItemModal(false); setSelectedItemForModal(null); }}
          onAddToOrder={addToCart}
        />
      )}
    </div>
  );
}

// --- Cart Content Component ---
function CartContent({
  cartItems, independentExtras, total, onUpdateQty, onRemove, onUpdateIndepQty, onPlaceOrder, notes, setNotes, tableNumber, clear, isMobile
}: any) {
  const isEmpty = cartItems.length === 0 && independentExtras.length === 0;

  if (isEmpty) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
      <ShoppingCart size={48} className="mb-4 opacity-20" />
      <p className="text-sm font-medium">Cart is empty</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Scrollable Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Main Items */}
        {cartItems.map((item: CartItemEntry) => (
          <div key={item.key} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-blue-100 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2 max-w-[70%]">
                <div className="pt-0.5"><VegBadge isVeg={item.isVeg} size="sm" /></div>
                <div>
                  <h4 className="font-bold text-[15px] text-gray-900 leading-tight">{item.itemName}</h4>
                  <p className="text-sm font-medium text-gray-500 mt-0.5">{item.variantName}</p>
                </div>
              </div>
              <span className="font-black text-gray-900">{formatPrice((item.basePrice + item.extras.reduce((s, e) => s + (e.price * e.quantity), 0)) * item.quantity)}</span>
            </div>

            {item.extras.length > 0 && (
              <div className="mb-3 pl-6 space-y-1">
                {item.extras.map((e, idx) => (
                  <div key={idx} className="text-[11px] font-bold tracking-wide text-blue-700 bg-blue-50 border border-blue-100/50 inline-block px-2 py-0.5 rounded-md mr-1.5">
                    + {e.quantity} {e.name}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pl-6 mt-3">
              <button onClick={() => onRemove(item.key)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl h-9 shadow-sm">
                <button onClick={() => onUpdateQty(item.key, -1)} className="w-9 h-full flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-l-xl transition-colors"><Minus size={14} strokeWidth={2.5} /></button>
                <span className="w-8 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.key, 1)} className="w-9 h-full flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-r-xl transition-colors"><Plus size={14} strokeWidth={2.5} /></button>
              </div>
            </div>
          </div>
        ))}

        {/* Independent Extras */}
        {independentExtras.map((e: IndependentExtraEntry) => (
          <div key={e.extraId} className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-gray-800">{e.name}</span>
              <span className="font-bold text-sm text-gray-900">{formatPrice(e.price * e.quantity)}</span>
            </div>
            <div className="flex items-center justify-end">
              <div className="flex items-center bg-white border border-amber-200 rounded-lg h-7">
                <button onClick={() => onUpdateIndepQty(e.extraId, -1)} className="w-7 h-full flex items-center justify-center text-amber-700 hover:bg-amber-50 rounded-l-lg"><Minus size={12} /></button>
                <span className="w-6 text-center text-xs font-bold">{e.quantity}</span>
                <button onClick={() => onUpdateIndepQty(e.extraId, 1)} className="w-7 h-full flex items-center justify-center text-amber-700 hover:bg-amber-50 rounded-r-lg"><Plus size={12} /></button>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-4">
          <textarea
            placeholder="Kitchen Instructions (Optional)"
            className="w-full text-xs p-3 rounded-xl border-gray-200 border resize-none focus:ring-1 focus:ring-gray-900 outline-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-10">
        <div className="flex justify-between items-end mb-4 px-1">
          <span className="text-gray-500 font-bold text-sm">Amount to Pay</span>
          <span className="text-2xl font-black text-gray-900 tracking-tight">{formatPrice(total)}</span>
        </div>
        <div className="flex gap-3">
          <button onClick={clear} className="px-5 py-3.5 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 text-sm transition-colors active:scale-95">Clear Cart</button>
          <button onClick={onPlaceOrder} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black rounded-2xl py-3.5 text-base shadow-lg shadow-blue-200 active:scale-95 transition-all text-center">
            Confirm Order
          </button>
        </div>
      </div>
    </div>
  );
}