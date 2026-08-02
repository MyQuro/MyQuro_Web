"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { Star, MapPin, Users, Clock, Filter, Search, X, ChefHat, ArrowUpRight } from "lucide-react";

interface Restaurant {
  id: string;
  restaurantName: string;
  restaurantType: string;
  restaurantLogo: string;
  restaurantBanner: string;
  seatingCapacity: number;
  city: string;
  state: string;
  rating: number | string;
  ratingCount: number;
  restaurantStatus: string;
  isOpen: boolean;
  description?: string;
  cuisine?: string[];
  phoneNumber?: string;
  priceRange?: string;
  distance?: number;
  openingHours?: string;
}

export default function ReservationPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState<string>("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";
        const res = await fetch(`${BACKEND_URL}/api/restaurants`);
        if (!res.ok) throw new Error("Failed to fetch restaurants");
        const data = await res.json();
        setRestaurants(data.restaurants || []);
      } catch (error) {
        console.error("Failed to load restaurants:", error);
        setError("Failed to load restaurants");
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const filteredAndSortedRestaurants = restaurants
    .filter((restaurant) => {
      const matchesSearch = restaurant.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            restaurant.cuisine?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            restaurant.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCuisine = !selectedCuisine || restaurant.cuisine?.includes(selectedCuisine);
      const matchesPriceRange = !selectedPriceRange || restaurant.priceRange === selectedPriceRange;
      return matchesSearch && matchesCuisine && matchesPriceRange;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating": return Number(b.rating) - Number(a.rating);
        case "distance": return (a.distance || 0) - (b.distance || 0);
        case "name": return a.restaurantName.localeCompare(b.restaurantName);
        default: return 0;
      }
    });

  const uniqueCuisines = Array.from(new Set(restaurants.flatMap(r => r.cuisine || [])));
  const uniquePriceRanges = Array.from(new Set(restaurants.map(r => r.priceRange).filter(Boolean)));

  // Helper to trigger diagrams
  const showReservationProcess = () => {
      // 
  }

  return (
    <main className="reservation-page pt-22">
      <div className={`top-20 sticky-search-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
            <div className="search-bar-wrapper">
                <div className="search-input-group">
                    <Search className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search for restaurants..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
                <button 
                    className={`filter-btn ${showFilters ? 'active' : ''}`} 
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <Filter className="w-4 h-4" />
                    <span className="hide-mobile">Filters</span>
                </button>
            </div>
            
            {showFilters && (
                <div className="filters-dropdown">
                    <div className="filter-row">
                        <select value={selectedCuisine} onChange={(e) => setSelectedCuisine(e.target.value)}>
                            <option value="">Cuisine (All)</option>
                            {uniqueCuisines.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={selectedPriceRange} onChange={(e) => setSelectedPriceRange(e.target.value)}>
                            <option value="">Price (All)</option>
                            {uniquePriceRanges.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="rating">Top Rated</option>
                            <option value="distance">Nearest</option>
                            <option value="name">Name (A-Z)</option>
                        </select>
                    </div>
                    {(selectedCuisine || selectedPriceRange) && (
                        <button 
                            className="clear-btn" 
                            onClick={() => { setSelectedCuisine(""); setSelectedPriceRange(""); }}
                        >
                            Clear Filters <X size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      <div className="container content-area">
        <section className="intro-section">
            <h1 className="title">Book a Table</h1>
            <p className="subtitle">Discover dining experiences near you.</p>
        </section>

        <section className="restaurants-section">
          {loading ? (
            <div className="grid-layout">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card skeleton-card">
                  <div className="skeleton-img"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-line w-3/4"></div>
                    <div className="skeleton-line w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedRestaurants.length === 0 ? (
            <div className="empty-state">
              <div className="icon-box"><Search size={32} /></div>
              <h3>No restaurants found</h3>
              <p>Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="grid-layout">
              {filteredAndSortedRestaurants.map((restaurant) => (
                <Link href={`/restro/${restaurant.id}/reserve`} key={restaurant.id} className="card-link">
                    <div className="card">
                        <div className="card-image-container">
                            <img
                                src={restaurant.restaurantBanner || restaurant.restaurantLogo || "/placeholder-restaurant.jpg"}
                                alt={restaurant.restaurantName}
                                className="card-img"
                                loading="lazy"
                            />
                            <div className="card-badges">
                                {restaurant.isOpen ? (
                                    <span className="badge open">Open Now</span>
                                ) : (
                                    <span className="badge closed">Closed</span>
                                )}
                                {restaurant.distance && (
                                    <span className="badge distance">{restaurant.distance}km</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="card-details">
                            <div className="card-header">
                                <h3 className="rest-name">{restaurant.restaurantName}</h3>
                                <div className="rating-pill">
                                    <span>{Number(restaurant.rating).toFixed(1)}</span>
                                    <Star size={10} fill="currentColor" />
                                </div>
                            </div>
                            
                            <div className="card-meta">
                                <span className="meta-item"><MapPin size={14} /> {restaurant.city}</span>
                                <span className="dot">•</span>
                                <span className="meta-item">{restaurant.cuisine?.[0] || 'Multi-cuisine'}</span>
                                <span className="dot">•</span>
                                <span className="meta-item">{restaurant.priceRange || '$$'}</span>
                            </div>

                            <div className="card-footer">
                                <div className="book-btn">
                                    Book Table <ArrowUpRight size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        /* --- RESET & VARIABLES --- */
        .reservation-page {
            min-height: 100vh;
            background-color: #050506;
            background-image: radial-gradient(circle at top, rgba(213, 178, 99, 0.03) 0%, transparent 70%);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #f4f4f5;
            padding-bottom: 80px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* --- STICKY SEARCH HEADER --- */
        .sticky-search-header {
            position: sticky;
            top: 64px;
            z-index: 40;
            background: rgba(5, 5, 6, 0.8);
            backdrop-filter: blur(12px);
            padding: 20px 0;
            transition: all 0.3s ease;
            border-bottom: 1px solid transparent;
        }

        .sticky-search-header.scrolled {
            background: rgba(5, 5, 6, 0.95);
            box-shadow: 0 4px 30px rgba(0,0,0,0.5);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding: 12px 0;
        }

        .search-bar-wrapper {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .search-input-group {
            flex: 1;
            position: relative;
            background: rgba(12, 12, 14, 0.8);
            border-radius: 100px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s;
        }

        .search-input-group:focus-within {
            border-color: #d5b263;
            box-shadow: 0 0 15px rgba(213, 178, 99, 0.15);
        }

        .search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: #71717a;
            width: 18px;
            height: 18px;
        }

        .search-input {
            width: 100%;
            padding: 14px 16px 14px 44px;
            border: none;
            background: transparent;
            font-size: 15px;
            color: white;
            border-radius: 100px;
            outline: none;
        }
        .search-input::placeholder {
            color: #52525b;
        }

        .filter-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 20px;
            height: 48px;
            border-radius: 100px;
            background: rgba(12, 12, 14, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #a1a1aa;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .filter-btn:hover { background: rgba(255, 255, 255, 0.05); color: white; }
        .filter-btn.active { background: #d5b263; color: black; border-color: #d5b263; }

        /* --- FILTERS DROPDOWN --- */
        .filters-dropdown {
            margin-top: 12px;
            background: #0c0c0e;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            animation: slideDown 0.2s ease-out;
        }

        .filter-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .filters-dropdown select {
            padding: 10px 14px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: #050506;
            color: #d1d5db;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            outline: none;
        }

        .filters-dropdown select:hover { border-color: rgba(213, 178, 99, 0.3); }

        .clear-btn {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: #f43f5e;
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 600;
        }

        /* --- CONTENT --- */
        .content-area { padding-top: 20px; }

        .intro-section { margin-bottom: 32px; }
        .title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; color: white; }
        .subtitle { color: #a1a1aa; font-size: 15px; }

        /* --- GRID --- */
        .grid-layout {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
        }

        .card-link { text-decoration: none; color: inherit; display: block; }

        .card {
            background: #0c0c0e;
            border-radius: 20px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .card:hover {
            transform: translateY(-4px);
            border-color: rgba(213, 178, 99, 0.25);
            box-shadow: 0 12px 30px rgba(213, 178, 99, 0.05);
        }

        .card-image-container {
            position: relative;
            height: 180px;
            width: 100%;
            background: #18181b;
        }

        .card-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .card-badges {
            position: absolute;
            top: 12px;
            left: 12px;
            right: 12px;
            display: flex;
            justify-content: space-between;
        }

        .badge {
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 100px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            backdrop-filter: blur(8px);
        }

        .badge.open { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge.closed { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge.distance { background: rgba(12, 12, 14, 0.8); color: #d5b263; border: 1px solid rgba(213, 178, 99, 0.25); }

        .card-details {
            padding: 16px;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .rest-name {
            font-size: 17px;
            font-weight: 700;
            line-height: 1.3;
            color: white;
            margin-right: 10px;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .rating-pill {
            display: flex;
            align-items: center;
            gap: 3px;
            background: #d5b263;
            color: black;
            font-size: 11px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
        }

        .card-meta {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            color: #a1a1aa;
            font-size: 13px;
            margin-bottom: 16px;
        }

        .meta-item { display: flex; align-items: center; gap: 4px; }
        .dot { color: #3f3f46; }

        .card-footer { margin-top: auto; }

        .book-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 12px;
            background: #18181b;
            color: #d5b263;
            border: 1px solid rgba(213, 178, 99, 0.15);
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            transition: all 0.2s;
        }

        .card:hover .book-btn {
            background: #d5b263;
            color: black;
            border-color: #d5b263;
        }

        /* --- SKELETON --- */
        .skeleton-card { height: 300px; border: none; background: #0c0c0e; }
        .skeleton-img { width: 100%; height: 180px; background: #18181b; }
        .skeleton-content { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .skeleton-line { height: 16px; background: #18181b; border-radius: 4px; }

        /* --- EMPTY STATE --- */
        .empty-state {
            text-align: center;
            padding: 60px 0;
            color: #a1a1aa;
        }
        .icon-box { 
            width: 64px; height: 64px; background: #0c0c0e; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
            color: #d5b263;
            border: 1px solid rgba(213, 178, 99, 0.15);
        }

        /* --- ANIMATIONS --- */
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* --- MOBILE TWEAKS --- */
        @media (max-width: 768px) {
            .container { padding: 0 16px; }
            .grid-layout { grid-template-columns: 1fr; gap: 16px; }
            .card { border-radius: 16px; flex-direction: row; height: 120px; align-items: stretch; }
            
            /* Horizontal Layout for Mobile */
            .card-image-container { width: 110px; height: auto; min-height: 100%; border-radius: 0; }
            .card-details { padding: 12px; justify-content: center; }
            .card-badges { top: 8px; left: 8px; flex-direction: column; gap: 4px; align-items: flex-start; }
            .badge { font-size: 9px; padding: 2px 6px; }
            .badge.distance { display: none; } /* Hide distance on small cards to save space */
            
            .rest-name { font-size: 16px; margin-bottom: 4px; }
            .card-meta { margin-bottom: 8px; font-size: 12px; }
            .card-footer { display: none; } /* Hide button, whole card is clickable */
            .rating-pill { position: absolute; top: 12px; right: 12px; } /* Reposition rating */
            .card-header { margin-bottom: 4px; }

            .hide-mobile { display: none; }
            .filter-btn { padding: 0; width: 48px; justify-content: center; }
            .filters-dropdown select { width: 100%; }
        }
      `}</style>
    </main>
  );
}