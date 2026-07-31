"use client";

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Template({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Simple fade-in and slide-up animation
      gsap.fromTo(containerRef.current, 
        { opacity: 0, y: 10, scale: 0.99 }, 
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power3.out", clearProps: "all" }
      );
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {children}
    </div>
  );
}
