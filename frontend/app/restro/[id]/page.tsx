"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
    Star, MapPin, Phone, Clock, ChefHat,
    Award, Users, Share2, Heart, ArrowLeft,
    Navigation, Utensils, ArrowRight,
    Search, ThumbsUp, Percent, Tag,
    AlertCircle, Loader2,
    CheckCircle2, IndianRupee
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../../../lib/auth-context";
import toast from "react-hot-toast";

interface Props {
    params: { id: string } | Promise<{ id: string }>;
}

// --- Menu Types ---
interface MenuItem {
    id: string;
    name: string;
    description: string | null;
    basePrice: number;
    image: string | null;
    isVeg: boolean;
    isAvailable: boolean;
    categoryName: string;
}

interface MenuCategory {
    id: string;
    name: string;
    items: MenuItem[];
}

interface Offer {
    id: string;
    name: string;
    description: string | null;
    offerType: string;
    discountValue: number;
    applicableCategoryId: string | null;
    code: string;
    endDate: string;
}

type TabType = "overview" | "menu" | "reviews";

interface Restaurant {
    restaurantName: string;
    restaurantLogo: string | null;
    restaurantBanner: string | null;
    city: string;
    restaurantAddress: string;
    phoneNumber: string;
    rating: string;
    ratingCount: string;
    cuisine: string[];
    isOpen: boolean;
    description: string | null;
}

interface Review {
    id?: string;
    userName: string | null;
    rating: number;
    reviewText: string | null;
    createdAt: string;
}

