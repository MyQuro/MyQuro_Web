"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
    ShoppingCart, Search, Plus, Minus, X, Utensils, Loader2, Tag, Package, ChevronRight, ChevronDown, CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid';

// Types
type Extra = { id: string; name: string; price: number; quantity?: number; description?: string };
type Variant = { id: string; variantName: string; price: number; portionSize?: string; isActive?: boolean };
type MenuItem = {
    id: string; name: string; description?: string; isVeg: boolean;
    imageURL?: string; variants: Variant[]; extras?: Extra[];
    isActive: boolean;
};
type Category = {
    id: string; category: string; description?: string;
    items: MenuItem[]; isActive: boolean;
};

type CartItemExtra = { extraId: string; name: string; price: number; quantity: number };

type CartItem = {
    cartItemId: string;
    menuItemId: string;
    variantId?: string;
    categoryId?: string;
    name: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    extras: CartItemExtra[];
    isVeg: boolean;
};

type Offer = {
    id: string;
    name: string;
    description?: string;
    offerType: 'percentage' | 'flat_discount' | 'buy_1_get_1' | 'category_discount';
    discountValue: number;
    applicableCategoryId?: string;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    code: string;
    isActive: boolean;
};

const VegIndicator = ({ isVeg }: { isVeg: boolean }) => (
    <div className={`w-3 h-3 rounded-sm border ${isVeg ? 'border-green-600' : 'border-red-600'} flex items-center justify-center shrink-0`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </div>
);

export default function ManualBillingPage() {
    const { restaurant, user } = useDashboard();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Cart State
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [notes, setNotes] = useState<string>('');
    const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [processingMode, setProcessingMode] = useState<'none' | 'kot' | 'bill' | 'complete'>('none');
    const [placedOrderDetails, setPlacedOrderDetails] = useState<any>(null);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
    const [isCartOpen, setIsCartOpen] = useState(true);

    // Offers & Advanced Discounts
    const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
    const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);
    const [promoCode, setPromoCode] = useState('');
    const [showBillDetails, setShowBillDetails] = useState(false);

    // Customization Modal State
    const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");
    const [selectedExtras, setSelectedExtras] = useState<{ extraId: string; quantity: number }[]>([]);
    const [modalQuantity, setModalQuantity] = useState(1);

    const sidebarRef = useRef<HTMLDivElement>(null);
    const contentPanelRef = useRef<HTMLDivElement>(null);

    // Reset placed order if cart or discounts change
    useEffect(() => {
        setPlacedOrderDetails(null);
    }, [cartItems, discountType, discountValue, appliedOffer, notes]);

    const loadMenu = useCallback(async () => {
        if (!restaurant) return;
        try {
            setLoading(true);
            const [menuData, offersData] = await Promise.all([
                apiClient.getManagementMenu(restaurant.id),
                apiClient.getOffers(restaurant.id)
            ]) as any[];

            if (menuData && menuData.categories) {
                setCategories(menuData.categories.filter((c: any) => c.isActive));
            }
            if (offersData && offersData.offers) {
                setAvailableOffers(offersData.offers.filter((o: any) => o.isActive));
            }
        } catch (error) {
            toast.error('Failed to load menu or offers');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [restaurant]);

    useEffect(() => {
        loadMenu();
    }, [loadMenu]);

    const filteredCategories = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return categories
            .map(cat => ({
                ...cat,
                items: cat.items.filter(item => item.isActive &&
                    (dietaryFilter === 'all' || (dietaryFilter === 'veg' ? item.isVeg : !item.isVeg)) &&
                    (query === '' || item.name.toLowerCase().includes(query))
                )
            }))
            .filter(cat => cat.items.length > 0);
    }, [categories, searchQuery, dietaryFilter]);

    // Cart Methods
    const handleItemClick = (item: MenuItem, catId?: string) => {
        if (item.variants.length === 1 && (!item.extras || item.extras.length === 0)) {
            addToCart(item.variants[0].id, item.id, item.name, item.isVeg, item.variants[0].price, [], 1, catId);
        } else {
            setCustomizingItem({ ...item, categoryId: catId } as any);
            setSelectedVariantId(item.variants[0]?.id || "");
            setSelectedExtras([]);
            setModalQuantity(1);
        }
    };

    const addToCart = (variantId: string, menuItemId: string, name: string, isVeg: boolean, unitPrice: number, extras: CartItemExtra[], quantity: number, categoryId?: string) => {
        // For POS, we often group identical items
        const existingIndex = cartItems.findIndex(ci =>
            ci.menuItemId === menuItemId &&
            ci.variantId === variantId &&
            JSON.stringify(ci.extras) === JSON.stringify(extras)
        );

        if (existingIndex >= 0) {
            const newCart = [...cartItems];
            newCart[existingIndex].quantity += quantity;
            setCartItems(newCart);
        } else {
            setCartItems([...cartItems, {
                cartItemId: nanoid(),
                menuItemId,
                variantId,
                categoryId,
                name,
                variantName: categories.flatMap(c => c.items).find(i => i.id === menuItemId)?.variants.find(v => v.id === variantId)?.variantName,
                quantity,
                unitPrice,
                extras,
                isVeg
            }]);
        }
    };

    const handleAddFromModal = () => {
        if (!customizingItem || !selectedVariantId) return;
        const variant = customizingItem.variants.find(v => v.id === selectedVariantId);
        if (!variant) return;

        const cartExtras: CartItemExtra[] = selectedExtras.map(se => {
            const extraData = customizingItem.extras?.find(e => e.id === se.extraId);
            return {
                extraId: se.extraId,
                name: extraData?.name || "Extra",
                price: extraData?.price || 0,
                quantity: se.quantity
            };
        });

        addToCart(variant.id, customizingItem.id, customizingItem.name, customizingItem.isVeg, variant.price, cartExtras, modalQuantity, (customizingItem as any).categoryId);
        setCustomizingItem(null);
        toast.success('Added to cart');
    };

    const updateCartItemQuantity = (cartItemId: string, delta: number) => {
        setCartItems(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                const newQ = item.quantity + delta;
                return { ...item, quantity: Math.max(0, newQ) };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeCartItem = (cartItemId: string) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    // Calculations - Unified Rule: (Subtotal + GST) - Discount
    const subtotal = cartItems.reduce((acc, item) => {
        const itemTotal = item.unitPrice * item.quantity;
        const extrasTotal = item.extras.reduce((sum, ext) => sum + (ext.price * ext.quantity), 0) * item.quantity;
        return acc + itemTotal + extrasTotal;
    }, 0);

    const gstRateRaw = restaurant?.defaultGstPercentage ? Number(restaurant.defaultGstPercentage) : 0;
    const gstDecimal = gstRateRaw / 100;
    const gst = Math.floor(subtotal * gstDecimal);
    const grandTotalBeforeDiscount = subtotal + gst;

    const calculateOfferDiscount = useCallback((offer: Offer) => {
        if (subtotal < (offer.minOrderValue || 0)) return 0;

        let discountAmt = 0;
        switch (offer.offerType) {
            case 'percentage':
                discountAmt = Math.floor((grandTotalBeforeDiscount * offer.discountValue) / 100);
                break;
            case 'flat_discount':
                discountAmt = offer.discountValue * 100; // stored in rupees, convert to paise
                break;
            case 'buy_1_get_1':
                // Collect eligible prices
                const eligiblePrices: number[] = [];
                cartItems.forEach(item => {
                    if (!offer.applicableCategoryId || item.categoryId === offer.applicableCategoryId) {
                        for (let i = 0; i < item.quantity; i++) {
                            eligiblePrices.push(item.unitPrice);
                        }
                    }
                });
                eligiblePrices.sort((a, b) => b - a);
                let bogoSubtotal = 0;
                for (let i = 1; i < eligiblePrices.length; i += 2) {
                    bogoSubtotal += eligiblePrices[i];
                }
                discountAmt = Math.floor(bogoSubtotal * (1 + gstDecimal));
                break;
            case 'category_discount':
                const categorySubtotal = cartItems
                    .filter(item => item.categoryId === offer.applicableCategoryId)
                    .reduce((sum, item) => {
                        const itemTotal = item.unitPrice * item.quantity;
                        const extrasTotal = item.extras.reduce((s, e) => s + (e.price * e.quantity), 0) * item.quantity;
                        return sum + itemTotal + extrasTotal;
                    }, 0);
                discountAmt = Math.floor((categorySubtotal * (1 + gstDecimal)) * offer.discountValue / 100);
                break;
        }

        if (offer.maxDiscountAmount && discountAmt > (offer.maxDiscountAmount * 100)) {
            discountAmt = offer.maxDiscountAmount * 100;
        }

        return discountAmt;
    }, [cartItems, grandTotalBeforeDiscount, gstDecimal, subtotal]);

    const offerDiscount = useMemo(() => {
        return appliedOffer ? calculateOfferDiscount(appliedOffer) : 0;
    }, [appliedOffer, calculateOfferDiscount]);

    let manualDiscount = 0;
    if (discountType === 'percentage' && discountValue > 0) {
        manualDiscount = Math.floor((grandTotalBeforeDiscount * discountValue) / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
        manualDiscount = Math.round(discountValue * 100);
    }

    const totalDiscount = offerDiscount + manualDiscount;
    const grandTotal = Math.max(0, grandTotalBeforeDiscount - totalDiscount);

    const handleApplyPromo = () => {
        if (!promoCode) return;
        const offer = availableOffers.find(o => o.code.toLowerCase() === promoCode.toLowerCase());
        if (offer) {
            setAppliedOffer(offer);
            setPromoCode('');
            toast.success(`Promo code ${offer.code} applied!`);
        } else {
            toast.error('Invalid promo code');
        }
    };

    const handleKOT = async (printMode: 'kot' | 'bill' | 'complete') => {
        if (!restaurant) return;
        if (cartItems.length === 0) {
            toast.error("Cart is empty");
            return;
        }

        setProcessingMode(printMode);
        try {
            let order = placedOrderDetails;

            if (!order) {
                const orderData: any = {
                    tableSessionId: '',
                    restaurantId: restaurant.id,
                    items: cartItems.map(ci => ({
                        menuItemId: ci.menuItemId,
                        menuItemVariantId: ci.variantId || '',
                        quantity: ci.quantity,
                        extras: ci.extras.map(e => ({ extraId: e.extraId, quantity: e.quantity, notes: '' })),
                        itemNotes: ''
                    })),
                    notes: notes,
                    discount: totalDiscount,
                    discountType: 'none', // We send the final calculated amount as a flat discount to the backend
                    discountValue: totalDiscount,
                    appliedOfferId: appliedOffer?.id,
                    status: 'completed'
                };

                const orderRes = await apiClient.placeOrder(orderData) as any;
                const newOrder = orderRes?.order;

                if (!newOrder || !newOrder.tableSessionId) throw new Error("Could not create KOT");

                order = newOrder;
                setPlacedOrderDetails(order);
                toast.success("Order recorded successfully!");
            }

            if (printMode === 'kot' || printMode === 'bill') {
                const { BillPrinter } = await import('@/lib/print-bill');
                const printer = new BillPrinter();

                const now = new Date();
                const commonData = {
                    restaurantName: restaurant?.restaurantName || 'Restaurant',
                    restaurantAddress: restaurant?.address || undefined,
                    restaurantPhone: restaurant?.phone || undefined,
                    fssaiLicenseNumber: restaurant?.fssaiLicenseNumber || undefined,
                    gstin: '33AOKPR9830H1ZK',
                    invoiceNumber: order.id ? order.id.slice(-6).toUpperCase() : 'N/A',
                    orderNumber: order.orderNumber || order.id?.slice(-3).toUpperCase() || '11',
                    tableNumber: 'Manual Order',
                    orderType: 'Takeaway',
                    cashierName: user?.name || 'Cashier',
                    date: now.toLocaleDateString('en-GB'),
                    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    items: cartItems.map(ci => ({
                        name: ci.name,
                        variant: ci.variantName,
                        quantity: ci.quantity,
                        price: ci.unitPrice / 100,
                        total: (ci.unitPrice * ci.quantity) / 100,
                        extras: ci.extras.map(e => ({
                            extraId: e.extraId,
                            name: e.name,
                            quantity: e.quantity,
                            unitPrice: e.price / 100,
                            totalPrice: (e.price * e.quantity) / 100
                        }))
                    })),
                    subtotal: subtotal / 100,
                    tax: gst / 100,
                    taxPercentage: gstRateRaw,
                    cgst: (gst / 2) / 100,
                    sgst: (gst / 2) / 100,
                    discount: totalDiscount / 100,
                    discountType: appliedOffer ? 'percentage' : (discountType === 'none' ? undefined : discountType),
                    discountValue: appliedOffer ? appliedOffer.discountValue : discountValue,
                    discountLabel: appliedOffer ? (appliedOffer.offerType === 'buy_1_get_1' ? 'BOGO FREE' : appliedOffer.name) : undefined,
                    grandTotal: grandTotal / 100,
                    notes: notes,
                    paymentMethod: 'Cash'
                };

                await printer.print({ ...commonData, isKOT: printMode === 'kot' });
            }

            if (printMode === 'bill' || printMode === 'complete') {
                setCartItems([]);
                setDiscountType('none');
                setDiscountValue(0);
                setNotes('');
                setPlacedOrderDetails(null);
            }
        } catch (err: any) {
            console.error("KOT error:", err);
            toast.error(err.message || "Failed to generate KOT");
        } finally {
            setProcessingMode('none');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#050506] font-sans">
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT SIDEBAR: Category Navigation - Compact Rail (Desktop Only) */}
                <div
                    ref={sidebarRef}
                    className="hidden lg:flex lg:w-20 shrink-0 border-r border-white/5 flex-col overflow-y-auto scrollbar-hide bg-[#0c0c0e]/40 backdrop-blur-md transition-all duration-300"
                >
                    <div className="flex flex-col py-2">
                        <button
                            onClick={() => setActiveCategoryId('all')}
                            className={`relative flex flex-col items-center gap-1 py-3 px-1 transition-all text-center group ${activeCategoryId === 'all' ? 'bg-zinc-950/60 border-l-2 border-[#d5b263]' : 'hover:bg-white/5'
                                }`}
                        >
                            {activeCategoryId === 'all' && <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#d5b263]" />}
                            <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 transition-all duration-300 ${activeCategoryId === 'all' ? 'bg-[#d5b263]/10 border border-[#d5b263]/25 scale-105' : 'bg-black/35 border border-zinc-800 group-hover:scale-105'
                                }`}>
                                <Utensils className={`${activeCategoryId === 'all' ? 'text-[#d5b263]' : 'text-gray-300'} w-5 h-5 transition-colors`} />
                            </div>
                            <span className={`text-[9px] md:text-[10px] leading-tight font-black transition-colors px-1 uppercase tracking-tight ${activeCategoryId === 'all' ? 'text-[#d5b263]' : 'text-zinc-500 group-hover:text-white'
                                }`}>All</span>
                        </button>
                        {filteredCategories.map((cat) => {
                            const isActive = activeCategoryId === cat.id;
                            const thumbUrl = cat.items[0]?.imageURL;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategoryId(cat.id)}
                                    className={`relative flex flex-col items-center gap-1 py-3 px-1 transition-all text-center group ${isActive ? 'bg-zinc-950/60 border-l-2 border-[#d5b263]' : 'hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#d5b263]" />}
                                    <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? 'bg-[#d5b263]/10 border border-[#d5b263]/25 scale-105' : 'bg-black/35 border border-zinc-800 group-hover:scale-105'
                                        }`}>
                                        {thumbUrl ? (
                                            <img src={thumbUrl} alt={cat.category} className="w-full h-full object-cover" />
                                        ) : (
                                            <Utensils className={`${isActive ? 'text-[#d5b263]' : 'text-gray-300'} w-5 h-5 transition-colors`} />
                                        )}
                                    </div>
                                    <span className={`text-[9px] md:text-[10px] leading-tight font-black transition-colors px-1 line-clamp-2 uppercase tracking-tight ${isActive ? 'text-[#d5b263]' : 'text-zinc-500 group-hover:text-white'
                                        }`}>
                                        {cat.category}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CENTER PANEL: Items Grid */}
                <div className="flex-1 flex flex-col h-full bg-[#050506] min-w-0 relative">
                    {/* Category Navigation - Horizontal (Mobile/Tablet Only) */}
                    <div className="lg:hidden flex items-center bg-white border-b border-gray-100 sticky top-0 z-30 overflow-x-auto scrollbar-hide py-2 px-4 gap-2">
                        <button
                            onClick={() => setActiveCategoryId('all')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeCategoryId === 'all' ? 'bg-[#d5b263] text-white border-[#d5b263] shadow-md shadow-[#d5b263]/5' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-white'
                                }`}
                        >
                            All
                        </button>
                        {filteredCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategoryId(cat.id)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeCategoryId === cat.id ? 'bg-[#d5b263] text-white border-[#d5b263] shadow-md shadow-[#d5b263]/5' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-white'
                                    }`}
                            >
                                {cat.category}
                            </button>
                        ))}
                    </div>
                    <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 bg-[#0c0c0e]/80 backdrop-blur-md sticky top-[52px] lg:top-0 z-20">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-[#d5b263] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2 bg-gray-50 border border-transparent focus:border-[#d5b263]/20 focus:bg-white rounded-xl text-sm font-bold focus:outline-none transition-all"
                            />
                        </div>
                        <div className="hidden sm:flex items-center bg-gray-100 p-0.5 rounded-xl shrink-0">
                            {(['all', 'veg', 'non-veg'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setDietaryFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dietaryFilter === f ? 'bg-white text-[#d5b263] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div ref={contentPanelRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-black/10">
                        {filteredCategories.filter(cat => activeCategoryId === 'all' || cat.id === activeCategoryId).map(cat => (
                            <div key={cat.id} className="animate-in fade-in duration-300">
                                <h3 className="text-xs font-black text-white/90 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
                                    {cat.category}
                                    <span className="text-[10px] font-bold text-[#d5b263] bg-[#d5b263]/10 border border-[#d5b263]/20 px-1.5 py-0.5 rounded-lg">{cat.items.length}</span>
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                    {cat.items.map(item => {
                                        const inCartCount = cartItems.filter(ci => ci.menuItemId === item.id).reduce((sum, ci) => sum + ci.quantity, 0);
                                        const price = item.variants[0]?.price / 100 || 0;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`group relative bg-white rounded-2xl border ${inCartCount > 0 ? 'border-[#d5b263]/30 shadow-md ring-1 ring-[#d5b263]/5' : 'border-gray-100 shadow-sm'} p-3 flex flex-col h-full hover:shadow-xl hover:border-[#d5b263]/20 transition-all duration-300 overflow-hidden`}
                                            >
                                                {/* Category Badge if 'All' is selected */}
                                                {activeCategoryId === 'all' && (
                                                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-gray-50 text-[7px] font-black text-gray-400 uppercase rounded-bl-lg border-l border-b border-gray-100/50">
                                                        {cat.category}
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-2.5">
                                                    <VegIndicator isVeg={item.isVeg} />
                                                    <div className="font-black text-gray-900 text-xs text-right">
                                                        ₹{price.toFixed(0)}
                                                    </div>
                                                </div>

                                                <div className="flex-1 mb-3">
                                                    <h4 className="font-black text-gray-800 text-[12px] leading-tight line-clamp-2 mb-0.5 group-hover:text-[#d5b263] transition-colors">
                                                        {item.name}
                                                    </h4>
                                                    {item.description && (
                                                        <p className="text-[9px] text-gray-400 font-bold line-clamp-1 opacity-60">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="mt-auto space-y-2">
                                                    {(item.variants.length > 1 || (item.extras && item.extras.length > 0)) && (
                                                        <div className="flex items-center gap-1 text-[8px] font-black text-black bg-[#d5b263] px-1.5 py-0.5 rounded-full w-fit uppercase tracking-tighter border border-blue-100/20">
                                                            <Package size={9} className="text-black" />
                                                            {item.variants.length > 1 ? `${item.variants.length} Options` : 'Customizable'}
                                                        </div>
                                                    )}

                                                    {inCartCount === 0 ? (
                                                        <button
                                                            onClick={() => handleItemClick(item, cat.id)}
                                                            className="w-full h-8 bg-white text-[#d5b263] font-black text-[10px] rounded-xl border border-[#d5b263]/30 shadow-sm hover:bg-[#d5b263] hover:text-white transition-all flex items-center justify-center tracking-widest"
                                                        >
                                                            ADD
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center justify-between w-full h-8 bg-[#d5b263] rounded-xl overflow-hidden text-black font-black text-[10px] shadow-sm border border-[#d5b263]">
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                const entry = cartItems.find(ci => ci.menuItemId === item.id);
                                                                if (entry) updateCartItemQuantity(entry.cartItemId, -1);
                                                            }} className="w-8 h-full flex items-center justify-center hover:bg-black/10">
                                                                <Minus size={12} strokeWidth={4} />
                                                            </button>
                                                            <span className="flex-1 text-center text-[11px]">{inCartCount}</span>
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleItemClick(item, cat.id);
                                                            }} className="w-8 h-full flex items-center justify-center hover:bg-black/10">
                                                                <Plus size={12} strokeWidth={4} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Floating Cart Bar */}
                    {cartItems.length > 0 && (
                        <div className="lg:hidden sticky bottom-4 left-6 right-6 z-40 animate-in slide-in-from-bottom-4 duration-500">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="w-full bg-[#d5b263] text-black p-4 rounded-3xl shadow-[0_10px_30px_rgba(213,178,99,0.3)] flex items-center justify-between group active:scale-95 transition-all overflow-hidden"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center relative">
                                        <ShoppingCart className="w-5 h-5 text-white" />
                                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[#d5b263] rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">
                                            {cartItems.reduce((s, i) => s + i.quantity, 0)}
                                        </span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">Items Added</p>
                                        <p className="text-lg font-black leading-none">{formatPrice(grandTotal)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pr-2">
                                    <span className="text-[11px] font-black uppercase tracking-widest">View Cart</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </div>
                                {/* Subtle animated background */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 animate-pulse" />
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL: Cart (Desktop-Fixed / Mobile-Drawer) */}
                <div className={`
                    fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:relative lg:inset-auto lg:bg-transparent lg:backdrop-blur-none lg:z-30 
                    ${isCartOpen ? 'flex' : 'hidden lg:flex'}
                `} onClick={() => setIsCartOpen(false)}>
                    <div
                        className={`
                            ml-auto w-full max-w-[400px] h-full bg-[#0c0c0e]/95 border-l border-white/5 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.1)] 
                            transition-transform duration-300 transform
                            ${isCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                        `}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 bg-[#0c0c0e]/90 border-b border-white/5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#d5b263]/10 border border-[#d5b263]/25 rounded-xl flex items-center justify-center">
                                    <ShoppingCart className="text-[#d5b263] w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-white leading-tight">Your Cart</h2>
                                    <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-wider">{cartItems.length} Items</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {cartItems.length > 0 && (
                                    <button
                                        onClick={() => { setCartItems([]); setPlacedOrderDetails(null); }}
                                        className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-all"
                                    >
                                        <X size={14} strokeWidth={3} />
                                        <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">Clear</span>
                                    </button>
                                )}
                                <button className="lg:hidden p-2 text-gray-400" onClick={() => setIsCartOpen(false)}>
                                    <X size={24} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 scrollbar-hide">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-gray-50 mb-6 relative">
                                        <ShoppingCart className="w-8 h-8 text-gray-200" />
                                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gray-50 rounded-2xl flex items-center justify-center border border-white">
                                            <Plus size={16} className="text-gray-300" />
                                        </div>
                                    </div>
                                    <p className="text-gray-900 font-black text-xs">Cart is feeling lonely</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1.5 max-w-[160px] leading-relaxed">Add delicious items from the menu to build an order</p>
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in fade-in duration-300">
                                    {cartItems.map(ci => (
                                        <div key={ci.cartItemId} className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm group hover:shadow-md hover:border-[#d5b263]/20 transition-all duration-300">
                                            <div className="flex justify-between items-center gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <VegIndicator isVeg={ci.isVeg} />
                                                        <div className="min-w-0">
                                                            <span className="text-xs font-black text-gray-900 truncate block leading-tight group-hover:text-[#d5b263] transition-colors">{ci.name}</span>
                                                            {ci.variantName && <p className="text-[8px] font-bold text-gray-400 mt-0.5">Size: {ci.variantName}</p>}
                                                        </div>
                                                    </div>
                                                    {ci.extras.length > 0 && (
                                                        <div className="ml-5 mt-1 space-y-0.5">
                                                            {ci.extras.map(e => (
                                                                <div key={e.extraId} className="flex items-center gap-1 text-[8px] font-bold text-gray-500">
                                                                    <div className="w-0.5 h-0.5 rounded-full bg-green-500/50" />
                                                                    <span className="truncate">{e.name} x {e.quantity}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center bg-gray-50 rounded-lg p-0.5 border border-gray-100 group-hover:bg-white transition-colors">
                                                        <button
                                                            onClick={() => updateCartItemQuantity(ci.cartItemId, -1)}
                                                            className="w-5.5 h-5.5 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-all active:scale-75"
                                                        >
                                                            <Minus size={10} strokeWidth={3} />
                                                        </button>
                                                        <span className="w-5 text-center text-[11px] font-black text-gray-900 leading-none">{ci.quantity}</span>
                                                        <button
                                                            onClick={() => updateCartItemQuantity(ci.cartItemId, 1)}
                                                            className="w-5.5 h-5.5 flex items-center justify-center hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-md transition-all active:scale-75"
                                                        >
                                                            <Plus size={10} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                    <span className="w-14 text-right text-xs font-black text-white tracking-tight leading-none">
                                                        ₹{((ci.unitPrice * ci.quantity + ci.extras.reduce((s, e) => s + e.price * e.quantity, 0) * ci.quantity) / 100).toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bill Summary: Receipt Style */}
                        <div className="p-4 bg-[#0c0c0e]/95 border-t border-white/5 space-y-3">
                            <div className="bg-[#050506] rounded-2xl p-4 space-y-3 border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 flex justify-between px-2">
                                    {[...Array(20)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0c0c0e] -mt-1" />)}
                                </div>
                                <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setShowBillDetails(!showBillDetails)}>
                                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
                                        Bill Details
                                        <ChevronDown size={12} className={`transition-transform duration-200 ${showBillDetails ? 'rotate-180' : ''}`} />
                                    </h3>
                                    <div className="h-px flex-1 mx-3 bg-white/5" />
                                    {!showBillDetails && (
                                        <span className="text-[10px] font-black text-zinc-450">{formatPrice(subtotal)}</span>
                                    )}
                                </div>

                                {showBillDetails && (
                                    <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex justify-between text-xs font-bold text-zinc-400">
                                            <span>Subtotal</span>
                                            <span>{formatPrice(subtotal)}</span>
                                        </div>

                                        {/* Discount Section Integrated */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-[#d5b263]/10 border border-[#d5b263]/25 rounded-md flex items-center justify-center">
                                                        <Tag size={10} className="text-[#d5b263]" />
                                                    </div>
                                                    <span className="text-[11px] font-black text-zinc-300">Discounts</span>
                                                </div>
                                                <select
                                                    value={discountType}
                                                    onChange={e => setDiscountType(e.target.value as any)}
                                                    className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-[9px] font-black outline-none focus:ring-1 focus:ring-[#d5b263]/20 cursor-pointer"
                                                >
                                                    <option value="none">Apply</option>
                                                    <option value="percentage">%</option>
                                                    <option value="fixed">₹</option>
                                                </select>
                                            </div>
                                            {discountType !== 'none' && (
                                                <div className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-[#d5b263]/20 animate-in slide-in-from-right-2 duration-300">
                                                    <span className="text-[9px] font-black text-[#d5b263] uppercase tracking-widest pl-1">Value</span>
                                                    <input
                                                        type="number"
                                                        value={discountValue || ''}
                                                        onChange={e => setDiscountValue(Number(e.target.value))}
                                                        className="w-16 bg-[#050506] border border-zinc-800 rounded-md px-2 py-1 text-xs font-black text-right text-white focus:ring-0"
                                                        placeholder="0"
                                                        autoFocus
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Promo Code / Offers Section */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="PROMO CODE"
                                                    value={promoCode}
                                                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-[#d5b263]/20 transition-all placeholder:text-gray-300"
                                                />
                                                <button
                                                    onClick={handleApplyPromo}
                                                    disabled={!promoCode}
                                                    className="px-4 py-2 bg-[#d5b263] text-black disabled:bg-gray-100 disabled:text-gray-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#e0bf70] active:scale-95 transition-all shadow-sm"
                                                >
                                                    Apply
                                                </button>
                                            </div>

                                            {appliedOffer && (
                                                <div className="flex items-center justify-between bg-[#d5b263]/10 p-2 rounded-xl border border-[#d5b263]/20 animate-in zoom-in-95 duration-300">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-[#d5b263] rounded-lg flex items-center justify-center text-black shadow-lg shadow-[#d5b263]/10">
                                                            <Tag size={12} className="text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-900 leading-none">{appliedOffer.name}</p>
                                                            <p className="text-[8px] font-bold text-[#d5b263] uppercase tracking-tighter mt-0.5">Applied Successfully</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setAppliedOffer(null)}
                                                        className="p-1.5 hover:bg-white rounded-lg text-red-500 transition-colors"
                                                    >
                                                        <X size={14} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {totalDiscount > 0 && (
                                            <div className="space-y-1.5 pt-1">
                                                {offerDiscount > 0 && appliedOffer && (
                                                    <div className="flex justify-between text-[#d5b263] font-black text-[10px] bg-[#d5b263]/5 px-2 py-1 rounded-lg">
                                                        <span className="uppercase tracking-widest">{appliedOffer.offerType === 'buy_1_get_1' ? 'BOGO FREE' : 'OFFER'}</span>
                                                        <span>-{formatPrice(offerDiscount)}</span>
                                                    </div>
                                                )}
                                                {manualDiscount > 0 && (
                                                    <div className="flex justify-between text-amber-400 font-black text-[10px] bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                                        <span className="uppercase tracking-widest">Manual Discount</span>
                                                        <span>-{formatPrice(manualDiscount)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-between text-[11px] font-bold text-zinc-450">
                                            <span>GST ({gstRateRaw}%)</span>
                                            <span>{formatPrice(gst)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-3 border-t border-dashed border-white/5 flex justify-between items-center group">
                                    <span className="text-sm font-black text-white">To Pay</span>
                                    <span className="text-2xl font-black text-[#d5b263] tabular-nums group-hover:scale-105 transition-transform duration-300">
                                        {formatPrice(grandTotal)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => handleKOT('kot')}
                                    disabled={processingMode !== 'none' || cartItems.length === 0 || !!placedOrderDetails}
                                    className="flex-[0.8] h-11 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl font-black text-[11px] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex flex-col items-center justify-center gap-0.5 shadow-sm overflow-hidden"
                                >
                                    {processingMode === 'kot' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="leading-none">KOT</span>
                                            <span className="text-[7px] opacity-70 uppercase tracking-widest font-bold leading-none">Kitchen</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleKOT('complete')}
                                    disabled={processingMode !== 'none' || cartItems.length === 0}
                                    className="flex-[1.2] h-11 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl font-black text-[10px] shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                                >
                                    {processingMode === 'complete' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-3.5 h-3.5 text-[#d5b263]" strokeWidth={2.5} />
                                            <span className="leading-none tracking-wide">RECORD SALE</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleKOT('bill')}
                                    disabled={processingMode !== 'none' || cartItems.length === 0}
                                    className="flex-[1.7] h-11 bg-[#d5b263] hover:bg-[#c4a152] text-black rounded-xl font-black text-[11px] shadow-md shadow-[#d5b263]/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 relative overflow-hidden"
                                >
                                    {processingMode === 'bill' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="leading-none">PRINT BILL</span>
                                            <div className="w-px h-3 bg-white/30" />
                                            <span className="text-[11px] font-bold opacity-90 leading-none">{formatPrice(grandTotal)}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Customization Modal - Premium Dark Theme */}
                {customizingItem && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200" onClick={() => setCustomizingItem(null)}>
                        <div
                            className="bg-[#0c0c0e] w-full sm:max-w-[440px] rounded-t-[32px] sm:rounded-[28px] h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden relative animate-in slide-in-from-bottom duration-300 border border-white/5"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Handle bar for mobile */}
                            <div className="sm:hidden flex justify-center pt-3 pb-1">
                                <div className="w-12 h-1 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="px-6 py-4 flex items-center justify-between border-b border-white/8">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center shrink-0 ${customizingItem.isVeg ? 'border-green-500' : 'border-red-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${customizingItem.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-[16px] leading-tight">{customizingItem.name}</h3>
                                        <p className="text-[10px] font-bold text-[#d5b263] uppercase tracking-widest mt-0.5">Customization</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCustomizingItem(null)}
                                    className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white/60 hover:text-white transition-all"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Content Scroll Area */}
                            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-hide">
                                {/* Variants Section */}
                                {customizingItem.variants.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-black text-white text-sm">Select Option</h4>
                                            <span className="text-[9px] font-black bg-[#d5b263]/15 text-[#d5b263] px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#d5b263]/20">Required</span>
                                        </div>
                                        <div className="space-y-2">
                                            {customizingItem.variants.map((v) => {
                                                const isSelected = selectedVariantId === v.id;
                                                return (
                                                    <div
                                                        key={v.id}
                                                        onClick={() => setSelectedVariantId(v.id)}
                                                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${isSelected
                                                                ? 'bg-white/5 border-[#d5b263]/50 shadow-[0_0_20px_rgba(213,178,99,0.08)]'
                                                                : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected ? 'border-[#d5b263] bg-[#d5b263]' : 'border-white/30'
                                                                }`}>
                                                                {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                                                            </div>
                                                            <span className={`text-[14px] font-black transition-colors ${isSelected ? 'text-[#d5b263]' : 'text-white/80'}`}>
                                                                {v.variantName}
                                                            </span>
                                                        </div>
                                                        <span className={`text-sm font-black ${isSelected ? 'text-[#d5b263]' : 'text-white/40'}`}>
                                                            ₹{(v.price / 100).toFixed(0)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Extras Section */}
                                {customizingItem.extras && customizingItem.extras.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-black text-white text-sm">Add Extras</h4>
                                            <span className="text-[9px] font-black bg-white/8 text-white/50 px-2.5 py-1 rounded-full uppercase tracking-wider">Optional</span>
                                        </div>
                                        <div className="space-y-2">
                                            {customizingItem.extras.map((extra) => {
                                                const sel = selectedExtras.find(se => se.extraId === extra.id);
                                                const qty = sel?.quantity || 0;
                                                return (
                                                    <div key={extra.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${qty > 0 ? 'bg-white/5 border-[#d5b263]/30' : 'bg-white/3 border-white/8'}`}>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-black truncate ${qty > 0 ? 'text-[#d5b263]' : 'text-white/80'}`}>{extra.name}</p>
                                                            <p className="text-[10px] text-white/30 font-bold mt-0.5">+₹{(extra.price / 100).toFixed(0)} each</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 ml-3">
                                                            {qty > 0 ? (
                                                                <div className="flex items-center bg-white/10 rounded-xl overflow-hidden h-9">
                                                                    <button
                                                                        onClick={() => setSelectedExtras(prev => prev.map(se => se.extraId === extra.id ? { ...se, quantity: Math.max(0, se.quantity - 1) } : se).filter(se => se.quantity > 0))}
                                                                        className="w-9 h-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                                    >
                                                                        <Minus size={12} strokeWidth={3} />
                                                                    </button>
                                                                    <span className="w-8 text-center text-sm font-black text-white">{qty}</span>
                                                                    <button
                                                                        onClick={() => setSelectedExtras(prev => prev.map(se => se.extraId === extra.id ? { ...se, quantity: se.quantity + 1 } : se))}
                                                                        className="w-9 h-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                                    >
                                                                        <Plus size={12} strokeWidth={3} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setSelectedExtras(prev => [...prev, { extraId: extra.id, quantity: 1 }])}
                                                                    className="h-9 px-4 bg-white/10 hover:bg-white/15 text-white/60 hover:text-white rounded-xl text-xs font-black transition-all border border-white/8"
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
                                <div className="h-28" />
                            </div>

                            {/* Footer: Quantity + Add Button */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#0c0c0e]/95 backdrop-blur-sm border-t border-white/8 z-30">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-white/8 border border-white/10 rounded-2xl p-1 h-14">
                                        <button
                                            onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                                            className="w-11 h-full flex items-center justify-center text-white/40 hover:text-white active:scale-75 transition-all"
                                        >
                                            <Minus size={16} strokeWidth={3} />
                                        </button>
                                        <div className="w-10 flex flex-col items-center">
                                            <span className="font-black text-white text-base leading-none">{modalQuantity}</span>
                                            <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter mt-0.5">Qty</span>
                                        </div>
                                        <button
                                            onClick={() => setModalQuantity(modalQuantity + 1)}
                                            className="w-11 h-full flex items-center justify-center text-white/40 hover:text-white active:scale-75 transition-all"
                                        >
                                            <Plus size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleAddFromModal}
                                        className="flex-1 bg-gradient-to-r from-[#d5b263] to-[#bfa052] hover:from-[#e0bf70] hover:to-[#d5b263] text-black font-black rounded-2xl h-14 shadow-lg shadow-[#d5b263]/20 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0.5 group"
                                    >
                                        <span className="text-sm font-black">Add Item</span>
                                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest group-hover:opacity-90 transition-opacity">
                                            ₹{((
                                                (customizingItem.variants.find(v => v.id === selectedVariantId)?.price || 0) +
                                                selectedExtras.reduce((acc, se) => {
                                                    const extra = customizingItem.extras?.find(e => e.id === se.extraId);
                                                    return acc + (extra?.price || 0) * se.quantity;
                                                }, 0)
                                            ) / 100 * modalQuantity).toFixed(0)} Total
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
            </div>
        </div>
    );
}
