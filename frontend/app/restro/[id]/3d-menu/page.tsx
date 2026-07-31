"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, Filter, ChefHat, Plus, Minus, 
  ShoppingCart, RotateCw, X, ChevronLeft, 
  LayoutGrid, Box 
} from "lucide-react";
import { useParams } from "next/navigation";

// --- Interfaces ---
interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  image?: string; // Added image support
  isVeg?: boolean;
  variants: MenuItemVariant[];
}

interface MenuItemVariant {
  id: string;
  name: string;
  price: number; // in paise
}

// --- Components ---

const VegIndicator = ({ isVeg }: { isVeg?: boolean }) => (
  <div className={`w-4 h-4 border flex items-center justify-center rounded-sm ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
    <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
  </div>
);

export default function Restaurant3DMenuPage() {
  const params = useParams();
  const restaurantId = params.id as string;
  
  // State
  const [menuData, setMenuData] = useState<{ categories: MenuCategory[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');
  
  // Cart: Key = variantId, Value = qty
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  
  // Track which cards are flipped (for 3D mode)
  const [flippedCards, setFlippedCards] = useState<{ [itemId: string]: boolean }>({});

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";

  // --- Fetch ---
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/menus/${restaurantId}/menu`);
        if (res.ok) {
          const data = await res.json();
          setMenuData(data);
          if (data.categories?.length > 0) setActiveCategory(data.categories[0].id);
        }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
    };
    if(restaurantId) fetchMenu();
  }, [restaurantId, BACKEND_URL]);

  // --- Helpers ---
  const handleCart = (variantId: string, delta: number) => {
    setCart(prev => {
      const next = (prev[variantId] || 0) + delta;
      const newCart = { ...prev };
      if (next <= 0) delete newCart[variantId];
      else newCart[variantId] = next;
      return newCart;
    });
  };

  const toggleFlip = (itemId: string) => {
    setFlippedCards(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Filter Logic
  const filteredCategories = useMemo(() => {
    if (!menuData) return [];
    if (!searchQuery) return menuData.categories;
    return menuData.categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(cat => cat.items.length > 0);
  }, [menuData, searchQuery]);

  // Cart Totals
  const { totalQty, totalPrice } = useMemo(() => {
    let qty = 0, price = 0;
    const priceMap: Record<string, number> = {};
    
    // Build lookup table
    menuData?.categories?.forEach(c => c.items.forEach(i => i.variants.forEach(v => priceMap[v.id] = v.price)));
    
    Object.entries(cart).forEach(([vid, q]) => {
      qty += q;
      price += (priceMap[vid] || 0) * q;
    });
    return { totalQty: qty, totalPrice: price };
  }, [cart, menuData]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50"><div className="loader" /></div>;

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-800 font-sans pb-32">
      
      {/* 1. Header & Controls */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/restro/${restaurantId}`} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Menu</h1>
            
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('3d')}
                className={`p-2 rounded-md transition-all ${viewMode === '3d' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                <Box size={20} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
              >
                <LayoutGrid size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search dishes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 border-none rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Category Tabs */}
          <nav className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {filteredCategories?.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat.id 
                    ? 'bg-gray-900 text-white shadow-lg scale-105' 
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 2. Menu Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {filteredCategories?.map(category => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-40">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pl-2 border-l-4 border-indigo-500">
              {category.name}
            </h2>

            <div className={`grid gap-6 ${viewMode === '3d' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {category.items.map(item => (
                
                // --- CARD COMPONENT ---
                <div 
                  key={item.id} 
                  className={`menu-item-container ${viewMode === '3d' ? 'h-[400px] perspective-1000' : 'h-auto bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4'}`}
                >
                  {viewMode === '3d' ? (
                    // 3D FLIP CARD
                    <div className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${flippedCards[item.id] ? 'rotate-y-180' : ''}`}>
                      
                      {/* FRONT FACE */}
                      <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
                        {/* Image Area */}
                        <div className="relative h-[55%] bg-gray-100 cursor-pointer group" onClick={() => toggleFlip(item.id)}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ChefHat size={48} />
                            </div>
                          )}
                          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            ₹{(Math.min(...item.variants.map(v => v.price)) / 100).toFixed(0)}
                          </div>
                          <div className="absolute bottom-4 right-4 bg-black/60 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <RotateCw size={16} />
                          </div>
                        </div>

                        {/* Info Area */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
                            <VegIndicator isVeg={item.isVeg} />
                          </div>
                          <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">{item.description || "A delicious culinary delight prepared with fresh ingredients."}</p>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFlip(item.id); }}
                            className="w-full py-3 rounded-xl bg-gray-50 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                          >
                            Select Options <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* BACK FACE (Variants) */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gray-900 text-white rounded-3xl shadow-xl overflow-hidden flex flex-col p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                          <h3 className="font-bold text-lg truncate pr-4">{item.name}</h3>
                          <button onClick={() => toggleFlip(item.id)} className="p-1 hover:bg-gray-700 rounded-full">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                          {item.variants.map(variant => {
                            const qty = cart[variant.id] || 0;
                            return (
                              <div key={variant.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-xl">
                                <div>
                                  <p className="font-medium text-sm">{variant.name}</p>
                                  <p className="text-indigo-400 font-bold text-sm">₹{(variant.price / 100).toFixed(0)}</p>
                                </div>
                                
                                {qty === 0 ? (
                                  <button 
                                    onClick={() => handleCart(variant.id, 1)}
                                    className="bg-white text-gray-900 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors"
                                  >
                                    ADD
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-3 bg-gray-700 rounded-lg p-1">
                                    <button onClick={() => handleCart(variant.id, -1)} className="p-1 hover:text-white text-gray-300"><Minus size={14}/></button>
                                    <span className="font-bold text-sm w-4 text-center">{qty}</span>
                                    <button onClick={() => handleCart(variant.id, 1)} className="p-1 hover:text-white text-gray-300"><Plus size={14}/></button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  ) : (
                    // LIST VIEW (Simple)
                    <>
                      <div className="w-24 h-24 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                         {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ChefHat className="m-auto text-gray-300"/>}
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between">
                           <h3 className="font-bold text-gray-900">{item.name}</h3>
                           <VegIndicator isVeg={item.isVeg} />
                        </div>
                        <p className="text-gray-500 text-xs line-clamp-2 mt-1 mb-3">{item.description}</p>
                        <div className="mt-auto flex justify-between items-end">
                           <span className="font-bold text-sm">₹{(item.variants[0].price / 100).toFixed(0)}</span>
                           
                           {/* Simple variant selector for list view - just adds first variant for demo */}
                           {cart[item.variants[0].id] ? (
                              <div className="flex items-center gap-3 bg-indigo-50 rounded-lg px-2 py-1">
                                <button onClick={() => handleCart(item.variants[0].id, -1)}><Minus size={14} className="text-indigo-600"/></button>
                                <span className="font-bold text-sm">{cart[item.variants[0].id]}</span>
                                <button onClick={() => handleCart(item.variants[0].id, 1)}><Plus size={14} className="text-indigo-600"/></button>
                              </div>
                           ) : (
                             <button 
                               onClick={() => handleCart(item.variants[0].id, 1)}
                               className="px-6 py-2 bg-white border border-gray-200 text-green-600 font-bold text-xs rounded-lg shadow-sm hover:shadow-md uppercase"
                             >
                               Add
                             </button>
                           )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* 3. Floating Cart Summary */}
      {totalQty > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
          <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{totalQty} Items added</span>
              <span className="text-xl font-bold">₹ {(totalPrice / 100).toFixed(0)} <span className="text-sm font-normal text-gray-400">plus taxes</span></span>
            </div>
            <button className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-50 transition-colors">
              View Cart <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        .loader {
          width: 48px; height: 48px;
          border: 5px solid #E5E7EB;
          border-bottom-color: #4F46E5;
          border-radius: 50%;
          display: inline-block;
          animation: rotation 1s linear infinite;
        }
        @keyframes rotation { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
        
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}