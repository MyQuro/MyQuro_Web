"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, Plus, Minus, Star,
  ChevronLeft, ChevronRight, X, Clock,
  Leaf, Receipt, Share2, Percent, Tag, Settings2, SlidersHorizontal, ChevronDown, ArrowUpDown,
  Users, Package, CheckCircle, QrCode, Camera, ShoppingCart, Utensils, CheckCircle2, Trash2, MapPin, Phone,
  Sparkles, TrendingUp, TrendingDown
} from "lucide-react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import QRScanner from '@/components/QRScanner';
import OffersPanel from '@/components/OffersPanel';
import { useSession } from '@/lib/session-context';
import { apiClient } from '@/lib/api-client';

// --- Types (Unchanged) ---
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
  categoryId?: string;
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
  defaultGstPercentage?: string | number;
}

interface MenuItemExtra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  isActive: boolean;
}

interface ExtraAssignment {
  extraId: string;
  categoryId?: string | null;
  menuItemId?: string | null;
  variantId?: string | null;
  isGlobal?: boolean;
  isActive: boolean;
}

interface CartItem {
  variantId: string;
  categoryId: string;
  quantity: number;
  extras?: Array<{
    extraId: string;
    quantity: number;
  }>;
  extrasAppliedToAll?: boolean; // true = apply extras to all items, false = apply only to first item
}


interface Offer {
  id: string;
  name: string;
  description: string | null;
  offerType: string;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  applicableCategoryId?: string | null;
  scope?: string;
  code: string;
  endDate: string;
}


// --- Helper Components (Restyled) ---

