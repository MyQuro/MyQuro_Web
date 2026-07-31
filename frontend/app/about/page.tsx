"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { Layers, PieChart, Smartphone, Rocket, Eye, Heart, Instagram, Twitter, Facebook, Linkedin } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function AboutPage() {
  const growthLineRef = useRef(null);
  const scrollProgressRef = useRef(null);

  useEffect(() => {
    // Responsive Animation Setup
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      // Desktop Animations
      gsap.utils.toArray('.reveal-up').forEach((elem: any) => {
        gsap.fromTo(elem, 
          { y: 50, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: elem, start: "top 85%" }
          }
        );
      });

      // Guided Scroll Animation (Desktop)
      const points = gsap.utils.toArray('.work-point');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".guide-line-container",
          start: "top 60%",
          end: "bottom 60%",
          scrub: 0.5,
        }
      });

      // Animate line height
      if (scrollProgressRef.current) {
        tl.to(scrollProgressRef.current, { height: "100%", ease: "none" });
      }

      // Animate points appearing as we scroll
      points.forEach((point: any, i: number) => {
        gsap.fromTo(point, 
          { opacity: 0, x: -20 },
          { 
            opacity: 1, x: 0, duration: 0.5,
            scrollTrigger: {
              trigger: point,
              start: "top 70%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });
    });

    mm.add("(max-width: 767px)", () => {
      // Mobile Animations
      gsap.utils.toArray('.reveal-up').forEach((elem: any) => {
        gsap.fromTo(elem, 
          { y: 30, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.6, ease: "power2.out",
            scrollTrigger: { trigger: elem, start: "top 90%" }
          }
        );
      });

      // Mobile Points Animation (Simple fade up)
      gsap.utils.toArray('.work-point').forEach((point: any) => {
        gsap.fromTo(point,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0, duration: 0.6,
            scrollTrigger: {
              trigger: point,
              start: "top 85%"
            }
          }
        );
      });
    });

    // Growth Graph Animation (Works on all sizes)
    const growthTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".growth-line",
        start: "top 75%",
        toggleActions: "play none none reverse"
      }
    });

    growthTl.to(".growth-line", { strokeDashoffset: 0, duration: 2, ease: "power2.out" })
            .to(".growth-area", { opacity: 1, duration: 1 }, "-=1.5")
            .to(".growth-point", { opacity: 1, scale: 1, duration: 0.5, stagger: 0.2, ease: "back.out(2)" }, "-=1")
            .to(".stat-card-1", { opacity: 1, y: 0, duration: 0.6 }, "-=0.8")
            .to(".stat-card-2", { opacity: 1, y: 0, duration: 0.6 }, "-=0.6");

    // Counter Animation
    let stats = { revenue: 0, orders: 0 };
    ScrollTrigger.create({
      trigger: ".growth-line",
      start: "top 75%",
      once: true,
      onEnter: () => {
        gsap.to(stats, {
          revenue: 124500,
          orders: 8540,
          duration: 2,
          ease: "power2.out",
          onUpdate: () => {
            const revenueEl = document.querySelector(".counter-revenue");
            const ordersEl = document.querySelector(".counter-orders");
            if (revenueEl) revenueEl.innerHTML = "₹" + (stats.revenue / 1000).toFixed(0) + "k";
            if (ordersEl) ordersEl.innerHTML = Math.round(stats.orders).toLocaleString();
          }
        });
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div className="bg-white">
      <div className="bg-noise"></div>

      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 border border-red-100 mb-8 reveal-up">
              <span className="w-2 h-2 rounded-full bg-[#D32F2F] mr-2 animate-pulse"></span>
              <span className="text-[#D32F2F] text-xs font-bold uppercase tracking-widest">Who We Are</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1] text-[#1F1F1F]">
              <span className="block reveal-up">Redefining the</span>
              <span className="block reveal-up text-gradient-red pb-2">Future of Dining</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto reveal-up font-medium">
              MyQuro brings every category of food service into one unified digital ecosystem built for speed, clarity, and exponential growth.
            </p>
          </div>
        </div>
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-30">
          <div className="absolute top-[-20%] left-[-10%] w-[40rem] h-[40rem] bg-gray-50 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-gray-50 rounded-full blur-[100px]"></div>
        </div>
      </header>

      <section className="py-20 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            <div className="w-full lg:w-1/2 reveal-up flex justify-center lg:justify-end">
              <div className="relative max-w-xs lg:max-w-sm">
                <div className="absolute inset-0 border-2 border-[#D32F2F]/10 rounded-[2rem] translate-x-3 translate-y-3"></div>
                <div className="relative rounded-[2rem] overflow-hidden shadow-xl bg-gray-50 aspect-[3/4]">
                  <Image src="/founder.png" alt="Founder & CEO" width={400} height={533} className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 w-full p-6 text-white">
                    <p className="text-xs font-bold uppercase tracking-widest text-black-900 mb-1">Founder & CEO</p>
                    <h3 className="text-2xl font-bold">The Visionary</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 reveal-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1F1F1F]">Building with <span className="text-[#D32F2F]">Purpose</span></h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                "We're not just building software; we're building the backbone of the food industry. MyQuro was born from a desire to empower every restaurant owner, from the smallest cloud kitchen to the largest chain, with the tools they need to thrive in a digital world."
              </p>

              <div className="glass-card p-8 rounded-2xl border-l-4 border-[#D32F2F] relative">
                <div className="absolute top-4 right-4 text-4xl text-gray-200">"</div>
                <p className="text-xl font-serif italic text-gray-800 mb-4 relative z-10">
                  "I don't believe in taking right decisions. I take decisions and then make them right."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center bg-[#1F1F1F] text-white font-bold text-xs">RT</div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1F1F1F]">Ratan Tata</p>
                    <p className="text-xs text-gray-500">Inspiration & Legacy</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F5F6F7] relative overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <div className="order-2 lg:order-1 relative">
              <div className="hidden md:block guide-line-container">
                <div className="guide-line-progress" ref={scrollProgressRef}></div>
              </div>

              <div className="space-y-16 relative z-10">
                
                <div className="work-point opacity-0 translate-y-8 group pl-0 md:pl-16 relative">
                  <div className="md:hidden absolute left-[23px] top-12 bottom-[-64px] w-0.5 bg-gray-200"></div>
                  
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-[#D32F2F] group-hover:scale-110 group-hover:bg-[#D32F2F] group-hover:text-white transition-all duration-300 shrink-0 relative z-10">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3 text-[#1F1F1F]">Operational Backbone</h3>
                      <p className="text-gray-600 leading-relaxed text-lg">We replace chaos with clarity. MyQuro connects orders, inventory, and staff into one seamless flow, eliminating bottlenecks before they happen.</p>
                    </div>
                  </div>
                </div>

                <div className="work-point opacity-0 translate-y-8 group pl-0 md:pl-16 relative">
                  <div className="md:hidden absolute left-[23px] top-12 bottom-[-64px] w-0.5 bg-gray-200"></div>

                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-[#D32F2F] group-hover:scale-110 group-hover:bg-[#D32F2F] group-hover:text-white transition-all duration-300 shrink-0 relative z-10">
                      <PieChart className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3 text-[#1F1F1F]">Data-Driven Growth</h3>
                      <p className="text-gray-600 leading-relaxed text-lg">Real-time analytics help you understand your customers and optimize your menu for maximum profit. Stop guessing and start knowing.</p>
                    </div>
                  </div>
                </div>

                <div className="work-point opacity-0 translate-y-8 group pl-0 md:pl-16 relative">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-[#D32F2F] group-hover:scale-110 group-hover:bg-[#D32F2F] group-hover:text-white transition-all duration-300 shrink-0 relative z-10">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3 text-[#1F1F1F]">Customer Experience</h3>
                      <p className="text-gray-600 leading-relaxed text-lg">From QR ordering to loyalty rewards, we build bridges between you and your diners, turning first-time visitors into regulars.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="order-1 lg:order-2 reveal-up perspective-container">
              <div className="pop-out-3d relative rounded-3xl overflow-hidden bg-white border border-gray-100 aspect-square lg:h-[500px] group">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:30px_30px] opacity-60"></div>
                
                <div className="absolute inset-0 flex items-end justify-center pb-0 px-0">
                  <svg className="w-full h-[70%] overflow-visible" viewBox="0 0 400 300" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{stopColor: 'rgba(211, 47, 47, 0.1)', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: 'rgba(211, 47, 47, 0)', stopOpacity: 0}} />
                      </linearGradient>
                    </defs>
                    <path d="M0,300 C100,280 150,200 250,150 S350,50 400,20 L400,300 Z" fill="url(#growthGradient)" className="opacity-0 growth-area" />
                    <path d="M0,300 C100,280 150,200 250,150 S350,50 400,20" fill="none" stroke="#D32F2F" strokeWidth="3" className="growth-line" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1000" strokeDashoffset="1000" />
                    <circle cx="250" cy="150" r="5" fill="white" stroke="#D32F2F" strokeWidth="2" className="growth-point opacity-0" />
                    <circle cx="400" cy="20" r="6" fill="#D32F2F" stroke="white" strokeWidth="2" className="growth-point opacity-0" />
                  </svg>
                </div>

                <div className="absolute top-[15%] left-[5%] md:left-[10%] glass-card p-4 rounded-xl shadow-lg transform translate-z-10 opacity-0 stat-card-1 w-40 md:w-48 border-l-4 border-gray-900">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Revenue</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 counter-revenue">₹0k</p>
                  <div className="mt-1 text-xs font-medium text-gray-900 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    124%
                  </div>
                </div>

                <div className="absolute bottom-[25%] right-[5%] md:right-[10%] glass-card p-4 rounded-xl shadow-lg transform translate-z-10 opacity-0 stat-card-2 w-44 md:w-52 border-l-4 border-blue-500">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-xs font-bold text-gray-600">Orders</div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 counter-orders">0</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            
            <div className="group p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 reveal-up">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#D32F2F] text-2xl mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Rocket className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#1F1F1F]">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To empower restaurants of every size with simple yet powerful digital tools that reduce manual effort, improve customer satisfaction, and accelerate business growth.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 reveal-up" style={{transitionDelay: '100ms'}}>
              <div className="w-14 h-14 bg-[#1F1F1F] rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Eye className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-[#1F1F1F]">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                To become the leading global platform that modernizes the food industry. We envision a future where dining is fully connected, data-driven, and customer-centric.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section className="py-24 bg-[#111] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto reveal-up">
            <div className="text-[#D32F2F] text-5xl mb-8">
              <Heart className="w-14 h-14 mx-auto" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-8">A Promise From Us</h2>
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10 font-light">
              "We're not here to replace humans — we're here to make their work easier. We're not here to compete with restaurants — we're here to help them grow."
            </p>
            <p className="text-xl md:text-2xl font-bold text-white">
              MyQuro exists so that good food businesses become great food brands.
            </p>
          </div>
        </div>
      </section>
      <footer className="bg-gray-50 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">&copy; 2025 MyQuro. All rights reserved.</p>
        </div>
        <div className="flex gap-2 container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <a href="/terms" className="absolute bottom-4 right-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">Terms of Service</a>
        <a href="/privacy" className="absolute bottom-4 right-34 text-sm text-gray-400 hover:text-gray-600 transition-colors">Privacy Policy</a>
        <a href="/contact" className="absolute bottom-4 right-58 text-sm text-gray-400 hover:text-gray-600 transition-colors">Contact Us</a>
        </div>
      </footer>
    </div>
    
  );
}