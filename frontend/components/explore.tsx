import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MapPin,
  Search,
  Filter,
  ChevronDown,
  Utensils
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

// --- Types ---
export type Restaurant = {
  id: string;
  name: string;
  location: string;
  description: string;
  cuisines?: string[];
  banner?: string;
  isOpen: boolean;
};

type ApiRestaurant = {
  id: string;
  restaurantName: string;
  restaurantType: string;
  restaurantBanner?: string;
  city: string;
  state: string;
  restaurantStatus: "active" | "inactive" | "suspended";
  isOpen: boolean;
};

// --- Components ---

// 1. Image Component
function ImageWithFallback({ src, alt, isOpen }: { src?: string; alt: string; isOpen: boolean }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center w-full h-[220px] bg-gray-100 ${!isOpen ? 'grayscale opacity-70' : ''}`}>
        <Utensils className="w-12 h-12 text-gray-300" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`w-full h-[220px] object-cover transition-transform duration-500 group-hover:scale-105 ${!isOpen ? 'grayscale opacity-80' : ''}`}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

// 2. Individual Category Card Component
function CategoryCard({ cat, index, sectionScroll, itemRotation }: { cat: any; index: number; sectionScroll: any; itemRotation: any }) {
  // Stagger the drop animation left-to-right based on the item index.
  // The overall CategoriesSection scroll progress (0 to 1) is used as the progress coordinate.
  const start = 0.05 + index * 0.06;
  const end = start + 0.15;

  const y = useTransform(sectionScroll, [start, end], [-80, 0]);
  const opacity = useTransform(sectionScroll, [start, end], [0, 1]);

  return (
    <motion.div
      className="flex flex-col items-center group cursor-pointer w-full max-w-[240px]"
      style={{ y, opacity }}
    >
      {/* Image Container with subtle background to mimic the mask */}
      <div className="w-36 h-36 sm:w-40 sm:h-40 mb-6 relative flex items-center justify-center transition-transform duration-500 group-hover:-translate-y-2">
        <div className="absolute inset-4 bg-black/5 rounded-full blur-xl transition-opacity duration-300 group-hover:bg-black/10"></div>
        <motion.div style={{ rotate: itemRotation }} className="w-full h-full relative z-10">
          <img
            src={cat.img}
            alt={cat.name}
            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
            draggable="false"
          />
        </motion.div>
      </div>
      <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#D32F2F] transition-colors tracking-tight text-center mb-3">
        {cat.name}
      </h3>
      <p className="text-[13px] leading-relaxed font-medium text-[#6B7280] text-center px-1">
        {cat.desc}
      </p>
    </motion.div>
  );
}

function CategoriesSection({ decorRotation }: { decorRotation: any }) {
  const categoriesRef = useRef<HTMLElement>(null);

  const { scrollYProgress: catScroll } = useScroll({
    target: categoriesRef,
    // Start the animation when the top of the section (the header) is fully inside the bottom 80% of the viewport.
    // End the animation when the center of the section reaches the center of the viewport.
    offset: ["start 80%", "center center"]
  });

  // Dedicated scroll progress strictly for the continuous rotation of the food plates
  // from the very moment the section appears until it completely disappears.
  const { scrollYProgress: sectionScroll } = useScroll({
    target: categoriesRef,
    offset: ["start end", "end start"]
  });

  // Parallax calculations
  const leftDecorX = useTransform(catScroll, [0, 0.4, 0.6, 1], ["-20vw", "15vw", "15vw", "-20vw"]);
  const rightDecorX = useTransform(catScroll, [0, 0.4, 0.6, 1], ["20vw", "-15vw", "-15vw", "20vw"]);

  // Continuous 360 rotation over the entire scrolling distance of the section
  const itemRotation = useTransform(sectionScroll, [0, 1], [0, 360]);

  return (
    <section ref={categoriesRef} className="w-full relative z-20 bg-pure-white pt-16 sm:pt-24">
      <div className="flex flex-col items-center justify-center text-center mb-16 px-4 relative z-10 w-full max-w-[1280px] mx-auto">

        {/* Foreground Sliding Burger (Left inline with header) */}
        <motion.div
          style={{ x: leftDecorX, left: "calc(-50vw + 50%)" }}
          className="absolute top-1/2 -translate-y-1/2 w-[60px] sm:w-[80px] md:w-[100px] z-30"
        >
          <img src="/categories/decor_burger_bg.png" alt="Burger" className="w-full h-full object-contain" />
        </motion.div>

        {/* Foreground Sliding Pizza (Right inline with header) */}
        <motion.div
          style={{ x: rightDecorX, right: "calc(-50vw + 50%)" }}
          className="absolute top-1/2 -translate-y-1/2 w-[60px] sm:w-[80px] md:w-[100px]  z-30"
        >
          <img src="/categories/decor_pizza_bg.png" alt="Pizza" className="w-full h-full object-contain" />
        </motion.div>

        <span className="text-[#FBBF24] font-bold tracking-[0.2em] text-[10px] sm:text-xs mb-3 uppercase">
          Top Foods
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111827] max-w-2xl leading-tight uppercase">
          SATISFY YOUR CRAVINGS WITH <br className="hidden sm:block" />
          <span className="text-[#D32F2F]">OUR CATEGORIES</span>
        </h2>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 lg:gap-x-12 gap-y-16 justify-items-center">
          {[
            { id: 1, name: "Pizza", img: "/categories/top_pizza.png", desc: "Warm, comforting, and full of flavor, our pizzas are the perfect start to any meal." },
            { id: 2, name: "Broast", img: "/categories/top_broast.png", desc: "Crispy, golden, and packed with spices, our broast chicken is crafted for the senses." },
            { id: 3, name: "Chicken", img: "/categories/top_chicken.jpeg", desc: "Offering bold flavors and expertly roasted recipes that cater to every taste." },
            { id: 4, name: "Burgers", img: "/categories/top_burgers.jpeg", desc: "Our juicy burgers are the perfect way to begin your premium dining experience." },
            { id: 5, name: "Shakes", img: "/categories/top_shakes.png", desc: "Rich, creamy, and irresistibly sweet, our signature shakes are a delightful treat." },
            { id: 6, name: "Sandwiches", img: "/categories/top_sandwich.jpeg", desc: "Fresh ingredients layered perfectly in artisanal bread for a satisfying bite." },
            { id: 7, name: "Pasta", img: "/categories/top_pasta.jpeg", desc: "Handcrafted pasta tossed in rich, savory sauces for an authentic taste of Italy." },
            { id: 8, name: "Desserts", img: "/categories/top_desserts.jpeg", desc: "Decadent and sweet masterpieces designed to perfectly conclude your culinary journey." },
          ].map((cat, index) => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              index={index}
              sectionScroll={sectionScroll}
              itemRotation={itemRotation}
            />
          ))}
        </div>

        {/* Bottom Link */}
        <div className="flex justify-center mt-20 font-medium text-sm text-[#4B5563]">
          <span>Hungry for Something Delicious? </span>
          <span className="ml-1 text-[#D32F2F] hover:text-[#B71C1C] hover:underline cursor-pointer font-semibold transition-all">View All Categories!</span>
        </div>
      </div>
    </section>
  );
}

export default function Explore() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([
    { id: "1", name: "RS Cafe", location: "Bokaro", description: "An elegant culinary destination showcasing modern gastronomy and world-class service.", cuisines: ["Indian", "Chinese"], isOpen: true, banner: "/banner-placeholder.jpg" },
    { id: "2", name: "Café Coffee Day", location: "Bokaro", description: "An elegant culinary destination showcasing modern gastronomy and world-class service.", cuisines: ["Indian", "Chinese"], isOpen: true, banner: "/banner-placeholder.jpg" },
    { id: "3", name: "CVS Cafe", location: "Bokaro", description: "An elegant culinary destination showcasing modern gastronomy and world-class service.", cuisines: ["Indian", "Chinese"], isOpen: true, banner: "/banner-placeholder.jpg" }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Parallax & Scroll Hooks (Hydration Safe) ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { scrollY } = useScroll();
  const heroBowlRotation = useTransform(scrollY, [0, 1000], [0, 360]);
  const decorRotation = useTransform(scrollY, [0, 1000], [0, 180]);

  // Filter States
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"top" | "new" | "near">("top");
  const [activeTab, setActiveTab] = useState<"Overall" | "Fine Dining" | "Cafe">("Overall");

  const BACKEND_URL = (typeof window !== 'undefined' ? window.location.origin : 'https://myquro.com');

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || BACKEND_URL;
    const fetchRestaurants = async () => {
      try {
        const url = `${apiBase}/api/restaurants`;
        const response = await fetch(url);
        if (!response.ok) {
          console.warn("Failed to fetch from backend. Showing dummy data for UI.");
          return;
        }

        const data = await response.json();
        const mapped: Restaurant[] = data.restaurants
          .filter((r: ApiRestaurant) => r.restaurantStatus === 'active')
          .map((r: ApiRestaurant) => ({
            id: r.id,
            name: r.restaurantName,
            location: r.city,
            description: "An elegant culinary destination showcasing modern gastronomy and world-class service.",
            cuisines: r.restaurantType ? r.restaurantType.split(',').map(s => s.trim()) : ["Indian", "Chinese"],
            banner: r.restaurantBanner || undefined,
            isOpen: r.isOpen,
          }));
        setRestaurants(mapped);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [BACKEND_URL]);

  const filtered = useMemo(() => {
    let list = restaurants.filter((r) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.cuisines?.join(" ").toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTab === "Fine Dining") {
        matchesTab = !!(r.cuisines?.some(c => c.toLowerCase().includes("fine dining") || c.toLowerCase().includes("premium")) || r.description.toLowerCase().includes("fine dining"));
      } else if (activeTab === "Cafe") {
        matchesTab = !!(r.cuisines?.some(c => c.toLowerCase().includes("cafe") || c.toLowerCase().includes("coffee")) || r.description.toLowerCase().includes("cafe"));
      }
      return matchesQuery && matchesTab;
    });

    if (sortBy === "new") list = list.slice().reverse();
    return list;
  }, [restaurants, query, sortBy, activeTab]);

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (    <div className="w-full font-sans bg-black">

      {/* 1. HERO SECTION */}
      <section className="relative pt-10 pb-16 lg:pt-20 lg:pb-24 w-full border-b border-zinc-900 bg-black text-white">

        <div className="absolute inset-x-[-50vw] inset-y-0 opacity-[0.03] pointer-events-none -z-10" style={{ backgroundImage: 'url("/hexagons.png")', backgroundSize: '120px' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 relative z-10 w-full">

          {/* Left Text Block */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUpVariant}
            className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#d5b263]/10 rounded-full text-[#d5b263] text-sm font-semibold tracking-wide border border-[#d5b263]/25 mb-6 shadow-sm">
              <Utensils className="w-3.5 h-3.5" /> Explore Restaurant
            </div>

            <h1 className="text-[40px] md:text-[52px] lg:text-[60px] font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              Find your next <br className="hidden lg:block" />
              <span className="text-[#d5b263]">favorite restaurant</span>
            </h1>

            <p className="text-zinc-400 text-base md:text-lg max-w-lg mb-8 leading-relaxed font-medium">
              Discover top-rated dining spots near you and experience flavors that you&apos;ll never forget. Reserve your table in seconds and enjoy seamless dining at the city&apos;s finest locations.
            </p>

            <button className="bg-[#d5b263] hover:bg-[#bfa052] text-black px-8 py-3.5 rounded-full font-bold shadow-lg shadow-[#d5b263]/20 transition-transform hover:-translate-y-0.5">
              Explore Restaurant
            </button>
          </motion.div>

          {/* Right Image Composition */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full lg:w-1/2 flex justify-center lg:justify-end relative"
          >
            <div className="relative w-[300px] sm:w-[380px] md:w-[450px] aspect-[4/5] overflow-hidden rounded-[200px_200px_0_200px] shadow-2xl bg-zinc-900 border-[8px] border-zinc-950">
              <img src="/heroBG.png" alt="Restaurant Interior" className="w-full h-full object-cover" />
            </div>

            <motion.div
              style={{ rotate: heroBowlRotation }}
              className="absolute -bottom-8 -left-4 sm:left-4 md:-left-12 lg:left-0 w-[180px] sm:w-[220px] md:w-[260px] aspect-square rounded-full border-[8px] border-zinc-950 shadow-2xl bg-black overflow-hidden flex items-center justify-center p-2 origin-center"
            >
              <img src="/bowl.png" alt="Delicious Bowl" className="w-[110%] h-[110%] object-cover" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. OUR CATEGORIES SECTION (Hydration Safe Wrapper) */}
      {mounted && <CategoriesSection decorRotation={decorRotation} />}

      {/* 3. GRID HEADER & SEARCH SECTION */}
      <section className="pt-16 pb-12 w-full z-20 relative border-t border-zinc-900 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">

          {/* Header Text */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div className="flex flex-col items-start gap-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 rounded-full text-[#d5b263] text-xs font-semibold tracking-wide border border-zinc-850 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d5b263]/70 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d5b263]"></span>
                </span>
                Explore restaurants
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.1]">
                Discover Amazing <br />
                <span className="text-[#d5b263]">Restaurants</span>
              </h2>
            </div>
            <p className="text-zinc-600 font-medium max-w-md text-sm md:text-base leading-relaxed lg:text-right">
              Our comprehensive platform equips restaurants with powerful digital tools that streamline operations, enhance customer engagement, and help them thrive confidently in today's fast-evolving industry.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-2 pb-2 overflow-x-auto border-b border-zinc-900 hidden-scrollbar">
            {["Overall", "Fine Dining", "Cafe"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide whitespace-nowrap transition-all ${activeTab === tab ? "bg-[#d5b263] text-black shadow-md shadow-[#d5b263]/20" : "bg-zinc-200 text-zinc-700 border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-150"}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Smart Search Bar & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">

            {/* Search Input Box */}
            <div className="flex-1 bg-zinc-100 rounded-xl h-[60px] flex items-center px-4 md:px-6 shadow-sm border border-zinc-800 focus-within:ring-2 focus-within:ring-[#d5b263]/20 focus-within:border-[#d5b263] transition-all">
              <Search className="w-5 h-5 text-zinc-600 shrink-0" />
              <input
                type="text"
                placeholder="Search restaurants, cuisines, or cities..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none focus:outline-none px-4 text-white font-medium placeholder-zinc-500"
              />
              <Filter className="w-5 h-5 text-zinc-600 shrink-0 cursor-pointer hover:text-[#d5b263]" />
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-[220px] bg-zinc-100 rounded-xl h-[60px] flex items-center shadow-sm border border-zinc-800 relative cursor-pointer hover:border-zinc-750 focus-within:ring-2 focus-within:ring-[#d5b263]/20">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-full appearance-none bg-transparent border-none focus:outline-none pl-6 pr-12 text-white bg-zinc-100 font-semibold cursor-pointer"
              >
                <option value="top" className="bg-zinc-100 text-white">Top Rated</option>
                <option value="new" className="bg-zinc-100 text-white">Newest</option>
                <option value="near" className="bg-zinc-100 text-white">Nearest</option>
              </select>
              <ChevronDown className="w-5 h-5 text-zinc-600 absolute right-6 pointer-events-none" />
            </div>
          </div>

        </div>
      </section>

      {/* 3. RESTAURANT GRID */}
      <section className="pb-24 w-full relative z-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Link href={`/restro/${r.id}`} className="block group bg-zinc-100/60 rounded-[24px] overflow-hidden shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] transition-all duration-300 border border-zinc-850 h-full flex flex-col">

                  {/* Top Image */}
                  <div className="w-full p-3 pb-0 relative">
                    <div className="w-full h-[200px] md:h-[220px] rounded-[16px] overflow-hidden bg-zinc-200">
                      <img
                        src={r.banner || "/heroBG.png"}
                        alt={r.name}
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!r.isOpen ? 'grayscale opacity-80' : ''}`}
                        onError={(e) => { e.currentTarget.src = "/heroBG.png" }}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">

                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-white group-hover:text-[#d5b263] transition-colors line-clamp-1">{r.name}</h3>
                      <div className="flex items-center gap-1.5 text-zinc-600 shrink-0 mt-1">
                        <MapPin className="w-4 h-4 text-[#d5b263]" />
                        <span className="text-sm font-medium">{r.location}</span>
                      </div>
                    </div>

                    <p className="text-zinc-600 text-sm leading-relaxed mb-6 line-clamp-3">
                      {r.description}
                    </p>

                    {/* Cuisines Tags Bottom Footer */}
                    <div className="mt-auto flex flex-wrap gap-2">
                      {r.cuisines?.slice(0, 3).map(cuisine => (
                        <span key={cuisine} className="px-3.5 py-1.5 bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/25 rounded-md text-xs font-bold tracking-wide">
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-zinc-100 rounded-2xl shadow-sm border border-zinc-800">
              <span className="text-5xl mb-4">🍽️</span>
              <h3 className="text-xl font-bold text-white mb-2">No restaurants found</h3>
              <p className="text-zinc-600 mb-6">We couldn't find anything matching "{query}".</p>
              <button
                onClick={() => setQuery("")}
                className="bg-[#d5b263] text-black px-6 py-2 rounded-full font-bold shadow-md hover:bg-[#bfa052]"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}