const VegIndicator = ({ isVeg }: { isVeg?: boolean }) => (
  <div className={`
    w-4 h-4 border-[1.5px] flex items-center justify-center rounded-[4px] flex-shrink-0 mt-1
    ${isVeg ? 'border-green-600' : 'border-red-600'}
  `}>
    <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

// --- Main Page Component ---

export default function RestaurantMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const restaurantId = params.id as string;
  const urlSessionId = searchParams?.get('session');
  const urlTableId = searchParams?.get('tableId');

  // Session Context
  const { session: contextSession, setSession: setContextSession } = useSession();
  const [hasValidSession, setHasValidSession] = useState(false);
  const [sessionCheckLoading, setSessionCheckLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [sessionValidationDone, setSessionValidationDone] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState<{
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
  } | null>(null);

  // Data State
  const [menuData, setMenuData] = useState<{ categories: MenuCategory[] } | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    tableNumber: string | null;
    status: string;
    paymentStatus: string;
    billedAt?: string | null;
    totalOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Computed session ID
  const sessionId = urlSessionId || contextSession?.sessionId || null;

  // UI State
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [vegMode, setVegMode] = useState(false);
  const [nonVegMode, setNonVegMode] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating'>('relevance');
  const [ratingFilter, setRatingFilter] = useState(false);
  const [priceRange, setPriceRange] = useState<'below-99' | '100-199' | '200-499' | 'above-500' | null>(null);
  const [isPriceSelectionMode, setIsPriceSelectionMode] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Refs for Blinkit-style two-panel layout
  const contentPanelRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  // Cart & Selection
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<Array<{ extraId: string; quantity: number }>>([]);
  const [extras, setExtras] = useState<MenuItemExtra[]>([]);
  const [extraAssignments, setExtraAssignments] = useState<ExtraAssignment[]>([]);
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Order Status
  const [placingOrder, setPlacingOrder] = useState(false);

  // Quantity Increase Modal
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState<any[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);

  const [quantityModalData, setQuantityModalData] = useState<{
    cartItem: CartItem;
    newQuantity: number;
  } | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";
  const isLocalhost = BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1');

  // --- Logic Hooks (Unchanged) ---
  useEffect(() => {
    setSessionValidationDone(false);
    setActiveSessionData(null);
    setHasValidSession(false);
    setSessionCheckLoading(true);
  }, [restaurantId]);

  useEffect(() => {
    if (sessionValidationDone || !restaurantId) return;

    const validateSession = async () => {
      setSessionCheckLoading(true);
      try {
        if (urlSessionId && urlTableId) {
          setHasValidSession(true);
          try {
            // Use apiClient instead of raw fetch
            const data = await apiClient.getSessionById(urlSessionId) as any;
            const sessionData = data.data?.session || data.data || data;

            if (data.success && sessionData && sessionData.status === 'active') {
              setContextSession({
                sessionId: urlSessionId,
                tableId: urlTableId,
                restaurantId: restaurantId,
                tableNumber: sessionData.tableNumber,
                timestamp: new Date().toISOString(),
              });
              setHasValidSession(true);
              setSessionValidationDone(true);
              setSessionCheckLoading(false);
              return;
            }
          } catch (err) {
            console.error(err);
          }
          setHasValidSession(false);
        }

        const activeSessionResponse = await apiClient.getActiveSessionForRestaurant(restaurantId);
        setActiveSessionData(activeSessionResponse);

        if (activeSessionResponse.success && activeSessionResponse.hasActiveSession && activeSessionResponse.session) {
          setContextSession({
            sessionId: activeSessionResponse.session.sessionId,
            tableId: activeSessionResponse.session.tableId,
            restaurantId: activeSessionResponse.session.restaurantId,
            tableNumber: activeSessionResponse.session.tableNumber,
            timestamp: new Date().toISOString(),
          });
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
          if (contextSession?.restaurantId === restaurantId) {
            setContextSession(null);
          }
        }
      } catch (error) {
        setHasValidSession(false);
        if (contextSession?.restaurantId === restaurantId) {
          setContextSession(null);
        }
      } finally {
        setSessionCheckLoading(false);
        setSessionValidationDone(true);
      }
    };

    validateSession();
  }, [restaurantId, urlSessionId, urlTableId]);

  useEffect(() => {
    const init = async () => {
      if (!restaurantId) return;
      try {
        setLoading(true);
        // Use apiClient for all requests
        const menuPromise = apiClient.getPublicMenu(restaurantId);
        const restPromise = apiClient.getRestaurant(restaurantId);
        const extrasPromise = apiClient.getPublicExtras(restaurantId);
        // apiClient.getSessionById returns the body directly, so promise resolves to data
        const sessionPromise = sessionId ? apiClient.getSessionById(sessionId) : Promise.resolve(null);
        const offersPromise = apiClient.getPublicOffers(restaurantId).catch(() => ({ success: false, offers: [] }));

        const [menu, rest, extrasRes, sessionData, offersRes] = await Promise.all([
          menuPromise,
          restPromise,
          extrasPromise,
          sessionPromise,
          offersPromise
        ]) as [any, any, any, any, any];

        // apiClient throws on error, so if we are here, requests succeeded
        if (menu && rest && extrasRes.success) {
          setMenuData(menu);
          setRestaurant(rest.restaurant || rest);
          setExtras(extrasRes.extras.filter((extra: MenuItemExtra) => extra.isActive && extra.isAvailable));
          setExtraAssignments(menu.extraAssignments || []);
          if (offersRes && offersRes.offers) {
            setOffers(offersRes.offers);
          }
          if (menu.categories?.length > 0) setActiveCategory(menu.categories[0].id);

          if (sessionData) {
            // Ensure we access the correct property path
            // sessionData from apiClient.getSessionById likely has { success: true, data: { ... } } structure
            // checking existing code: sessionres.json() -> sessionData
            const sessionDetails = sessionData.data?.session || sessionData.data || sessionData;

            if (sessionDetails) {
              setSessionInfo({
                sessionId: sessionDetails.sessionId || sessionDetails.id,
                tableNumber: sessionDetails.tableNumber,
                status: sessionDetails.status,
                paymentStatus: sessionDetails.paymentStatus,
                billedAt: sessionDetails.billedAt || null,
                totalOrders: sessionData.data?.orders?.length || sessionDetails.orders?.length || 0,
              });
            }
          }
        } else {
          setError("Menu currently unavailable");
        }
      } catch (e) {
        console.error("Failed to connect to restaurant:", e);
        setError("Failed to connect to restaurant");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [restaurantId, sessionId]);

  useEffect(() => {
    if (sessionId) {
      loadAppliedDiscounts();
    }
  }, [sessionId]);

  const loadAppliedDiscounts = async () => {
    if (!sessionId) return;
    try {
      setDiscountLoading(true);
      // Use the public endpoint first (works for unauthenticated QR customers)
      const res = await apiClient.getPublicSessionDiscounts(sessionId);
      if (res.success) {
        // Include offer-type discounts that come from the session discounts table
        setAppliedDiscounts(res.data.appliedDiscounts || []);
      }
    } catch (error) {
      console.error('Failed to load discounts:', error);
    } finally {
      setDiscountLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId) {
      const storedCart = localStorage.getItem(`cart_${restaurantId}`);
      if (storedCart) {
        try { setCart(JSON.parse(storedCart)); } catch (e) { }
      }
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId && cart.length > 0) {
      localStorage.setItem(`cart_${restaurantId}`, JSON.stringify(cart));
    } else if (restaurantId) {
      localStorage.removeItem(`cart_${restaurantId}`);
    }
  }, [cart, restaurantId]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Logic Helpers ---
  const scrollToCategory = useCallback((catId: string) => {
    setActiveCategory(catId);
    // Auto-scroll the page window to the menu grid when category changes
    window.scrollTo({ top: 220, behavior: 'smooth' });
  }, []);

  const addToCart = (variantId: string, categoryId: string, extras: Array<{ extraId: string; quantity: number }>, quantity: number) => {
    if (!hasValidSession || !sessionId) {
      toast.error('Please scan the QR code on your table to start ordering', {
        position: 'bottom-center',
        duration: 4000,
      });
      setShowQRScanner(true);
      return;
    }
    if (sessionInfo?.billedAt) {
      toast.error('Bill has been requested. Cannot add more items.', {
        position: 'bottom-center',
        duration: 4000,
      });
      return;
    }

    setCart(prev => {
      // Check if this exact item (variant + extras) already exists
      const existingIndex = prev.findIndex(item =>
        item.variantId === variantId &&
        JSON.stringify(item.extras || []) === JSON.stringify(extras)
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + quantity
        };
        return newCart;
      } else {
        // Add new item
        return [...prev, { variantId, categoryId, extras: extras.length > 0 ? extras : undefined, quantity, extrasAppliedToAll: true }];
      }
    });
  };


  const updateCartQuantity = (variantId: string, extras: Array<{ extraId: string; quantity: number }> | undefined, delta: number) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.variantId === variantId &&
        JSON.stringify(item.extras || []) === JSON.stringify(extras || [])
      );

      if (existingIndex >= 0) {
        const newCart = [...prev];
        const currentItem = newCart[existingIndex];
        const newQuantity = currentItem.quantity + delta;

        // If increasing quantity and item has extras, show modal to ask about extras application
        if (delta > 0 && currentItem.extras && currentItem.extras.length > 0 && newQuantity > currentItem.quantity) {
          setQuantityModalData({
            cartItem: currentItem,
            newQuantity: newQuantity
          });
          setShowQuantityModal(true);
          return prev; // Don't update cart yet, wait for modal response
        }

        if (newQuantity <= 0) {
          newCart.splice(existingIndex, 1);
        } else {
          newCart[existingIndex] = { ...currentItem, quantity: newQuantity };
        }

        return newCart;
      }

      return prev;
    });
  };

  const handleQuantityModalResponse = (applyToAll: boolean) => {
    if (!quantityModalData) return;

    setCart(prev => {
      const existingIndex = prev.findIndex(item =>
        item.variantId === quantityModalData.cartItem.variantId &&
        JSON.stringify(item.extras || []) === JSON.stringify(quantityModalData.cartItem.extras || [])
      );

      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: quantityModalData.newQuantity,
          extrasAppliedToAll: applyToAll
        };
        return newCart;
      }

      return prev;
    });

    setShowQuantityModal(false);
    setQuantityModalData(null);
  };

  const handleItemClick = async (item: MenuItem) => {
    const itemAvailableExtras = getAvailableExtras(item);
    if (item.variants.length === 1 && itemAvailableExtras.length === 0) {
      // Only skip the modal if there's exactly one variant AND no extras are available at all
      addToCart(item.variants[0].id, item.categoryId || "", [], 1);
      toast.success("Added to cart", { position: 'bottom-center', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
    } else {
      setCustomizingItem(item);
      setSelectedVariantId(item.variants.length > 0 ? item.variants[0].id : "");
      setSelectedExtras([]);
      setModalQuantity(1);
    }
  };


  const handleAddFromModal = () => {
    if (!selectedVariantId) {
      toast.error('Please select an option');
      return;
    }
    addToCart(selectedVariantId, customizingItem?.categoryId || "", selectedExtras, modalQuantity);
    setCustomizingItem(null);
    setSelectedVariantId("");
    setSelectedExtras([]);
    setModalQuantity(1);
    toast.success('Added to cart', { position: 'bottom-center' });
  };


  const handleQRScan = async (qrToken: string) => {
    setShowQRScanner(false);
    router.push(`/qr/${qrToken}`);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!hasValidSession || !sessionId) {
      toast.error('Please scan the QR code on your table first', {
        position: 'bottom-center',
        duration: 4000,
      });
      setShowQRScanner(true);
      return;
    }
    setPlacingOrder(true);
    try {
      const items = cart.map(cartItem => {
        const item = menuData?.categories.flatMap(c => c.items).find(i => i.variants.some(v => v.id === cartItem.variantId));
        return {
          menuItemId: item?.id,
          menuItemVariantId: cartItem.variantId,
          quantity: cartItem.quantity,
          itemNotes: '',
          extras: cartItem.extras,
        };
      }).filter(item => item.menuItemId);

      const orderData = {
        tableSessionId: sessionId,
        restaurantId,
        tableId: contextSession?.tableId,
        items,
        notes: '',
      };

      const response = await fetch(`${BACKEND_URL}/api/orders/make-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'SESSION_BILLED') {
          toast.error('Session has been billed. Please complete payment.', { position: 'bottom-center' });
        } else {
          toast.error(errorData.message || 'Failed to place order', { position: 'bottom-center' });
        }
        return;
      }
      await response.json();
      toast.success('Order placed successfully! 🎉', { position: 'bottom-center', duration: 3000 });
      setCart([]);
      setShowCheckout(false);
      localStorage.removeItem(`cart_${restaurantId}`);
      if (sessionId && sessionInfo) {
        setSessionInfo({ ...sessionInfo, totalOrders: sessionInfo.totalOrders + 1 });
      }
    } catch (error) {
      toast.error('Failed to place order. Please try again.', { position: 'bottom-center' });
    } finally {
      setPlacingOrder(false);
    }
  };

  const calculateOfferDiscount = useCallback((offer: Offer, currentSubtotal: number, currentGrandTotalBeforeDiscount: number, currentGstRate: number) => {
    if (currentSubtotal < (offer.minOrderValue || 0) / 100) return 0; // Backend minOrderValue is in paise, currentSubtotal is in rupees here

    let discountAmt = 0;
    const gstDecimal = currentGstRate / 100;

    switch (offer.offerType) {
      case 'percentage':
        discountAmt = (currentGrandTotalBeforeDiscount * offer.discountValue) / 100;
        break;
      case 'flat_discount':
        discountAmt = offer.discountValue; // stored in rupees in this page's Offer type
        break;
      case 'buy_1_get_1':
        // Collect eligible prices in rupees
        const eligiblePrices: number[] = [];
        const variantPriceMap: Record<string, number> = {};
        menuData?.categories?.forEach(cat =>
          cat.items.forEach(item =>
            item.variants.forEach(v => variantPriceMap[v.id] = v.price / 100)
          )
        );

        cart.forEach(item => {
          if (!offer.applicableCategoryId || item.categoryId === offer.applicableCategoryId) {
            const price = variantPriceMap[item.variantId] || 0;
            for (let i = 0; i < item.quantity; i++) {
              eligiblePrices.push(price);
            }
          }
        });
        eligiblePrices.sort((a, b) => b - a);
        let bogoSubtotal = 0;
        for (let i = 1; i < eligiblePrices.length; i += 2) {
          bogoSubtotal += eligiblePrices[i];
        }
        discountAmt = bogoSubtotal * (1 + gstDecimal);
        break;
      case 'category_discount':
        const variantPriceMap2: Record<string, number> = {};
        const extraPriceMap2: Record<string, number> = {};
        menuData?.categories?.forEach(cat =>
          cat.items.forEach(item =>
            item.variants.forEach(v => variantPriceMap2[v.id] = v.price / 100)
          )
        );
        extras.forEach(e => extraPriceMap2[e.id] = e.price / 100);

        const categorySubtotal = cart
          .filter(item => item.categoryId === offer.applicableCategoryId)
          .reduce((sum, item) => {
            const itemTotal = (variantPriceMap2[item.variantId] || 0) * item.quantity;
            const extrasTotal = (item.extras?.reduce((s, e) => s + (extraPriceMap2[e.extraId] || 0) * e.quantity, 0) || 0) * item.quantity;
            return sum + itemTotal + extrasTotal;
          }, 0);
        discountAmt = (categorySubtotal * (1 + gstDecimal)) * offer.discountValue / 100;
        break;
    }

    if (offer.maxDiscountAmount && discountAmt > offer.maxDiscountAmount) {
      discountAmt = offer.maxDiscountAmount;
    }
    return discountAmt;
  }, [cart, menuData, extras]);

  const { cartCount, cartSubtotal, cartDiscount, cartTaxable, cartGst, cartGrandTotal } = useMemo(() => {
    let count = 0, subtotal = 0;
    const priceMap: Record<string, number> = {};
    const extraPriceMap: Record<string, number> = {};

    menuData?.categories?.forEach(cat =>
      cat.items.forEach(item =>
        item.variants.forEach(v => priceMap[v.id] = v.price / 100)
      )
    );

    extras.forEach(extra => extraPriceMap[extra.id] = extra.price / 100);

    cart.forEach(cartItem => {
      count += cartItem.quantity;
      subtotal += (priceMap[cartItem.variantId] || 0) * cartItem.quantity;

      // Add extras cost
      cartItem.extras?.forEach(extra => {
        const extraPrice = extraPriceMap[extra.extraId] || 0;
        if (cartItem.extrasAppliedToAll === false) {
          // Apply extras only to the first item
          subtotal += extraPrice * extra.quantity;
        } else {
          // Apply extras to all items (default behavior)
          subtotal += extraPrice * extra.quantity * cartItem.quantity;
        }
      });
    });

    // Calculate GST first on the full subtotal
    const gstRate = Number(restaurant?.defaultGstPercentage || 0);
    const gstAmount = (subtotal * gstRate) / 100;
    const grandTotalBeforeDiscount = subtotal + gstAmount;

    // Calculate applied discounts on the grand total
    let discountAmount = 0;
    appliedDiscounts.forEach(d => {
      if (d.discountType === 'percentage') {
        discountAmount += (grandTotalBeforeDiscount * d.discountValue) / 100;
      } else if (d.discountType === 'fixed_amount') {
        discountAmount += d.discountValue / 100;
      } else if (d.discountType === 'offer' || d.discountType === 'voucher') {
        // Find the original offer to recalculate live based on current cart
        const offer = offers.find(o => o.id === d.discountSourceId);
        if (offer) {
          discountAmount += calculateOfferDiscount(offer, subtotal, grandTotalBeforeDiscount, gstRate);
        } else {
          // Fallback to backend value if offer details not found
          discountAmount += d.discountValue / 100;
        }
      }
    });

    const taxableBase = subtotal; 
    const grandTotal = Math.max(0, grandTotalBeforeDiscount - discountAmount);

    return {
      cartCount: count,
      cartSubtotal: subtotal,
      cartDiscount: discountAmount,
      cartTaxable: taxableBase,
      cartGst: gstAmount,
      cartGrandTotal: grandTotal
    };
  }, [cart, menuData, extras, appliedDiscounts, restaurant, calculateOfferDiscount, offers]);


  // Backward compatibility for existing UI variables
  const cartTotal = cartSubtotal;

  // --- Helper for Item-Specific Extra Filtering with Specificity ---
  const getAvailableExtras = useCallback((item: MenuItem, variantId?: string) => {
    if (!item) return [];

    return extras.filter(extra => {
      // Find all assignments for this specific extra
      const itemAssignments = extraAssignments.filter(a => a.extraId === extra.id);
      if (itemAssignments.length === 0) return false;

      // Extract IDs safely to handle potential naming mismatches (camelCase vs snake_case)
      const itemId = item.id;
      const catId = item.categoryId;

      // Check priority order: Variant > Item > Category > Global
      if (variantId) {
        const variantAssignment = itemAssignments.find(a => (a.variantId === variantId) || ((a as any).variant_id === variantId));
        if (variantAssignment) return variantAssignment.isActive;
      }

      const itemLevelAssignment = itemAssignments.find(a => (a.menuItemId === itemId) || ((a as any).menu_item_id === itemId));
      if (itemLevelAssignment) return itemLevelAssignment.isActive;

      if (catId) {
        const categoryAssignment = itemAssignments.find(a => (a.categoryId === catId) || ((a as any).category_id === catId));
        if (categoryAssignment) return categoryAssignment.isActive;
      }

      const globalAssignment = itemAssignments.find(a => a.isGlobal || (a as any).is_global);
      if (globalAssignment) return globalAssignment.isActive;

      return false;
    });
  }, [extras, extraAssignments]);

  const filteredCategories = useMemo(() => {
    if (!menuData) return [];
    let filtered = menuData.categories;
    if (searchQuery) {
      filtered = filtered.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.items.length > 0);
    }
    if (vegMode) {
      filtered = filtered.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.isVeg)
      })).filter(cat => cat.items.length > 0);
    }
    if (nonVegMode) {
      filtered = filtered.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.isVeg === false)
      })).filter(cat => cat.items.length > 0);
    }
    if (ratingFilter) {
      filtered = filtered.map(cat => ({
        ...cat,
        items: cat.items.filter(item => (item as any).rating >= 4.0 || true) // Mocking rating filter for now
      })).filter(cat => cat.items.length > 0);
    }
    if (priceRange) {
      filtered = filtered.map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          const price = (item.variants[0]?.price / 100) || 0;
          if (priceRange === 'below-99') return price < 99;
          if (priceRange === '100-199') return price >= 100 && price <= 199;
          if (priceRange === '200-499') return price >= 200 && price <= 499;
          if (priceRange === 'above-500') return price >= 500;
          return true;
        })
      })).filter(cat => cat.items.length > 0);
    }

    // Apply Sorting
    if (sortBy !== 'relevance') {
      filtered = filtered.map(cat => ({
        ...cat,
        items: [...cat.items].sort((a, b) => {
          const aPrice = a.variants[0]?.price || 0;
          const bPrice = b.variants[0]?.price || 0;
          if (sortBy === 'price-low') return aPrice - bPrice;
          if (sortBy === 'price-high') return bPrice - aPrice;
          if (sortBy === 'rating') return ((b as any).rating || 0) - ((a as any).rating || 0);
          return 0;
        })
      }));
    }

    return filtered;
  }, [menuData, searchQuery, vegMode, nonVegMode, ratingFilter, sortBy, priceRange]);

  // IntersectionObserver removed - no longer needed with tabbed-style category navigation

  const modalDisplayImage = useMemo(() => {
    if (!customizingItem) return null;
    const v = customizingItem.variants.find(v => v.id === selectedVariantId);
    return v?.imageURL || customizingItem.imageURL;
  }, [customizingItem, selectedVariantId]);

  if (loading) return <SkeletonLoader />;
  if (error || !restaurant) return <div className="h-screen flex items-center justify-center bg-[#050506] text-zinc-400 font-medium">{error || "Restaurant Not Found"}</div>;

  return (
    <div className="min-h-screen bg-[#050506] text-white">
      <div className="max-w-[1600px] mx-auto bg-[#050506] min-h-screen shadow-2xl relative pb-28 flex flex-col">

      {/* --- QR Scanner --- */}
      {showQRScanner && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl">
            <button onClick={() => setShowQRScanner(false)} className="absolute top-4 right-4 p-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-lg font-black text-white mb-4 text-center">Scan Table QR</h2>
            <QRScanner onScan={handleQRScan} onError={(err) => toast.error(err)} className="w-full rounded-xl overflow-hidden" />
          </div>
        </div>
      )}

      {/* --- Session Blocker --- */}
      {!sessionCheckLoading && !hasValidSession && (
        <div className="fixed inset-0 z-[150] bg-[#050506] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-24 h-24 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(213,178,99,0.1)]">
            <QrCode size={40} className="text-[#d5b263]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Welcome to {restaurant?.restaurantName || 'Restaurant'}</h2>
          <p className="text-zinc-400 mb-8 max-w-xs mx-auto text-sm font-medium">Please scan the QR code on your table to access the menu and order.</p>
          <button onClick={() => setShowQRScanner(true)} className="w-full max-w-sm bg-[#d5b263] text-black font-black py-4 rounded-xl shadow-xl hover:bg-[#c4a152] transition flex items-center justify-center gap-2 active:scale-95">
            <Camera size={20} /> Scan QR Code
          </button>
        </div>
      )}

      {/* --- Scrollable Header Canvas (Luxury Theme) --- */}
      {/* --- Sticky Top Navigation Bar --- */}
      <nav className={`sticky top-0 z-50 px-4 py-3 flex items-center justify-between transition-all duration-300
        ${isScrolled 
          ? 'bg-[#050506]/95 backdrop-blur-xl border-b border-white/5 shadow-md' 
          : 'bg-transparent border-b border-transparent'}
      `}>
        <div className="flex items-center gap-3">
          <Link href={`/restro/${restaurantId}`} className="text-white p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-zinc-850 transition border border-white/5 flex items-center justify-center">
            <ChevronLeft size={16} strokeWidth={2.5} />
          </Link>
          {/* Compact Restaurant Details on scroll */}
          <div className={`transition-all duration-300 transform ${isScrolled ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
            <h2 className="text-sm font-black text-white leading-none tracking-tight">{restaurant.restaurantName}</h2>
            {sessionInfo && (
              <span className="inline-block text-[9px] text-[#d5b263] font-black bg-[#d5b263]/10 border border-[#d5b263]/25 px-1.5 py-0.2 rounded mt-1.5 uppercase tracking-wide">
                Table {sessionInfo.tableNumber || 'N/A'}
              </span>
            )}
          </div>
        </div>
        
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 bg-black/40 backdrop-blur-md rounded-full text-white text-[11px] font-black tracking-wider hover:bg-zinc-800 transition shadow-lg">
          <Users size={12} className="text-[#d5b263]" /> GROUP
        </button>
      </nav>

      <div className="w-full bg-[#050506]">
        {/* Background Image & Compact Overlay */}
        <div className="relative h-[200px] sm:h-[280px] overflow-hidden -mt-[60px]">
          {restaurant.restaurantBanner ? (
            <img
              src={restaurant.restaurantBanner}
              alt={restaurant.restaurantName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#0c0c0e] to-[#121215]"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-[#050506]"></div>
        </div>

        {/* Fancy Compact Restaurant Info Card */}
        <div className="px-4 -mt-14 relative z-10 pb-2">
          {/* Outer container for glow effect */}
          <div className="relative group rounded-[1.25rem]">
            {/* Animated gradient border / Glow */}
            <div className="absolute -inset-[1px] bg-gradient-to-br from-[#d5b263]/30 via-white/5 to-transparent rounded-[1.25rem] opacity-60"></div>
            
            {/* Main glass card */}
            <div className="relative bg-[#0c0c0e]/80 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden">
              {/* Subtle top inner glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
              
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex-1">
                  <h1 className="text-[22px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-400 tracking-tight leading-none drop-shadow-sm">
                    {restaurant.restaurantName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold mt-2">
                    <span className="flex items-center gap-1 text-[#d5b263] bg-[#d5b263]/10 px-1.5 py-0.5 rounded-md border border-[#d5b263]/20 shadow-inner">
                      <Utensils size={10} className="drop-shadow-sm" /> 
                      {restaurant.city || 'Dine-in'}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 shadow-inner">
                      <CheckCircle2 size={10} className="text-[#d5b263]" /> 
                      Verified
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#d5b263] blur-md opacity-30 rounded-xl"></div>
                    <div className="relative bg-gradient-to-br from-[#d5b263] to-[#b39040] text-black flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-xs shadow-lg border border-white/20">
                      {restaurant.rating || "4.3"} <Star size={10} fill="currentColor" strokeWidth={1} />
                    </div>
                  </div>
                  <span className="text-[9px] text-zinc-400 font-black mt-1.5 uppercase tracking-widest opacity-80">6.4K+ ratings</span>
                </div>
              </div>

              {/* Quick Promo Strip */}
              {offers.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto scrollbar-hide relative z-10">
                  <div className="w-6 h-6 rounded-full bg-[#d5b263]/10 flex items-center justify-center shrink-0 border border-[#d5b263]/20 shadow-inner">
                    <Percent size={10} strokeWidth={3} className="text-[#d5b263]" />
                  </div>
                  <div className="flex gap-2 text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                    {offers.slice(0, 2).map((offer) => (
                      <span key={offer.id} className="relative overflow-hidden bg-gradient-to-r from-white/5 to-white/0 px-2.5 py-1 rounded-lg border border-white/10 transition-colors">
                        <span className="relative z-10 text-[#e6d09a] font-black">
                          {offer.offerType === 'percentage' && `${offer.discountValue}% OFF`}
                          {offer.offerType === 'flat_discount' && `₹${offer.discountValue} OFF`}
                          {offer.offerType === 'buy_1_get_1' && `BOGO`}
                        </span>
                        {offer.code && <span className="relative z-10 text-zinc-500 font-semibold ml-1">| Code: <span className="font-black text-zinc-300">{offer.code}</span></span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Table / Active Session Strip */}
        {sessionInfo && (
          <div className="px-4 py-2">
            <button
              onClick={() => router.push(`/session-summary/${sessionId}`)}
              className="w-full relative overflow-hidden bg-gradient-to-r from-[#0c0c0e]/95 to-[#16161a]/95 rounded-2xl p-3.5 flex items-center justify-between border border-[#d5b263]/15 shadow-[0_4px_20px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all hover:border-[#d5b263]/30 group"
            >
              {/* Subtle gold aura background glow */}
              <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#d5b263]/5 to-transparent blur-xl pointer-events-none group-hover:from-[#d5b263]/10 transition-all duration-500"></div>

              <div className="flex items-center gap-3 relative z-10">
                {/* Immersive pulsing radar */}
                <div className="w-8 h-8 rounded-xl bg-zinc-950/80 border border-white/5 flex items-center justify-center relative shrink-0">
                  <span className="absolute inset-0.5 rounded-lg border border-[#d5b263]/30 opacity-60 animate-ping duration-1000"></span>
                  <div className="w-2.5 h-2.5 bg-[#d5b263] rounded-full shadow-[0_0_8px_#d5b263]"></div>
                </div>

                <div className="flex flex-col text-left">
                  <span className="text-[14px] font-black text-white tracking-wide uppercase leading-none group-hover:text-[#d5b263] transition-colors">
                    Table {sessionInfo.tableNumber || 'N/A'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold mt-1 tracking-tight">
                    {sessionInfo.totalOrders > 0 ? `${sessionInfo.totalOrders} Orders Placed` : 'Explore & order directly'}
                  </span>
                </div>
              </div>

              {/* Dine-in badge / Status details */}
              <div className="flex items-center gap-2 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] shadow-inner">
                  <Utensils size={10} strokeWidth={2.5} />
                  {sessionInfo.totalOrders > 0 ? 'Active Session' : 'Dine-in Mode'}
                </span>
                <ChevronRight size={14} strokeWidth={3} className="text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* --- Sticky Unified Controls Header --- */}
      <div 
        className="sticky z-40 bg-[#050506]/95 backdrop-blur-xl border-b border-white/5 pt-5 pb-2.5 px-4 shadow-md transition-all duration-300"
        style={{ top: '52px' }}
      >
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-1.5">
          {/* Row 1: Search Box (Always visible, sticky) */}
          <div className="mb-1.5">
            <div className="relative bg-black/40 flex items-center border border-zinc-900 rounded-xl px-3 py-2 focus-within:border-[#d5b263]/40 transition-colors">
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[13px] font-bold text-white placeholder-zinc-500 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white p-0.5 mr-1">
                  <X size={14} />
                </button>
              )}
              <Search className="text-zinc-500 shrink-0" size={14} strokeWidth={2.5} />
            </div>
          </div>

          {/* Row 2: Horizontal Scrolling Filters (Always Sticky) */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1 -my-1">
              
              {/* Main Refine Filter Pill */}
              <button 
                onClick={() => setShowFiltersModal(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-xl font-black text-[9px] uppercase tracking-wider transition-all whitespace-nowrap active:scale-95
                  ${(vegMode || nonVegMode || ratingFilter || priceRange) 
                    ? 'border-[#d5b263] bg-[#d5b263]/15 text-[#d5b263]' 
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'}
                `}
              >
                <SlidersHorizontal size={11} strokeWidth={2.5} />
                <span>Filters</span>
                {(vegMode || nonVegMode || ratingFilter || priceRange) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d5b263] animate-pulse" />
                )}
              </button>


              {/* Veg Only Switch */}
              <button 
                onClick={() => { setVegMode(!vegMode); if (!vegMode) setNonVegMode(false); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl font-black text-[9px] uppercase tracking-wider transition-all whitespace-nowrap active:scale-95
                  ${vegMode 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'}
                `}
              >
                <div className="w-2.5 h-2.5 border border-emerald-500 flex items-center justify-center rounded bg-transparent shrink-0">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                </div>
                <span>Veg Only</span>
              </button>

              {/* Non Veg Switch */}
              <button 
                onClick={() => { setNonVegMode(!nonVegMode); if (!nonVegMode) setVegMode(false); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl font-black text-[9px] uppercase tracking-wider transition-all whitespace-nowrap active:scale-95
                  ${nonVegMode 
                    ? 'border-rose-500 bg-rose-500/10 text-rose-455' 
                    : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'}
                `}
              >
                <div className="w-2.5 h-2.5 border border-rose-500 flex items-center justify-center rounded bg-transparent shrink-0">
                  <div className="w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-b-[3px] border-b-rose-500"></div>
                </div>
                <span>Non-Veg</span>
              </button>



              {/* Price Ranges */}
              {[
                { id: 'below-99', label: 'Under ₹99' },
                { id: '100-199', label: '₹100-₹199' },
                { id: '200-499', label: '₹200-₹499' },
                { id: 'above-500', label: 'Over ₹500' }
              ].map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => setPriceRange(priceRange === opt.id ? null : opt.id as any)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-xl font-black text-[9px] uppercase tracking-wider transition-all whitespace-nowrap active:scale-95
                    ${priceRange === opt.id 
                      ? 'border-[#d5b263] bg-[#d5b263]/15 text-[#d5b263]' 
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'}
                  `}
                >
                  <Tag size={10} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* --- Blinkit-Style Two-Panel Menu Layout --- */}
      <main className="w-full bg-[#050506] flex-1 flex flex-col max-w-7xl mx-auto">
        {filteredCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-[#050506] h-full px-4">
            <Utensils className="text-zinc-700 mb-4 animate-pulse" size={48} />
            <p className="text-zinc-400 font-medium">No matches found for your filter selection</p>
            <button onClick={() => { setSearchQuery(''); setVegMode(false); setNonVegMode(false); setPriceRange(null); setRatingFilter(false); }} className="mt-4 text-[#d5b263] font-black text-sm hover:underline">Reset Filters</button>
          </div>
        ) : (
          <div className="flex flex-1">
            {/* Left Sidebar - Responsive Category Navigation */}
            <div
              ref={sidebarRef}
              className="w-[72px] sm:w-[84px] md:w-[260px] shrink-0 border-r border-white/5 overflow-y-auto scrollbar-hide bg-[#0c0c0e] transition-all duration-300"
              style={{ maxHeight: 'calc(100vh - 144px)', position: 'sticky', top: '144px' }}
            >
              <div className="flex flex-col">
                {filteredCategories.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  const thumbUrl = cat.items[0]?.imageURL;
                  return (
                    <button
                      key={cat.id}
                      id={`sidebar-${cat.id}`}
                      onClick={() => scrollToCategory(cat.id)}
                      className={`relative flex flex-col md:flex-row items-center gap-1.5 md:gap-4 py-4 px-2 md:px-5 transition-all text-center md:text-left ${
                        isActive ? 'bg-[#121215]' : 'hover:bg-[#121215]/50'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-[4px] rounded-r-full bg-[#d5b263]" />
                      )}
                      
                      {/* Category thumbnail */}
                      <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0 transition-all ${
                        isActive ? 'ring-2 ring-[#d5b263] bg-zinc-900 shadow-lg' : 'bg-zinc-900/60 border border-white/5'
                      }`}>
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <Utensils className="text-zinc-500 w-5 h-5" />
                        )}
                      </div>

                      {/* Category name & details */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className={`text-[10px] md:text-[14px] leading-tight font-black transition-colors ${
                          isActive ? 'text-[#d5b263]' : 'text-zinc-400'
                        }`}>
                          {cat.name}
                        </span>
                        <span className="hidden md:block text-[11px] text-zinc-500 font-bold mt-0.5">
                          {cat.items.length} items
                        </span>
                      </div>

                      {/* Desktop Chevron */}
                      <ChevronRight size={14} className={`hidden md:block transition-all ${isActive ? 'text-[#d5b263] translate-x-1 opacity-100' : 'text-zinc-705 opacity-0'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content - Items Grid */}
            <div
              ref={contentPanelRef}
              className="flex-1 pb-24 bg-[#050506]"
            >
              {filteredCategories
                .filter(cat => activeCategory ? cat.id === activeCategory : true)
                .map((cat) => (
                <div key={cat.id} data-category-id={cat.id} className="animate-in fade-in duration-300">
                  {/* Section Header */}
                  <div 
                    className="px-4 pt-4 pb-2 bg-[#050506]/95 backdrop-blur-md z-30 border-b border-white/5 sticky"
                    style={{ top: '144px' }}
                  >
                    <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                      {cat.name}
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full border border-white/10 ml-2">{cat.items.length} items</span>
                    </h3>
                  </div>

                  {/* Redesigned Luxury Responsive Horizontal Card Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 p-3.5">
                    {cat.items.map((item) => {
                      const itemCartEntries = cart.filter(cartItem => 
                        item.variants.some(v => v.id === cartItem.variantId)
                      );
                      const cartQuantity = itemCartEntries.reduce((acc, cartItem) => acc + cartItem.quantity, 0);
                      const itemAvailableExtras = getAvailableExtras(item);
                      const isCustomizable = item.variants.length > 1 || itemAvailableExtras.length > 0;
                      const price = item.variants[0]?.price / 100 || 0;

                      return (
                        <div key={item.id} className="bg-[#0c0c0e]/80 backdrop-blur-xl rounded-xl border border-zinc-900/60 p-3 shadow-md flex items-center justify-between gap-3 hover:border-zinc-800 transition-all duration-300 group hover:-translate-y-0.5">
                          {/* Left: Info area */}
                          <div className="flex-1 flex flex-col gap-0.5 min-w-0 text-left">
                            {/* Veg/Non-Veg tag */}
                            <div className="flex items-center gap-1">
                              <VegIndicator isVeg={item.isVeg} />
                              <span className={`text-[8px] font-black uppercase tracking-wider ${item.isVeg ? 'text-green-500' : 'text-rose-500'}`}>
                                {item.isVeg ? 'Veg' : 'Non-Veg'}
                              </span>
                            </div>

                            {/* Food Title */}
                            <h4 className="font-black text-white text-[13px] leading-snug tracking-tight truncate group-hover:text-[#d5b263] transition-colors">
                              {item.name}
                            </h4>
                            
                            {/* Food Description */}
                            <p className="text-[10px] text-zinc-500 font-bold line-clamp-1 leading-normal">
                              {item.description || "Fresh ingredients cooked to perfection."}
                            </p>

                            {/* Pricing & customization label */}
                            <div className="mt-1 flex items-center gap-2">
                              {item.variants.length === 1 ? (
                                <span className="font-black text-[#d5b263] text-[13px]">₹{price.toFixed(0)}</span>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {item.variants.slice(0, 2).map(v => (
                                    <span key={v.id} className="text-[10px] font-black text-[#d5b263]">
                                      ₹{(v.price / 100).toFixed(0)}<span className="text-[8px] text-zinc-550 lowercase">({v.variantName})</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                              {isCustomizable && (
                                <span className="text-[8px] font-black text-[#d5b263] tracking-wider uppercase bg-[#d5b263]/10 border border-[#d5b263]/25 px-1.5 py-0.5 rounded">
                                  Customizable
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Image Media Box & Add Button */}
                          <div className="relative shrink-0 flex flex-col items-center">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-900 relative">
                              {item.imageURL ? (
                                <img src={item.imageURL} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Utensils className="text-zinc-850 w-7 h-7" />
                                </div>
                              )}
                            </div>

                            {/* Floating Add to Cart Button overlay at bottom of image */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 w-[85%]">
                              {cartQuantity === 0 ? (
                                <button
                                  onClick={() => handleItemClick(item)}
                                  className="w-full h-7 bg-[#121215]/95 backdrop-blur-md text-[#d5b263] font-black text-[10px] rounded border border-[#d5b263]/30 shadow-md hover:bg-[#d5b263] hover:text-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-0.5"
                                >
                                  ADD
                                  {isCustomizable && <Plus size={9} strokeWidth={3} className="text-[#d5b263]" />}
                                </button>
                              ) : (
                                <div className="flex items-center justify-between w-full h-7 bg-[#d5b263] rounded overflow-hidden text-black font-black text-[10px] shadow-md">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (itemCartEntries.length === 1) {
                                        updateCartQuantity(itemCartEntries[0].variantId, itemCartEntries[0].extras, -1);
                                      } else if (itemCartEntries.length > 1) {
                                        toast.error("Multiple customizations in cart. Use cart tray to remove.", {
                                          position: 'bottom-center',
                                          icon: 'ℹ️',
                                          style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '11px' }
                                        });
                                      }
                                    }}
                                    className="px-1.5 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors text-black"
                                  >
                                    <Minus size={10} strokeWidth={3} />
                                  </button>
                                  <span className="text-[11px]">{cartQuantity}</span>
                                  <button
                                    onClick={() => isCustomizable ? handleItemClick(item) : addToCart(item.variants[0].id, cat.id, [], 1)}
                                    className="px-1.5 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors text-black"
                                  >
                                    <Plus size={10} strokeWidth={3} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End of Menu Footer (Full Width) */}
        <div className="py-16 px-4 text-center flex items-center justify-center flex-col w-full border-t border-white/5 bg-[#050506] relative z-10">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-[1px] bg-zinc-800" />
            <p className="text-zinc-550 font-bold text-[11px] tracking-widest uppercase">End of Menu</p>
            <div className="w-12 h-[1px] bg-zinc-800" />
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 text-zinc-500 text-[11px] font-bold">
            <Package size={12} /> FSSAI Lic. 12345678901234
          </div>
          <div className="mt-8 flex flex-col items-center gap-2">
            <span className="text-[9px] text-zinc-650 uppercase tracking-widest font-black">For Inquiry or SOS Emergency</span>
            <a href="tel:9472710075" className="inline-flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 font-black text-xs px-5 py-2.5 rounded-xl border border-rose-500/20 shadow-sm active:scale-95 transition-all">
              <Phone size={12} className="animate-bounce" /> Call Support: 9472710075
            </a>
          </div>
        </div>
      </main>

      {/* Floating MENU button and Category Selection Modal removed — sidebar replaces them */}

      {/* My Session (Desktop only) */}
      {sessionId && (
        <div className="hidden md:block fixed bottom-6 left-6 z-50">
          <button onClick={() => router.push('/my-session')} className="bg-[#0c0c0e]/90 backdrop-blur-xl text-[#d5b263] px-6 py-3 rounded-full shadow-2xl border border-[#d5b263]/30 flex items-center gap-3 hover:scale-105 hover:bg-[#16161a] transition-all font-black">
            <Receipt size={20} className="text-[#d5b263]" /> My Session
          </button>
        </div>
      )}

      {/* Swiggy/Zomato Style Floating Cart Bar */}
      {cartCount > 0 && !showCheckout && (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full bg-[#121215] text-white rounded-[24px] shadow-2xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-8 duration-500 hover:scale-[1.02] active:scale-[0.98] transition-all border border-[#d5b263]/30"
            >
              <div className="flex flex-col items-start leading-tight">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[15px] font-black tracking-tight">{cartCount} ITEM{cartCount > 1 ? 'S' : ''}</span>
                  <div className="w-1 h-1 bg-zinc-500 rounded-full"></div>
                  <span className="text-[15px] font-black text-[#d5b263]">₹{cartGrandTotal.toFixed(0)}</span>
                </div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Plus Taxes</span>
              </div>
              <div className="flex items-center gap-2 font-black text-[15px] tracking-wide text-black bg-[#d5b263] px-4 py-2.5 rounded-full border border-[#d5b263]">
                View Cart <ShoppingCart size={16} fill="currentColor" className="text-black" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* --- Modals (Bottom Sheet Style) --- */}

      {/* Customization Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in" onClick={() => { setCustomizingItem(null); setSelectedExtras([]); }}>
          <div className="bg-[#050506] w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/10" onClick={e => e.stopPropagation()}>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide pb-[100px]">
              
              {/* Hero Image Section */}
              <div className="relative w-full h-[240px] sm:h-[280px] bg-zinc-900 shrink-0">
                {customizingItem.imageURL ? (
                  <img src={customizingItem.imageURL} alt={customizingItem.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#121215] to-[#0c0c0e] flex items-center justify-center">
                    <Utensils className="text-zinc-700" size={48} />
                  </div>
                )}
                
                {/* Gradient Overlay for seamless blend */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/40 to-transparent"></div>
                
                {/* Close Button */}
                <button 
                  onClick={() => { setCustomizingItem(null); setSelectedExtras([]); }} 
                  className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 rounded-full active:scale-95 transition-all border border-white/20 shadow-lg z-20"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>

              {/* Item Details */}
              <div className="px-5 -mt-12 relative z-10 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <VegIndicator isVeg={customizingItem.isVeg} />
                </div>
                <h3 className="font-black text-white text-[26px] leading-tight mb-2 tracking-tight drop-shadow-md">
                  {customizingItem.name}
                </h3>
                {customizingItem.description && (
                  <p className="text-[13px] text-zinc-400 font-medium leading-relaxed">
                    {customizingItem.description}
                  </p>
                )}
              </div>

              {/* Customization Options Wrapper */}
              <div className="px-5 flex flex-col gap-8">
                {/* Variant Selection Card */}
                {customizingItem.variants.length > 0 && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-white text-lg tracking-tight">Choice of Options</h4>
                      <span className="text-[10px] font-black text-[#d5b263] bg-[#d5b263]/10 px-2 py-1 rounded-md uppercase tracking-wider border border-[#d5b263]/20 shadow-inner">Required</span>
                    </div>
                    <div className="bg-[#0c0c0e] rounded-[24px] shadow-xl overflow-hidden border border-white/5">
                      {customizingItem.variants.filter(v => v.isActive !== false).map((variant, idx) => {
                        const isLast = idx === customizingItem.variants.length - 1;
                        const isSelected = selectedVariantId === variant.id;
                        return (
                          <div
                            key={variant.id}
                            onClick={() => setSelectedVariantId(variant.id)}
                            className={`flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-zinc-900/60 ${!isLast ? 'border-b border-white/5' : ''}`}
                          >
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className={`font-bold text-[15px] tracking-tight ${isSelected ? 'text-[#d5b263]' : 'text-white'}`}>{variant.variantName}</p>
                              </div>
                              {variant.portionSize && <p className="text-[12px] text-zinc-400">{variant.portionSize}</p>}
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-[14px] font-black text-white">₹{(variant.price / 100).toFixed(0)}</span>
                              {/* Custom Radio Box */}
                              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${isSelected ? 'border-[#d5b263] bg-[#d5b263]/20' : 'border-zinc-600 bg-transparent'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 bg-[#d5b263] rounded-full shadow-sm" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Extras Selection Card */}
                {(() => {
                  const availableExtras = getAvailableExtras(customizingItem, selectedVariantId);
                  if (availableExtras.length === 0) return null;

                  return (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-white text-lg tracking-tight">Add Extras</h4>
                        <span className="text-[10px] font-black text-zinc-400 bg-white/5 border border-white/10 px-2 py-1 rounded-md uppercase tracking-wider shadow-inner">Optional</span>
                      </div>
                      <p className="text-[12px] text-zinc-400 mb-3 font-medium">Select as many as you like</p>
                      <div className="bg-[#0c0c0e] rounded-[24px] shadow-xl overflow-hidden border border-white/5">
                        {availableExtras.map((extra, idx) => {
                          const isLast = idx === availableExtras.length - 1;
                          const selectedExtra = selectedExtras.find(e => e.extraId === extra.id);
                          const isSelected = !!selectedExtra;

                          return (
                            <div
                              key={extra.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedExtras(prev => prev.filter(e => e.extraId !== extra.id));
                                } else {
                                  setSelectedExtras(prev => [...prev, { extraId: extra.id, quantity: 1 }]);
                                }
                              }}
                              className={`flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-zinc-900/60 ${!isLast ? 'border-b border-white/5' : ''}`}
                            >
                              <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <VegIndicator isVeg={customizingItem.isVeg} />
                                  <p className={`font-bold text-[15px] tracking-tight ${isSelected ? 'text-white' : 'text-zinc-200'}`}>{extra.name}</p>
                                </div>
                                {extra.description && <p className="text-[12px] text-zinc-400 pl-6">{extra.description}</p>}
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                <span className="text-[13px] font-black text-zinc-300">+ ₹{(extra.price / 100).toFixed(0)}</span>
                                <div className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-all ${isSelected ? 'border-[#d5b263] bg-[#d5b263]' : 'border-zinc-600 bg-transparent'}`}>
                                  {isSelected && <CheckCircle2 size={16} className="text-black" strokeWidth={3} />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Fancy Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050506] via-[#050506] to-[#050506]/80 backdrop-blur-xl border-t border-white/5 shadow-2xl pb-[max(24px,env(safe-area-bottom))]">
              <div className="flex gap-4 relative z-10 max-w-sm mx-auto">
                {/* Quantity Control */}
                <div className="w-[120px] shrink-0 h-[52px] rounded-[16px] border border-white/10 bg-[#0c0c0e] flex items-center justify-between overflow-hidden shadow-inner">
                  <button
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    className="w-12 h-full flex items-center justify-center text-[#d5b263] hover:bg-zinc-900 active:bg-zinc-800 transition-colors"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <span className="font-black text-[16px] text-white flex-1 text-center">{modalQuantity}</span>
                  <button
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    className="w-12 h-full flex items-center justify-center text-[#d5b263] hover:bg-zinc-900 active:bg-zinc-800 transition-colors"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddFromModal}
                  disabled={!selectedVariantId}
                  className="flex-1 relative group overflow-hidden h-[52px] rounded-[16px] disabled:opacity-50 transition-transform active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#d5b263] to-[#e6d09a] shadow-lg"></div>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  
                  <div className="relative h-full flex items-center justify-between px-5 font-black text-black">
                    <span className="text-[15px] uppercase tracking-wider">Add Item</span>
                    <span className="text-[16px]">
                      ₹{
                        (() => {
                          const basePrice = customizingItem.variants.find(v => v.id === selectedVariantId)?.price || 0;
                          const extrasPrice = selectedExtras.reduce((sum, extra) => {
                            const e = extras.find(ex => ex.id === extra.extraId);
                            return sum + (e ? e.price * extra.quantity : 0);
                          }, 0);
                          return (((basePrice + extrasPrice) * modalQuantity) / 100).toFixed(0);
                        })()
                      }
                    </span>
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in" onClick={() => setShowCheckout(false)}>
          <div className="bg-[#050506] w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col shadow-2xl relative border border-white/10" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-br from-[#0c0c0e] to-[#050506] rounded-t-[32px] relative overflow-hidden shrink-0">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              <div className="relative z-10">
                <h2 className="text-[22px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-400 tracking-tight leading-none drop-shadow-sm mb-1">Your Order</h2>
                <div className="flex items-center gap-1.5 text-[11px] font-bold mt-1.5">
                  <span className="flex items-center gap-1 text-[#d5b263] bg-[#d5b263]/10 px-2 py-0.5 rounded-md border border-[#d5b263]/20 shadow-inner">
                    <MapPin size={10} className="drop-shadow-sm" /> 
                    Table {sessionInfo?.tableNumber || 'Unknown'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowCheckout(false)} className="p-2.5 bg-white/5 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white rounded-full active:scale-95 transition-all shadow-sm relative z-10">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#050506] scrollbar-hide">
              {/* Menu Items Loop */}
              <div className="animate-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h4 className="font-black text-white text-[15px] tracking-tight">Order Items</h4>
                  <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-2 py-1 rounded-md uppercase tracking-wider">{cart.length} Item(s)</span>
                </div>
                <div className="bg-[#0c0c0e] rounded-[24px] border border-white/5 p-4 shadow-xl divide-y divide-white/5">
                  {cart.map((cartItem, index) => {
                    const item = menuData?.categories.flatMap(c => c.items).find(i => i.variants.some(v => v.id === cartItem.variantId));
                    const variant = item?.variants.find(v => v.id === cartItem.variantId);
                    if (!item || !variant) return null;

                    const itemTotal = (variant.price / 100) * cartItem.quantity;
                    const extrasTotal = cartItem.extras?.reduce((sum, extra) => {
                      const extraData = extras.find(e => e.id === extra.extraId);
                      return sum + (extraData ? (extraData.price / 100) * extra.quantity * cartItem.quantity : 0);
                    }, 0) || 0;

                    return (
                      <div key={`${cartItem.variantId}-${index}`} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="mt-0.5 shrink-0">
                          <VegIndicator isVeg={item.isVeg} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-4 mb-1">
                            <h4 className="font-bold text-white text-[15px] leading-tight truncate tracking-tight">{item.name}</h4>

                            {/* Item quantity controls */}
                            <div className="flex items-center justify-between w-[76px] h-8 bg-[#16161a] border border-white/10 rounded-xl overflow-hidden shrink-0 shadow-inner">
                              <button onClick={() => updateCartQuantity(cartItem.variantId, cartItem.extras, -1)} className="w-7 h-full flex items-center justify-center text-[#d5b263] hover:bg-zinc-900 active:bg-zinc-800 transition-colors"><Minus size={12} strokeWidth={3} /></button>
                              <span className="text-[13px] font-black text-white">{cartItem.quantity}</span>
                              <button onClick={() => updateCartQuantity(cartItem.variantId, cartItem.extras, 1)} className="w-7 h-full flex items-center justify-center text-[#d5b263] hover:bg-zinc-900 active:bg-zinc-800 transition-colors"><Plus size={12} strokeWidth={3} /></button>
                            </div>
                          </div>
                          <span className="text-[14px] font-black text-[#d5b263] block mb-1">₹{(itemTotal + extrasTotal).toFixed(0)}</span>
                          {item.variants.length > 1 && <p className="text-[12px] text-zinc-400 font-medium">{variant.variantName}</p>}

                          {/* Extras */}
                          {cartItem.extras && cartItem.extras.length > 0 && (
                            <div className="mt-2 space-y-1.5 pl-2 border-l border-white/10">
                              {cartItem.extras.map(extra => {
                                const extraData = extras.find(e => e.id === extra.extraId);
                                return extraData ? (
                                  <div key={extra.extraId} className="flex justify-between text-[11px] font-medium text-zinc-400">
                                    <span className="truncate pr-2">{extraData.name} <span className="opacity-70 text-[9px] ml-1">x{extra.quantity}</span></span>
                                    <span className="font-bold text-zinc-300 shrink-0">₹{((extraData.price / 100) * extra.quantity).toFixed(0)}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bill Details */}
              <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
                <div className="bg-[#0c0c0e] rounded-[24px] border border-white/5 p-5 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                  <h4 className="text-[13px] font-black text-white uppercase tracking-widest mb-4">Bill Details</h4>
                  
                  {/* Offers Panel */}
                  {sessionId && (
                    <OffersPanel
                      sessionId={sessionId}
                      restaurantId={restaurantId}
                      subtotalPaise={Math.round(cartSubtotal * 100)}
                      availableOffers={offers}
                      appliedDiscounts={appliedDiscounts}
                      onOffersChanged={loadAppliedDiscounts}
                      liveTotalDiscountPaise={Math.round(cartDiscount * 100)}
                    />
                  )}
                  
                  <div className="space-y-3 mt-4">
                    {cartDiscount > 0 && (
                      <div className="flex justify-between items-center text-emerald-400 text-[13px]">
                        <span className="font-bold">Total Discount</span>
                        <span className="font-black">-₹{cartDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {cartGst > 0 && (
                      <div className="flex justify-between items-center text-zinc-400 text-[13px]">
                        <span className="font-medium">Taxable Amount</span>
                        <span className="text-zinc-300 font-bold">₹{cartTaxable.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Tax Display */}
                    <div className="flex justify-between items-center text-zinc-400 text-[13px]">
                      <span className="font-medium">Taxes & Charges <span className="opacity-60">({restaurant.defaultGstPercentage}%)</span></span>
                      <span className="text-zinc-300 font-bold">₹{cartGst.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end text-[16px] font-black text-white mt-5 pt-4 border-t border-white/10 border-dashed relative">
                    <span className="tracking-wide">To Pay</span>
                    <span className="text-[20px] text-[#d5b263]">₹{cartGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fancy Footer */}
            <div className="p-4 bg-gradient-to-t from-[#050506] via-[#050506] to-[#050506]/80 backdrop-blur-xl border-t border-white/5 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.5)] pb-[max(24px,env(safe-area-bottom))] relative z-20 shrink-0">
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="w-full relative group overflow-hidden h-[60px] rounded-[20px] disabled:opacity-50 transition-transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#d5b263] to-[#e6d09a] shadow-lg"></div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                
                <div className="relative h-full flex items-center justify-between px-6 font-black text-black">
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[15px] uppercase tracking-wider">{placingOrder ? 'Placing Order...' : 'Place Order'}</span>
                    <span className="text-[10px] opacity-80 font-bold tracking-widest mt-0.5">TAXES & CHARGES INCLUDED</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/10 px-3 py-1.5 rounded-xl shadow-inner border border-black/10">
                    <span className="text-[18px]">₹{cartGrandTotal.toFixed(2)}</span>
                    <ChevronRight size={18} strokeWidth={3} className="text-black/70" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Increase Modal */}
      {showQuantityModal && quantityModalData && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowQuantityModal(false)}>
          <div className="bg-[#0c0c0e] border border-zinc-800 w-full sm:max-w-md rounded-t-[40px] sm:rounded-3xl p-6 pb-[max(24px,env(safe-area-bottom))] shadow-2xl animate-in slide-in-from-bottom-full duration-300 relative" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8 relative z-10">
              <h3 className="text-xl font-black text-white mb-2">Apply Extras to All Items?</h3>
              <p className="text-zinc-400 text-sm">You have extras on this item. How would you like to apply them when increasing the quantity?</p>
            </div>

            <div className="space-y-3 mb-8">
              <button
                onClick={() => handleQuantityModalResponse(true)}
                className="w-full p-4 bg-[#d5b263] text-black rounded-xl font-black hover:bg-[#c4a152] transition-colors text-left"
              >
                <div className="font-black">Apply to All Items</div>
                <div className="text-xs opacity-90 mt-0.5">Extras will be added to each item</div>
              </button>

              <button
                onClick={() => handleQuantityModalResponse(false)}
                className="w-full p-4 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="font-bold">Keep on First Item Only</div>
                <div className="text-xs text-zinc-400 mt-0.5">Extras stay only on the original item</div>
              </button>
            </div>

            <button
              onClick={() => setShowQuantityModal(false)}
              className="w-full py-3 rounded-xl font-bold text-zinc-400 bg-zinc-900 hover:bg-zinc-800 transition-colors relative z-10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sort Modal */}
      {showSortModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in" onClick={() => setShowSortModal(false)}>
          <div className="bg-[#0c0c0e]/95 backdrop-blur-2xl border border-zinc-800/80 w-full sm:max-w-md rounded-t-[32px] sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 relative z-[111]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-900">
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowUpDown size={16} className="text-[#d5b263]" /> Sort Options
              </h3>
              <button onClick={() => setShowSortModal(false)} className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90">
                <X size={16} />
              </button>
            </div>
            
            {/* Sort Options List */}
            <div className="space-y-2.5">
              {[
                { id: 'relevance', label: 'Relevance / Popularity', icon: <Sparkles size={15} className="text-[#d5b263]" /> },
                { id: 'price-low', label: 'Price: Low to High', icon: <TrendingUp size={15} className="text-green-400" /> },
                { id: 'price-high', label: 'Price: High to Low', icon: <TrendingDown size={15} className="text-rose-400" /> },
                { id: 'rating', label: 'Customer Rating (4.0+)', icon: <Star size={15} className="text-[#d5b263]" fill="currentColor" /> },
              ].map(opt => {
                const isSelected = sortBy === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id as any); setShowSortModal(false); }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 active:scale-[0.98] flex-row
                      ${isSelected 
                        ? 'border-[#d5b263]/30 bg-[#d5b263]/10' 
                        : 'border-zinc-900 bg-[#0c0c0e]/50 hover:border-zinc-800'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors
                        ${isSelected ? 'bg-[#d5b263]/25 border-[#d5b263]/30' : 'bg-zinc-900 border-zinc-850'}
                      `}>
                        {opt.icon}
                      </div>
                      <span className={`text-[13.5px] font-bold tracking-tight ${isSelected ? 'text-[#d5b263]' : 'text-zinc-350'}`}>{opt.label}</span>
                    </div>
                    {/* Swiggy Style Radial selection */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#d5b263] bg-[#d5b263]' : 'border-zinc-700'}`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Filters All-in-One Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in" onClick={() => setShowFiltersModal(false)}>
          <div className="bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 w-full sm:max-w-md rounded-t-[32px] sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 relative z-[121]" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#d5b263]" /> Refine Search
              </h3>
              <button onClick={() => setShowFiltersModal(false)} className="p-1.5 bg-[#121215] border border-white/5 text-zinc-400 hover:text-white rounded-full transition-all active:scale-90">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 mb-6">
              {/* Food Preference Section */}
              <section className="bg-[#050506]/40 border border-white/5 rounded-xl p-3.5">
                <h4 className="text-[10px] font-black text-zinc-550 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Leaf size={11} className="text-[#d5b263]" /> Food Preference
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVegMode(!vegMode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] font-black transition-all active:scale-95
                      ${vegMode ? 'border-emerald-500 bg-emerald-500/10 text-emerald-450' : 'border-white/10 bg-black/40 text-zinc-350 hover:text-white'}
                    `}
                  >
                    <div className="w-3 h-3 border-[1.5px] border-emerald-500 flex items-center justify-center rounded-[3px] bg-transparent">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    </div>
                    Veg Only
                  </button>
                  <button
                    onClick={() => setNonVegMode(!nonVegMode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] font-black transition-all active:scale-95
                      ${nonVegMode ? 'border-rose-500 bg-rose-500/10 text-rose-455' : 'border-white/10 bg-black/40 text-zinc-350 hover:text-white'}
                    `}
                  >
                    <div className="w-3 h-3 border-[1.5px] border-rose-500 flex items-center justify-center rounded-[3px] bg-transparent">
                      <div className="w-0 h-0 border-l-[2.5px] border-l-transparent border-r-[2.5px] border-r-transparent border-b-[3.5px] border-b-rose-500"></div>
                    </div>
                    Non-Veg
                  </button>
                </div>
              </section>

              {/* Price Range Section */}
              <section className="bg-[#050506]/40 border border-white/5 rounded-xl p-3.5">
                <h4 className="text-[10px] font-black text-zinc-550 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Tag size={11} className="text-[#d5b263]" /> Price Range
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'below-99', label: 'Below ₹99' },
                    { id: '100-199', label: '₹100 - ₹199' },
                    { id: '200-499', label: '₹200 - ₹499' },
                    { id: 'above-500', label: 'Above ₹500' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPriceRange(priceRange === opt.id ? null : opt.id as any)}
                      className={`py-2 rounded-xl border font-bold text-[11.5px] transition-all active:scale-95
                        ${priceRange === opt.id 
                          ? 'border-[#d5b263] bg-[#d5b263]/10 text-[#d5b263] font-black shadow-md' 
                          : 'border-white/10 bg-black/40 text-zinc-350 hover:border-white/20 hover:text-white'}
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Other Filters Section */}
              <section className="bg-[#050506]/40 border border-white/5 rounded-xl p-3.5">
                <h4 className="text-[10px] font-black text-zinc-550 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles size={11} className="text-[#d5b263]" /> Ratings & Offers
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRatingFilter(!ratingFilter)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] font-bold transition-all active:scale-95
                      ${ratingFilter ? 'border-[#d5b263] bg-[#d5b263]/10 text-[#d5b263] font-black' : 'border-white/10 bg-black/40 text-zinc-350 hover:text-white'}
                    `}
                  >
                    <Star size={12} className={ratingFilter ? 'text-[#d5b263] fill-[#d5b263]' : 'text-zinc-550'} />
                    Ratings 4.0+
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/5 bg-black/20 text-zinc-700 text-[12px] font-bold opacity-30 cursor-not-allowed"
                  >
                    <Percent size={12} />
                    Active Offers
                  </button>
                </div>
              </section>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={() => { setVegMode(false); setNonVegMode(false); setRatingFilter(false); setPriceRange(null); setSortBy('relevance'); setShowFiltersModal(false); }}
                className="flex-1 py-3.5 rounded-xl font-bold text-zinc-350 bg-[#16161a] border border-white/10 hover:border-white/20 hover:text-white transition-all active:scale-95 text-xs uppercase tracking-wider"
              >
                Clear All
              </button>
              <button 
                onClick={() => setShowFiltersModal(false)}
                className="flex-[2] py-3.5 rounded-xl font-black text-black bg-[#d5b263] hover:bg-[#c4a152] transition-all active:scale-95 text-xs uppercase tracking-wider shadow-lg shadow-[#d5b263]/10"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for scrollbar hiding */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: max(20px, env(safe-area-bottom)); }
      `}} />
      </div>
    </div>
  );
}

// Optimized Responsive Skeleton
function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-[#050506]">
      <div className="max-w-[1440px] mx-auto bg-[#0c0c0e] min-h-screen shadow-2xl border-x border-zinc-800 flex flex-col overflow-hidden">
        {/* Hero Banner Skeleton */}
        <div className="h-[180px] sm:h-[220px] md:h-[300px] bg-zinc-900 w-full animate-pulse"></div>

        {/* Info Card Skeleton */}
        <div className="px-4 -mt-16 relative z-10 mb-8 max-w-2xl mx-auto w-full">
          <div className="bg-[#121215] rounded-[28px] p-6 border border-zinc-800 flex flex-col items-center animate-pulse">
            <div className="h-8 bg-zinc-800 w-3/4 rounded-lg mb-4"></div>
            <div className="h-4 bg-zinc-800/60 w-1/2 rounded-full mb-6"></div>
          </div>
        </div>

        {/* Main Layout Skeleton */}
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Sidebar Skeleton */}
          <div className="w-[68px] md:w-[260px] bg-[#0c0c0e] border-r border-zinc-800 flex flex-col gap-6 py-4 items-center md:items-start md:px-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full animate-pulse">
                <div className="h-11 w-11 md:h-12 md:w-12 bg-zinc-900 rounded-xl shrink-0 border border-zinc-800"></div>
                <div className="hidden md:block h-4 bg-zinc-900 w-24 rounded shrink-0"></div>
              </div>
            ))}
          </div>

          {/* Content Pane Skeleton */}
          <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-[#050506]">
            <div className="h-6 bg-zinc-900 w-32 rounded mb-6 animate-pulse border border-zinc-800"></div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                <div key={i} className="space-y-3 animate-pulse bg-[#0c0c0e] p-3 rounded-2xl border border-zinc-800">
                  <div className="aspect-square bg-zinc-900 rounded-xl"></div>
                  <div className="h-4 bg-zinc-900 w-3/4 rounded"></div>
                  <div className="h-3 bg-zinc-900/60 w-1/2 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}