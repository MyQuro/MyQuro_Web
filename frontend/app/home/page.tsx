"use client";

import Link from "next/link";
import Footer from "../../components/Footer";
import { Button } from "../../components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Play, Star, CheckCircle2, ChevronRight, BarChart3, Clock, Users, Shield, Zap, RefreshCw, Send, Smartphone, LineChart, MessageSquare, CreditCard, Check, Truck, Heart, Utensils, X, Share } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import toast from 'react-hot-toast';

export default function HomePage() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // PWA Install Prompt Logic
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    setIsAlreadyInstalled(isStandalone);

    if (isStandalone) return;

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback timer if prompt event doesn't fire
    if (!sessionStorage.getItem('pwa_home_prompt_shown')) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
        sessionStorage.setItem('pwa_home_prompt_shown', 'true');
      }, 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA user choice outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } else if (isIOS) {
      toast((t) => (
        <span className="text-xs font-semibold">
          Tap the <strong className="text-[#d5b263]">Share</strong> button in Safari and select <strong className="text-[#d5b263]">Add to Home Screen</strong>.
        </span>
      ), { icon: '📱', duration: 7000 });
    } else {
      toast.error("Auto-install is not supported on this browser. Use your browser settings to Add to Home Screen.");
    }
  };


  const fadeUpVariant = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 font-sans selection:bg-[#d5b263] selection:text-black" ref={containerRef}>

      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'url("/hexagons.png")', backgroundSize: '120px' }} aria-hidden="true" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6 md:space-y-8">
            
            {/* Live Indicator Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d5b263]/10 rounded-full border border-[#d5b263]/20 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#d5b263] animate-pulse" />
              <span className="text-xs font-bold text-[#d5b263] tracking-wide uppercase">
                Restaurant Management Platform
              </span>
            </div>

            {/* Main Title */}
            <motion.h1 variants={fadeUpVariant} className="font-extrabold text-white text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-[1.15] sm:leading-[1.1] tracking-tight">
              Take Your <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d5b263] via-[#e5c158] to-[#b5984c]">Restaurant Business</span> <br />
              to the Next Level
            </motion.h1>

            {/* Description */}
            <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
              Join thousands of restaurants worldwide using MyQuro to streamline operations, boost revenue seamlessly, and grow their business with complete profitability.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link href="/explore" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#d5b263] hover:bg-[#bfa052] text-black rounded-full font-bold shadow-[0_10px_25px_-5px_rgba(213,178,99,0.3)] transition-all hover:-translate-y-1">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

          </div>

          {/* Right Image/Mockup Column */}
          <div className="lg:col-span-5 relative flex items-center justify-center w-full max-w-lg mx-auto lg:max-w-none">
            
            {/* Main dish image */}
            <div className="relative w-full h-full rounded-full border-[8px] sm:border-[12px] border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] flex items-center justify-center bg-zinc-900 overflow-hidden">
              <img src="/bowl.png" alt="Delicious gourmet dish" className="w-[110%] h-[110%] object-cover object-center" />
            </div>

            {/* Floating UI Elements */}
            {/* Pop-up: Order Placed */}
            <motion.div
              initial={{ opacity: 0, x: -50, y: -20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute top-8 sm:top-1/4 -left-4 sm:-left-20 bg-[#0c0c0e]/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-3 sm:gap-4 min-w-[180px] sm:min-w-[220px] border border-zinc-800 scale-90 sm:scale-100 origin-top-left z-20"
            >
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full overflow-hidden bg-zinc-850 border border-zinc-800 shadow-sm shrink-0 flex items-center justify-center">
                <img src="/customer_avatar.png" className="w-full h-full object-cover" alt="User Avatar" />
              </div>
              <div className="text-left">
                <span className="font-bold text-white text-xs sm:text-sm">Order Placed</span>
                <p className="text-[10px] text-zinc-400 font-medium">Just now</p>
              </div>
              <div className="ml-auto w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-[#d5b263]/10 flex items-center justify-center text-[#d5b263]">
                <CheckCircle2 className="w-4 sm:w-5 h-4 sm:h-5" />
              </div>
            </motion.div>

            {/* Pop-up: Review Score */}
            <motion.div
              initial={{ opacity: 0, x: 50, y: 50 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="absolute bottom-8 sm:bottom-1/8 -right-4 sm:-right-8 bg-[#0c0c0e]/95 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-3 sm:gap-4 pr-4 sm:pr-6 border border-zinc-800 scale-90 sm:scale-100 origin-bottom-right z-20"
            >
              <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-xl overflow-hidden bg-zinc-850 flex items-center justify-center p-1 shrink-0">
                <div className="w-full h-full bg-[#d5b263]/10 rounded-lg flex items-center justify-center text-[#d5b263]">
                  <Star className="w-6 sm:w-8 h-6 sm:h-8 fill-current" />
                </div>
              </div>
              <div className="text-left">
                <span className="font-bold text-white text-sm sm:text-md">4.9/5</span>
                <div className="flex gap-0.5 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-[#d5b263] text-[#d5b263]" />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Ambient Background Glows */}
            <div className="absolute top-10 right-10 w-20 h-20 bg-[#d5b263] rounded-full blur-[80px] opacity-20 -z-10" />
            <div className="absolute bottom-10 left-10 w-20 h-20 bg-[#d5b263] rounded-full blur-[80px] opacity-15 -z-10" />
          </div>

        </div>
      </section>

      {/* 2. STATS BANNER */}
      <section className="bg-gradient-to-r from-[#d5b263] via-[#e5c158] to-[#b5984c] text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-4 sm:gap-8 divide-x-0 md:divide-x divide-black/10">
            <div className="flex flex-col items-center justify-center text-center px-2 sm:px-4 md:border-r md:border-black/10">
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 sm:mb-2 tracking-tight">120+</span>
              <span className="text-black/80 font-bold text-[10px] sm:text-sm md:text-base uppercase tracking-wider">Restaurants Served</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-2 sm:px-4 border-l border-black/10 md:border-l-0 md:border-r md:border-black/10">
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 sm:mb-2 tracking-tight">240+</span>
              <span className="text-black/80 font-bold text-[10px] sm:text-sm md:text-base uppercase tracking-wider">Happy Customers</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-2 sm:px-4 md:border-r md:border-black/10">
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 sm:mb-2 tracking-tight">124+</span>
              <span className="text-black/80 font-bold text-[10px] sm:text-sm md:text-base uppercase tracking-wider">States Reached</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center px-2 sm:px-4 border-l border-black/10 md:border-l-0">
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 sm:mb-2 tracking-tight">99.9%</span>
              <span className="text-black/80 font-bold text-[10px] sm:text-sm md:text-base uppercase tracking-wider">Uptime Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EVERYTHING YOU NEED TO SUCCEED (FEATURES GRID) */}
      <section className="py-20 lg:py-32 bg-[#0c0c0e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col items-center text-center mb-16 lg:mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#d5b263]/10 rounded-full text-[#d5b263] border border-[#d5b263]/25 text-sm font-semibold uppercase tracking-wider mb-6">
              <Zap className="w-4 h-4" /> What we provide
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white max-w-2xl leading-tight">
              Everything You Need <br /> to <span className="text-[#d5b263]">Succeed</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400 max-w-2xl text-center leading-relaxed">
              Our comprehensive platform equips restaurants with powerful digital tools that streamline operations, enhance customer engagement, and maximize profit margins in today's fast-paced digital world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Card 1: Mobile First */}
            <div className="bg-[#121214] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-zinc-800 hover:shadow-xl transition-all duration-300 group flex flex-col h-auto sm:h-[380px]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Mobile-First ordering</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Empower guests to scan, browse your digital menu, and place orders directly from their tables. Reduce wait times and operational overhead.</p>
              <div className="mt-auto relative w-full h-[180px] bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center transition-colors">
                {/* Abstract UI Illustration */}
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                  className="w-[65%] sm:w-[55%] h-[140px] bg-zinc-950 rounded-t-2xl shadow-2xl border-t-4 border-x-4 border-zinc-800 p-2.5 flex flex-col gap-2 relative"
                >
                  {/* Phone Notch/Dynamic Island */}
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-2 bg-black rounded-full border border-zinc-800/50"></div>
                  
                  {/* Menu Item Card 1 */}
                  <div className="flex items-center gap-2 mt-2 bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-850">
                    <div className="w-8 h-8 rounded-md bg-[#d5b263]/10 flex items-center justify-center text-[#d5b263]"><Utensils className="w-4 h-4" /></div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="h-2 w-12 bg-zinc-700 rounded-full"></div>
                      <div className="h-1.5 w-8 bg-zinc-800 rounded-full"></div>
                    </div>
                    <div className="h-4 w-4 rounded-full bg-[#d5b263] flex items-center justify-center text-[10px] text-black font-extrabold">+</div>
                  </div>

                  {/* Menu Item Card 2 */}
                  <div className="flex items-center gap-2 bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-850">
                    <div className="w-8 h-8 rounded-md bg-[#d5b263]/10 flex items-center justify-center text-[#d5b263]"><Smartphone className="w-4 h-4" /></div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="h-2 w-10 bg-zinc-700 rounded-full"></div>
                      <div className="h-1.5 w-6 bg-zinc-800 rounded-full"></div>
                    </div>
                    <div className="h-4 w-4 rounded-full bg-zinc-850 text-zinc-500 flex items-center justify-center text-[10px] font-bold">+</div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Card 2: Lightning fast setup */}
            <div className="bg-[#121214] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-zinc-800 hover:shadow-xl transition-all duration-300 group flex flex-col h-auto sm:h-[380px]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Lightning fast setup</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Our easily customizable APIs and systems give you a headstart to build your entire menu in minutes.</p>
              <div className="mt-auto relative w-full h-[180px] bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center transition-colors">
                {/* Abstract UI: Nodes connected */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: 0.1, type: "spring" }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <svg className="absolute w-full h-full text-zinc-800" viewBox="0 0 200 100">
                    <path d="M50 50 Q 100 20 150 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M50 50 Q 100 80 150 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <line x1="100" y1="20" x2="100" y2="80" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
                  <motion.div
                    initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3, type: "spring" }}
                    className="absolute w-10 h-10 bg-black rounded-full shadow-lg border-2 border-[#d5b263] z-10 flex items-center justify-center text-[#d5b263] shadow-[#d5b263]/15"
                  ><Zap className="w-5 h-5" /></motion.div>
                  <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="absolute w-6 h-6 bg-zinc-950 rounded-full shadow border border-zinc-800 left-[20%] top-[40%]"></motion.div>
                  <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="absolute w-6 h-6 bg-zinc-950 rounded-full shadow border border-zinc-800 right-[20%] top-[40%]"></motion.div>
                </motion.div>
              </div>
            </div>

            {/* Card 3: Advanced Analytics */}
            <div className="bg-[#121214] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-zinc-800 hover:shadow-xl transition-all duration-300 group flex flex-col h-auto sm:h-[380px]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Advanced Analytics</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Gain actionable insights on customer behavior, sales trends, and peak hours to optimize resources and menu planning.</p>
              <div className="mt-auto relative w-full h-[180px] bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-end justify-center p-6 pb-0 transition-colors gap-2">
                {/* Build pure CSS bar chart */}
                {[
                  { h: "h-[40%]", hoverH: "group-hover:h-[50%]", color: "bg-[#d5b263]/20 border border-[#d5b263]/10", delay: 0.1 },
                  { h: "h-[60%]", hoverH: "group-hover:h-[70%]", color: "bg-[#d5b263]/40 border border-[#d5b263]/20", delay: 0.2 },
                  { h: "h-[80%]", hoverH: "group-hover:h-[85%]", color: "bg-[#d5b263]/70 border border-[#d5b263]/30", delay: 0.3 },
                  { h: "h-[100%]", hoverH: "group-hover:h-[95%]", color: "bg-gradient-to-t from-[#b5984c] to-[#d5b263] shadow-[0_0_10px_rgba(213,178,99,0.2)]", delay: 0.4 }
                ].map((bar, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: bar.delay, type: "spring", bounce: 0.4 }}
                    className={`w-6 sm:w-8 ${bar.color} rounded-t-lg ${bar.h} transition-all ${bar.hoverH} origin-bottom`}
                  ></motion.div>
                ))}
              </div>
            </div>

            {/* Card 4: Secure Payment */}
            <div className="bg-[#121214] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-zinc-800 hover:shadow-xl transition-all duration-300 group flex flex-col h-auto sm:h-[380px]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Secure Payment</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Accept credit cards, Apple Pay, and digital wallets with bank-grade encryption and secure checkouts. Speed up tables with zero friction.</p>
              <div className="mt-auto relative w-full h-[180px] bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center p-6">
                <div className="relative w-[90%] h-[130px] flex items-center justify-center">
                  {/* Credit Card Graphic */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
                    whileInView={{ opacity: 1, scale: 1, rotate: -3 }}
                    viewport={{ once: true }}
                    className="absolute w-[80%] h-[110px] bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-xl border border-zinc-700/60 p-3 shadow-2xl flex flex-col justify-between left-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-7 h-5 bg-zinc-700 rounded-md border border-zinc-600/40"></div>
                      <span className="text-[9px] font-bold tracking-widest text-[#d5b263]">GOLD CARD</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-mono text-zinc-400 tracking-wider">**** **** **** 8820</div>
                      <div className="flex justify-between text-[7px] text-zinc-500 font-mono">
                        <span>MYQURO USER</span>
                        <span>12/29</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Payment Success Badge Pop-up */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, x: 20, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    viewport={{ once: true }}
                    className="absolute right-0 bottom-1 bg-zinc-950 border border-zinc-800 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-xl z-10"
                  >
                    <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-black"><Check className="w-2.5 h-2.5 stroke-[4]" /></div>
                    <span className="text-[9px] font-bold text-white whitespace-nowrap">Paid $24.50</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Card 5: Table Reservation */}
            <div className="bg-[#121214] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-zinc-800 hover:shadow-xl transition-all duration-300 group flex flex-col h-auto sm:h-[380px]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Table Reservation</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Enable guests to browse seating availability and book tables in seconds. Manage reservation lists and walk-in flows effortlessly.</p>
              <div className="mt-auto relative w-full h-[180px] bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center p-4 transition-colors">
                <div className="w-[90%] flex flex-col gap-3">
                  {/* Calendar booking slots */}
                  <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    <span className="text-[9px] font-bold text-zinc-400">TABLE 12 (4 Guests)</span>
                    <span className="text-[8px] bg-[#d5b263]/10 text-[#d5b263] px-2 py-0.5 rounded border border-[#d5b263]/25 font-bold">Reserved</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { time: "7:00 PM", status: "booked" },
                      { time: "8:00 PM", status: "active" },
                      { time: "9:00 PM", status: "available" }
                    ].map((slot, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-2 rounded-lg text-center border text-[9px] font-bold flex flex-col gap-0.5 ${
                          slot.status === "booked"
                            ? "bg-zinc-950 text-zinc-650 border-zinc-900 line-through"
                            : slot.status === "active"
                            ? "bg-[#d5b263] text-black border-[#d5b263] shadow-[0_0_10px_rgba(213,178,99,0.2)]"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <span>{slot.time}</span>
                        <span className="text-[7px] opacity-80">
                          {slot.status === "booked" ? "Filled" : slot.status === "active" ? "Selected" : "Open"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 6: Delivery Management */}
            <div className="bg-[#121214] rounded-[2rem] p-6 sm:p-8 shadow-sm border border-zinc-800 hover:shadow-xl transition-all duration-300 group flex flex-col h-auto sm:h-[380px]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">Delivery Management</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">Dispatch drivers, monitor delivery routes on a live map, and notify customers with real-time ETA updates.</p>
              <div className="mt-auto relative w-full h-[180px] bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center p-4 transition-colors">
                <div className="w-[90%] flex flex-col gap-3">
                  {/* Order tracking list item */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#d5b263]/10 flex items-center justify-center text-[#d5b263]"><Truck className="w-3.5 h-3.5" /></div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-white">ORDER #1240</span>
                        <span className="text-[7px] text-zinc-500 font-medium">To Park Avenue</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20 px-2 py-0.5 rounded-full">In Transit</span>
                  </motion.div>

                  {/* Delivery Route Progress bar */}
                  <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[7px] text-zinc-400 font-bold">
                      <span>Kitchen</span>
                      <span className="text-[#d5b263]">On the Way</span>
                      <span>Arrived</span>
                    </div>
                    {/* Live Progress Bar */}
                    <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: "0%" }}
                        whileInView={{ width: "65%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#b5984c] to-[#d5b263] rounded-full"
                      ></motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. HOW WE HELP YOUR RESTAURANT (VERTICAL TIMELINE SECTION) */}
      <section className="py-24 bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col lg:flex-row gap-16 lg:gap-8">

            {/* Left Sticky Header */}
            <div className="w-full lg:w-1/3 flex flex-col items-start lg:sticky lg:top-32 lg:h-fit z-10">
              <div className="inline-flex items-center gap-2 text-[#d5b263] font-bold text-sm tracking-widest uppercase mb-4">
                <Star className="w-4 h-4 fill-[#d5b263]" /> Why MyQuro
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.1]">
                how we help <br />
                <span className="text-[#d5b263]">your restaurant</span>
              </h2>
              <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-sm">
                We make running your restaurant easier on logic, on staff and on your pocket. By doing all the heavy lifting in one place, MyQuro lets you serve better and increase profits continuously.
              </p>
            </div>

            {/* Right Scrolling Timeline */}
            <div className="w-full lg:w-2/3 relative pl-8 lg:pl-16">

              {/* Vertical line connecting nodes */}
              <div className="absolute top-0 bottom-0 left-[26px] hidden md:block lg:left-[58px] w-0.5 bg-zinc-800"></div>

              <div className="flex flex-col gap-20 ">

                {/* Timeline Step 1 */}
                <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="absolute left-[-24px] lg:left-[-24px] w-12 h-12 rounded-full bg-black border-4 border-[#d5b263]/30 hidden md:flex items-center justify-center z-10 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[#d5b263] text-black text-xs font-black flex items-center justify-center">1</div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-center order-1 md:order-2 text-center md:text-left">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Reduce staff workload</h3>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">Automate repeating tasks like order taking, bill splitting and inventory updates to let your staff focus on what actually matters—providing great guest hospitality.</p>
                  </div>
                  <div className="w-full md:w-1/2 flex justify-center md:justify-end order-2 md:order-1 mt-6 md:mt-0">
                    <div className="w-full max-w-[400px] aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-4 shadow-sm relative overflow-hidden group">
                      <img src="/illus/timeline-1.png" alt="Reduce staff workload" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </div>
                </div>

                {/* Timeline Step 2 */}
                <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="absolute left-[-24px] lg:left-[-24px] w-12 h-12 rounded-full bg-black border-4 border-[#d5b263]/30 hidden md:flex items-center justify-center z-10 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[#d5b263] text-black text-xs font-black flex items-center justify-center">2</div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-center order-1 md:order-1 text-center md:text-left md:pl-10 lg:pl-12">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Speed up table turnover</h3>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">With faster order processing, real-time kitchen updates, and digital payment settling, MyQuro lets you seat up to 30% more customers per available table every day.</p>
                  </div>
                  <div className="w-full md:w-1/2 flex justify-center md:justify-start order-2 md:order-2 mt-6 md:mt-0">
                    <div className="w-full max-w-[400px] aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-4 shadow-sm relative overflow-hidden group">
                      <img src="/illus/timeline-2.png" alt="Speed up table turnover" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </div>
                </div>

                {/* Timeline Step 3 */}
                <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="absolute left-[-24px] lg:left-[-24px] w-12 h-12 rounded-full bg-black border-4 border-[#d5b263]/30 hidden md:flex items-center justify-center z-10 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[#d5b263] text-black text-xs font-black flex items-center justify-center">3</div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-center order-1 md:order-2 text-center md:text-left">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Remove miscommunication</h3>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">Orders go straight from the guest's phone to the kitchen display. No misplaced notes, no double entry, and no wrong items delivered.</p>
                  </div>
                  <div className="w-full md:w-1/2 flex justify-center md:justify-end order-2 md:order-1 mt-6 md:mt-0">
                    <div className="w-full max-w-[400px] aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-4 shadow-sm relative overflow-hidden group">
                      <img src="/illus/timeline-3.png" alt="Remove miscommunication" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </div>
                </div>

                {/* Timeline Step 4 */}
                <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="absolute left-[-24px] lg:left-[-24px] w-12 h-12 rounded-full bg-black border-4 border-[#d5b263]/30 hidden md:flex items-center justify-center z-10 shadow-sm">
                    <div className="w-6 h-6 rounded-full bg-[#d5b263] text-black text-xs font-black flex items-center justify-center">4</div>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-center order-1 md:order-1 text-center md:text-left md:pl-10 lg:pl-12">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Track everything in real time</h3>
                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">Instantly check order statuses, restaurant occupancies, live billing values, and staff assignments from one clean, centralized dashboard.</p>
                  </div>
                  <div className="w-full md:w-1/2 flex justify-center md:justify-start order-2 md:order-2 mt-6 md:mt-0">
                    <div className="w-full max-w-[400px] aspect-[4/3] bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center p-4 shadow-sm relative overflow-hidden group">
                      <img src="/illus/timeline-4.png" alt="Track everything in real time" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CTA SECTION */}
      <section className="bg-black py-16 sm:py-24 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 sm:mb-6">
            Ready to Grow Your <br className="hidden sm:block" />
            <span className="text-[#d5b263]">Restaurant Business?</span>
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 mb-8 sm:mb-10 max-w-2xl mx-auto">
            Join thousands of successful restaurants built on the MyQuro platform. Streamline your operations today and experience the difference.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/explore" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#d5b263] hover:bg-[#bfa052] text-black rounded-full font-bold shadow-[0_10px_25px_-5px_rgba(213,178,99,0.3)] transition-all hover:-translate-y-1">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-[#d5b263] border border-[#d5b263]/30 hover:border-[#d5b263] hover:bg-[#d5b263]/5 rounded-full font-bold transition-all duration-300 hover:-translate-y-1">
              Contact Us
            </button>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <Footer />

      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#0c0c0e]/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 animate-in slide-in-from-bottom text-left">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/25 rounded-lg flex items-center justify-center font-bold text-xs">
                MQ
              </div>
              <h3 className="text-white font-bold text-sm">Install MyQuro App</h3>
            </div>
            <button onClick={() => setShowInstallPrompt(false)} className="text-zinc-500 hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>
          
          {isIOS ? (
            <div className="text-zinc-400 text-xs leading-relaxed mb-4 space-y-1.5">
              <p>For the best experience on your iPhone/iPad:</p>
              <ol className="list-decimal list-inside space-y-1 bg-white/5 p-2 rounded-lg border border-white/5 text-zinc-300">
                <li>Tap the <span className="inline-flex items-center justify-center w-5 h-5 bg-zinc-900 rounded mx-1"><Share size={10} className="text-[#d5b263]" /></span> <strong>Share</strong> button.</li>
                <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
              </ol>
            </div>
          ) : (
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              Install our application on your device for instant launch, offline tracking, and a premium full-screen experience.
            </p>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleInstallClick} 
              className="flex-1 py-2 bg-[#d5b263] text-black text-xs font-black rounded-xl hover:bg-[#e0bf70] active:scale-[0.98] transition-all shadow-md shadow-[#d5b263]/10"
            >
              {isIOS ? 'Got it' : 'Install App'}
            </button>
            <button 
              onClick={() => setShowInstallPrompt(false)} 
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              Later
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