export default function RestaurantPage({ params }: Props) {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [id, setId] = useState<string>("");

    // Tab State
    const [activeTab, setActiveTab] = useState<TabType>("overview");

    // Reviews State
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [hasMoreReviews, setHasMoreReviews] = useState(true);
    const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);

    const { isAuthenticated } = useAuth();

    // Favourites State
    const [isFavourite, setIsFavourite] = useState(false);
    const [favouriteLoading, setFavouriteLoading] = useState(false);

    // Menu Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [isVegOnly, setIsVegOnly] = useState(false);

    // Reviews Interactive State
    const [helpfulStates, setHelpfulStates] = useState<Record<string, boolean>>({});

    const handleHelpfulClick = (reviewId: string) => {
        setHelpfulStates(prev => {
            const isHelpful = !prev[reviewId];
            if (isHelpful) toast.success("Marked as helpful!");
            return { ...prev, [reviewId]: isHelpful };
        });
    };

    const handleShareClick = (reviewId: string) => {
        const url = `${window.location.origin}/restro/${id}?review=${reviewId}`;
        navigator.clipboard.writeText(url)
            .then(() => toast.success("Review link copied to clipboard!"))
            .catch(() => toast.error("Failed to copy link"));
    };

    // --- Scroll Progress for Sticky Effects ---
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 200], [0, 1]);
    const headerPointerEvents = useTransform(scrollY, [0, 50], ["none", "auto"]);

    // --- Init ID ---
    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await (params instanceof Promise ? params : Promise.resolve(params));
            setId(resolved?.id || "");
        };
        resolveParams();
    }, [params]);

    // --- Main Data Fetch ---
    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Details & Menu & Offers in parallel
                const [restRes, menuRes, offersRes] = await Promise.all([
                    apiClient.getRestaurant(id) as Promise<{ restaurant: Restaurant }>,
                    apiClient.getPublicMenu(id) as Promise<{ success: boolean; categories: MenuCategory[] }>,
                    apiClient.getPublicOffers(id).catch(() => ({ success: false, offers: [] })) as Promise<{ success: boolean; offers: Offer[] }>
                ]);

                if (restRes.restaurant) {
                    setRestaurant(restRes.restaurant);
                } else {
                    throw new Error("Restaurant details not found");
                }

                if (menuRes.categories) {
                    setMenu(menuRes.categories || []);
                }

                if (offersRes.offers) {
                    setOffers(offersRes.offers || []);
                }

                // Fetch Reviews (First page)
                setReviewsLoading(true);
                const reviewRes = await apiClient.getRestaurantReviews(id, 1, 10) as { success: boolean; reviews: Review[] };
                if (reviewRes.success) {
                    const fetchedReviews = reviewRes.reviews || [];
                    setReviews(fetchedReviews);
                    setHasMoreReviews(fetchedReviews.length === 10);
                }
                setReviewsLoading(false);

                // Check if it's a favourite
                try {
                    const favRes = await apiClient.getFavourites();
                    const isFav = favRes.favourites.some((f: any) => f.id === id);
                    setIsFavourite(isFav);
                } catch (favErr) {
                    console.error("Error checking favourite status:", favErr);
                }

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Error loading restaurant info";
                setError(message);
                toast.error(message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // --- Load More Reviews ---
    const loadMoreReviews = async () => {
        if (loadingMoreReviews || !hasMoreReviews) return;
        setLoadingMoreReviews(true);
        try {
            const nextPage = reviewsPage + 1;
            const reviewRes = await apiClient.getRestaurantReviews(id, nextPage, 10) as { success: boolean; reviews: Review[] };
            if (reviewRes.success) {
                const newReviews = reviewRes.reviews || [];
                setReviews(prev => [...prev, ...newReviews]);
                setReviewsPage(nextPage);
                setHasMoreReviews(newReviews.length === 10);
            }
        } catch (error) {
            console.error('Failed to load more reviews:', error);
        } finally {
            setLoadingMoreReviews(false);
        }
    };

    // --- Filtering & Formatting ---
    const filteredMenu = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return menu.map(category => ({
            ...category,
            items: category.items.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query);
                const matchesVeg = !isVegOnly || item.isVeg;
                return matchesSearch && matchesVeg;
            })
        })).filter(category => category.items.length > 0);
    }, [menu, searchQuery, isVegOnly]);

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating) ? 'fill-[#FFAB40] text-[#FFAB40]' : 'fill-gray-200 text-gray-200'}`} />
        ));
    };

    const toggleFavourite = async () => {
        if (!isAuthenticated) {
            toast.error("Please sign in to add favourites");
            return;
        }
        if (favouriteLoading) return;
        setFavouriteLoading(true);
        try {
            if (isFavourite) {
                await apiClient.removeFavourite(id);
                setIsFavourite(false);
                toast.success("Removed from favourites");
            } else {
                await apiClient.addFavourite(id);
                setIsFavourite(true);
                toast.success("Added to favourites!");
            }
        } catch (err) {
            console.error("Error toggling favourite:", err);
            toast.error("Failed to update favourites");
        } finally {
            setFavouriteLoading(false);
        }
    };

    if (loading) return <SkeletonLoader />;
    if (error || !restaurant) return <ErrorState message={error} />;

    return (
        <main className="min-h-screen bg-white font-sans text-slate-800">

            {/* 1. Sticky Header Nav (Appears on Scroll) */}
            <motion.nav
                style={{ opacity: headerOpacity, pointerEvents: headerPointerEvents as any }}
                className="fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md z-[60] border-b border-gray-100 px-4 flex items-center shadow-sm"
            >
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 shadow-sm relative">
                            <img src={restaurant.restaurantLogo || "/placeholder-logo.jpg"} className="w-full h-full object-cover" alt={restaurant.restaurantName} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 leading-none mb-1">{restaurant.restaurantName}</h2>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                                <div className="flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-green-600 text-green-600" />
                                    <span className="font-bold text-gray-900">{restaurant.rating || "4.2"}</span>
                                </div>
                                <span>•</span>
                                <span>{restaurant.city}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all">
                            <Share2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <Link href={`/restro/${id}/reserve`} className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all">
                            Book Table
                        </Link>
                    </div>
                </div>
            </motion.nav>

            {/* 2. Immersive Hero Wrapper */}
            <div className="relative w-full">
                {/* Floating Back Button */}
                <Link 
                    href="/explore" 
                    className="absolute top-8 left-8 z-30 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-all shadow-xl active:scale-95 group"
                >
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </Link>

                <div className="h-[400px] w-full relative overflow-hidden">
                    <img
                        src={restaurant.restaurantBanner || "https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2070&auto=format&fit=crop"}
                        className="w-full h-full object-cover brightness-[0.85]"
                        alt="Hero Banner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                <div className="max-w-7xl mx-auto px-4 relative -mt-32 z-10 pb-12">
                    <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100">
                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-32 h-32 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl shrink-0 -mt-16 bg-white relative"
                            >
                                <img src={restaurant.restaurantLogo || "/placeholder-logo.jpg"} className="w-full h-full object-cover" alt="Logo" />
                            </motion.div>

                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {restaurant.cuisine?.slice(0, 3).map((c: string) => (
                                        <span key={c} className="bg-gray-50 text-gray-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{c}</span>
                                    ))}
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 ${restaurant.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${restaurant.isOpen ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                                        {restaurant.isOpen ? 'Open Now' : 'Closed'}
                                    </span>
                                </div>
                                <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">{restaurant.restaurantName}</h1>
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm font-medium text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-red-500" />
                                        <span>{restaurant.city}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-red-500" />
                                        <span>9 AM — 11 PM</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4 text-red-500" />
                                        <span>₹1,500 for two (approx.)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0 flex gap-4 md:flex-col items-center">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg font-black shadow-lg shadow-green-100 mb-1">
                                        <span>{restaurant.rating || "4.2"}</span>
                                        <Star className="w-4 h-4 fill-white" />
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">
                                        {restaurant.ratingCount || "500+"} reviews
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Sticky Tab Bar */}
            <div className="sticky top-0 md:top-16 bg-white border-b border-gray-100 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
                        {(["overview", "menu", "reviews"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => {
                                    setActiveTab(tab);
                                    if (tab === 'reviews') {
                                        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className={`py-5 text-sm font-bold capitalize relative transition-all whitespace-nowrap ${activeTab === tab ? "text-red-600" : "text-gray-500 hover:text-gray-900"
                                    }`}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        className="absolute bottom-0 inset-x-0 h-1 bg-red-600 rounded-t-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Main Distribution Layout */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* CONTENT AREA */}
                    <div className="lg:col-span-8 space-y-12">

                        <AnimatePresence mode="wait">
                            {activeTab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-10"
                                >
                                    {/* About Section */}
                                    <section>
                                        <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">About this place</h2>
                                        <p className="text-gray-600 leading-relaxed text-base font-medium">
                                            {restaurant.description || "Experience culinary excellence in a warm, inviting atmosphere. We pride ourselves on using locally sourced ingredients to create unforgettable dining moments."}
                                        </p>
                                    </section>

                                    {/* Bento Highlights */}
                                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Link href={`/restro/${id}/reserve`} className="group p-6 bg-orange-50/30 rounded-3xl border border-orange-100 hover:bg-orange-50 transition-all flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">Book a Table</h3>
                                                    <p className="text-xs text-orange-700/70 font-bold">Secure your spot instantly</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                        <Link href={`/restro/${id}/3d-menu`} className="group p-6 bg-purple-50/30 rounded-3xl border border-purple-100 hover:bg-purple-50 transition-all flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                                                    <ChefHat className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">3D Experience</h3>
                                                    <p className="text-xs text-purple-700/70 font-bold">Interactive dish previews</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </section>

                                    <section className="p-8 bg-gray-50 border border-gray-100 rounded-[2rem]">
                                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                            <Award className="w-5 h-5 text-red-600" />
                                            Restaurant Features
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                            {["Valet Parking", "Indoor Seating", "Outdoor Seating", "Live Music", "Free Wifi", "Takeaway"].map(feature => (
                                                <div key={feature} className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <span className="text-sm font-bold text-gray-600">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </motion.div>
                            )}

                            {activeTab === "menu" && (
                                <motion.div
                                    key="menu"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-8"
                                >
                                    {/* Menu Controls */}
                                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-3xl border border-gray-100 sticky top-[120px] z-40">
                                        <div className="relative flex-1 w-full">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Search for dishes..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setIsVegOnly(!isVegOnly)}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl border text-xs font-black transition-all ${isVegOnly ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-500'
                                                }`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border-2 ${isVegOnly ? 'bg-emerald-500 border-white' : 'border-gray-200'} shrink-0`} />
                                            VEG ONLY
                                        </button>
                                    </div>

                                    {/* Available Offers Carousel */}
                                    {offers.length > 0 && (
                                        <div className="py-2">
                                            <div className="flex items-center justify-between mb-4 px-2">
                                                <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                    <Percent className="w-5 h-5 text-red-600" />
                                                    Available Offers
                                                </h3>
                                            </div>
                                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                                {offers.map(offer => (
                                                    <div
                                                        key={offer.id}
                                                        className="flex-shrink-0 w-[240px] sm:w-[280px] bg-white rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] relative overflow-hidden group hover:shadow-md hover:border-red-100 transition-all flex flex-col justify-between"
                                                    >
                                                        {/* Left Accent Line */}
                                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 to-orange-500 rounded-l-2xl"></div>

                                                        <div className="p-3.5 pl-5 relative z-10 flex-grow">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-600">
                                                                    <Percent className="w-3.5 h-3.5 stroke-[3]" />
                                                                </div>
                                                                <h4 className="font-extrabold text-gray-900 text-[15px] leading-tight flex-1 line-clamp-1">
                                                                    {offer.offerType === 'percentage' && `${offer.discountValue}% OFF`}
                                                                    {offer.offerType === 'flat_discount' && `₹${offer.discountValue} OFF`}
                                                                    {offer.offerType === 'buy_1_get_1' && `Buy 1 Get 1`}
                                                                    {offer.offerType === 'category_discount' && `${offer.discountValue}% OFF CATEGORY`}
                                                                </h4>
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 font-bold ml-8 line-clamp-1 mt-0.5 uppercase tracking-wide">
                                                                {offer.name}
                                                            </p>
                                                            <p className="text-[11px] text-gray-400 font-medium ml-8 line-clamp-1 mt-0.5">
                                                                {offer.description || 'Applicable on select items'}
                                                            </p>
                                                        </div>

                                                        {/* Dotted Separator */}
                                                        <div className="relative h-[2px] w-full mt-auto">
                                                            <div className="absolute -left-1.5 -top-[5px] w-3 h-3 bg-gray-50 rounded-full border border-gray-200 z-20"></div>
                                                            <div className="absolute -right-1.5 -top-[5px] w-3 h-3 bg-gray-50 rounded-full border border-gray-200 z-20"></div>
                                                            <div className="w-full border-t-2 border-dashed border-gray-200 relative z-10 mx-auto max-w-[90%]"></div>
                                                        </div>

                                                        <div className="bg-gray-50/50 p-3 flex items-center justify-between">
                                                            <div className="font-mono text-[11px] font-bold text-gray-800 tracking-wider bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
                                                                {offer.code}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(offer.code);
                                                                    toast.success("Code copied!");
                                                                }}
                                                                className="text-[11px] font-black text-red-600 hover:text-red-700 active:scale-95 transition-transform"
                                                            >
                                                                COPY
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Integrated Menu Categories */}
                                    <div className="space-y-16">
                                        {filteredMenu.map((category) => (
                                            <section key={category.id} className="scroll-mt-48">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{category.name}</h2>
                                                    <div className="h-0.5 flex-1 bg-gray-100 rounded-full" />
                                                    <span className="text-xs font-bold text-gray-400">{category.items.length} dishes</span>
                                                </div>

                                                <div className="grid grid-cols-1 gap-12">
                                                    {category.items.map((item) => (
                                                        <div key={item.id} className="group flex gap-8 items-start justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${item.isVeg ? 'border-emerald-600' : 'border-red-600'}`}>
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                                                                    </div>
                                                                    {item.isVeg && <span className="text-[10px] font-black text-emerald-600">BESTSELLER</span>}
                                                                </div>
                                                                <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-red-600 transition-colors uppercase tracking-tight">{item.name}</h3>
                                                                <div className="text-lg font-black text-gray-900 mb-3 flex items-center gap-0.5">
                                                                    <IndianRupee className="w-4 h-4" />
                                                                    {item.basePrice}
                                                                </div>
                                                                <p className="text-sm font-medium text-gray-400 leading-relaxed max-w-lg line-clamp-2 italic">{item.description || "Freshly prepared with authentic ingredients and love."}</p>
                                                            </div>
                                                            <div className="relative w-36 h-36 rounded-3xl overflow-hidden shrink-0 shadow-lg group-hover:shadow-2xl transition-all duration-500 bg-gray-100">
                                                                {item.image ? (
                                                                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                        <Utensils className="w-8 h-8" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-x-4 bottom-2 h-10">
                                                                    <button className="w-full h-full bg-white text-emerald-600 border border-emerald-100 rounded-xl font-black text-xs shadow-xl active:scale-95 hover:bg-emerald-50 transition-all uppercase tracking-widest flex items-center justify-center gap-1">
                                                                        ADD <span className="text-lg leading-none">+</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "reviews" && (
                                <div id="reviews" className="space-y-8 animate-in scroll-mt-32">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Diner Reviews</h2>
                                        <button className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-6 py-2 rounded-xl transition-all">Write a Review</button>
                                    </div>

                                    <div className="space-y-8">
                                        {reviewsLoading ? (
                                            <div className="animate-pulse space-y-4">
                                                {[1, 2].map(i => <div key={i} className="h-40 bg-gray-50 rounded-3xl" />)}
                                            </div>
                                        ) : reviews.length === 0 ? (
                                            <div className="text-center py-16 bg-gray-50 rounded-[2rem] border border-gray-100">
                                                <p className="text-gray-400 font-bold mb-4 uppercase tracking-widest text-xs">No reviews yet for this restaurant</p>
                                                <Link href={`/restro/${id}/reserve`} className="text-red-600 font-black text-[10px] uppercase underline tracking-tighter decoration-2 underline-offset-4">Be the first to review</Link>
                                            </div>
                                        ) : (
                                            reviews.map((r: Review, idx: number) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-8 bg-gray-50/50 hover:bg-white border hover:border-red-100 hover:shadow-2xl hover:shadow-red-50 transition-all duration-500 rounded-[2rem] group"
                                                >
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-100 group-hover:rotate-6 transition-transform">
                                                                {r.userName?.charAt(0) || "G"}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-gray-900 mb-0.5 tracking-tight">{r.userName || "Verified Guest"}</h4>
                                                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                                                                    <span>Verified Diner</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-600 text-white rounded-lg font-black shadow-lg shadow-emerald-50 shrink-0">
                                                            <span className="text-sm">{r.rating}</span>
                                                            <Star className="w-3.5 h-3.5 fill-white" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 mb-4">
                                                        {renderStars(r.rating)}
                                                    </div>
                                                    <p className="text-gray-600 leading-relaxed font-medium mb-6 italic">&quot;{r.reviewText || "Authentic flavors and a wonderful atmosphere. Definitely a must-visit for food lovers!"}&quot;</p>
                                                    <div className="flex items-center gap-6 pt-6 border-t border-gray-100">
                                                        <button
                                                            onClick={() => handleHelpfulClick(r.id || String(idx))}
                                                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${helpfulStates[r.id || String(idx)] ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                                                        >
                                                            <ThumbsUp className={`w-4 h-4 ${helpfulStates[r.id || String(idx)] ? 'fill-current' : ''}`} /> Helpful
                                                        </button>
                                                        <button
                                                            onClick={() => handleShareClick(r.id || String(idx))}
                                                            className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-red-500 tracking-widest uppercase transition-colors"
                                                        >
                                                            <Share2 className="w-4 h-4" /> Share
                                                        </button>
                                                        <span className="ml-auto text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
                                                            {new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                        {hasMoreReviews && activeTab === 'reviews' && (
                                            <button
                                                onClick={loadMoreReviews}
                                                className="w-full py-4 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 border border-gray-100 hover:border-red-100 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                            >
                                                {loadingMoreReviews ? "Loading More..." : "Load More Reviews"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* SIDEBAR */}
                    <aside className="lg:col-span-4 space-y-8">
                        <div className="sticky top-16 space-y-8">
                            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-100">
                                <div className="h-48 bg-gray-100 relative group">
                                    <iframe
                                        title="map"
                                        width="100%" height="100%" frameBorder="0"
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(restaurant.restaurantName + " " + restaurant.city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                        className="map-frame group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.restaurantName + " " + restaurant.city)}`}
                                        target="_blank"
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-xl text-[10px] font-black shadow-2xl flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-gray-900"
                                    >
                                        <Navigation className="w-3 h-3 text-red-600 fill-red-600" /> DIRECTIONS
                                    </a>
                                </div>
                                <div className="p-8 space-y-8">
                                    <div className="flex gap-4">
                                        <Clock className="w-5 h-5 text-red-500 shrink-0" />
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Hours</h4>
                                            <p className="text-sm font-bold text-gray-900 leading-none">09:00 AM - 11:00 PM</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <MapPin className="w-5 h-5 text-red-500 shrink-0" />
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Address</h4>
                                            <p className="text-sm font-bold text-gray-900 leading-relaxed">{restaurant.restaurantAddress}, {restaurant.city}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <Phone className="w-5 h-5 text-red-500 shrink-0" />
                                        <div>
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Details</h4>
                                            <p className="text-sm font-bold text-gray-900">{restaurant.phoneNumber}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <section className="bg-red-50/50 border border-red-100 rounded-[2rem] p-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <h4 className="font-black text-red-900 uppercase tracking-tight">Need a customized event?</h4>
                                </div>
                                <p className="text-xs font-bold text-red-700/70 mb-6 leading-relaxed">Book our special lounge for birthdays, corporate events, or private dinners with custom catering options.</p>
                                <button className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all">Submit Inquiry</button>
                            </section>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}

// Minimal Components
function SkeletonLoader() {
    return (
        <div className="animate-pulse min-h-screen bg-gray-50">
            <div className="h-[400px] bg-gray-200 w-full" />
            <div className="max-w-7xl mx-auto px-4 relative -mt-32">
                <div className="bg-white rounded-[2rem] p-8 h-48 shadow-xl" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="h-40 bg-gray-100 rounded-3xl" />
                        <div className="h-80 bg-gray-100 rounded-3xl" />
                    </div>
                    <div className="lg:col-span-4 h-96 bg-gray-100 rounded-3xl" />
                </div>
            </div>
        </div>
    );
}

function ErrorState({ message }: { message: string | null }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h2>
                <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">{message || "We couldn't load the restaurant details. Please try again later."}</p>
                <Link href="/explore" className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200">
                    Back to Explore
                </Link>
            </div>
        </div>
    );
}