import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const moleculeRef = useRef<HTMLDivElement>(null);
  const logoGroupRef = useRef<HTMLDivElement>(null);
  const textMaskRef = useRef<HTMLDivElement>(null);
  const subTextRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Elegant curtain-raise exit
          gsap.to(containerRef.current, {
            yPercent: -100,
            duration: 0.8,
            ease: "power3.inOut",
            onComplete: () => {
              setIsVisible(false);
              onComplete();
            }
          });
        }
      });

      // --- INITIAL STATES ---
      // 1. Molecule Ring: Scattered
      const molecules = gsap.utils.selector(moleculeRef.current)('.molecule');
      gsap.set(molecules, {
        x: (i) => Math.cos(i * 0.5) * 120,
        y: (i) => Math.sin(i * 0.5) * 120,
        opacity: 0,
        scale: 0
      });

      // 2. Logo & Text hidden
      gsap.set(logoGroupRef.current, { scale: 0, opacity: 0 });
      gsap.set(textMaskRef.current, { width: "0%" });
      gsap.set(subTextRef.current, { opacity: 0, y: 20 });
      gsap.set(scannerRef.current, { scaleX: 0, opacity: 0 });

      // --- ANIMATION SEQUENCE ---

      // 1. Molecules Appear and Rotate
      tl.to(molecules, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        stagger: { amount: 0.4, from: "random" },
        ease: "back.out(1.7)"
      })
      .to(moleculeRef.current, {
        rotation: 360,
        duration: 1.5,
        ease: "power1.inOut"
      }, "<");

      // 2. Convergence (Implosion)
      tl.to(molecules, {
        x: 0,
        y: 0,
        scale: 0.1,
        opacity: 0.5,
        duration: 0.6,
        ease: "expo.in",
      }, "-=0.3");

      // 3. The Explosion (Logo Pop)
      tl.to(logoGroupRef.current, {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)"
      });

      // Hide molecules after explosion
      tl.set(moleculeRef.current, { opacity: 0 }, "<0.1");

      // 4. Scanner/Laser Wipe Effect for Text
      tl.to(scannerRef.current, {
        scaleX: 1,
        opacity: 1,
        duration: 0.1
      }, "-=0.2")
      .to([textMaskRef.current, scannerRef.current], {
        width: "100%",
        left: "100%",
        duration: 0.9,
        ease: "power2.inOut",
      })
      .to(scannerRef.current, {
        opacity: 0,
        duration: 0.2
      });

      // 5. Subtitle Fade In
      tl.to(subTextRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out"
      }, "-=0.6");

      // 6. Subtle Breathing/Pulse before exit
      tl.to(logoGroupRef.current, {
        scale: 1.03,
        duration: 1,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut"
      }, "-=0.3");

    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0c0c0e] via-[#000000] to-[#121214] overflow-hidden"
    >
      {/* Background Mesh Gradients (Subtle) */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#d5b263]/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#d5b263]/10 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">

        {/* ANIMATION CONTAINER */}
        <div className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center mb-4">

          {/* 1. Molecule Ring (The spinning particles) */}
          <div ref={moleculeRef} className="absolute inset-0 flex items-center justify-center">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="molecule absolute w-2.5 h-2.5 md:w-3 md:h-3 bg-[#d5b263] rounded-full shadow-[0_0_12px_rgba(213,178,99,0.6)]"
              />
            ))}
            <div className="absolute w-32 h-32 border border-[#d5b263]/20 rounded-full animate-[spin_3s_linear_infinite]" />
            <div className="absolute w-40 h-40 border border-dashed border-[#d5b263]/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
          </div>

          {/* 2. Main Logo (Appears after implosion) */}
          <div ref={logoGroupRef} className="relative z-20 w-28 h-28 md:w-32 md:h-32 bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl flex items-center justify-center transform perspective-1000 border border-zinc-800/80">
             {/* MyQuro Logo - Restaurant focused */}
             <svg viewBox="0 0 100 100" className="w-16 h-16 md:w-20 md:h-20 drop-shadow-lg">
                <defs>
                  <linearGradient id="myquroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e5c158" />
                    <stop offset="100%" stopColor="#b5984c" />
                  </linearGradient>
                </defs>
                {/* Restaurant Plate */}
                <circle
                  cx="50" cy="50" r="35"
                  fill="none"
                  stroke="url(#myquroGradient)"
                  strokeWidth="3"
                  className="opacity-90"
                />
                {/* Fork and Knife crossed */}
                <g transform="translate(50,50)">
                  {/* Fork */}
                  <rect x="-2" y="-15" width="4" height="20" fill="url(#myquroGradient)" rx="1" />
                  <rect x="-6" y="-15" width="2" height="8" fill="url(#myquroGradient)" />
                  <rect x="4" y="-15" width="2" height="8" fill="url(#myquroGradient)" />
                  {/* Knife */}
                  <rect x="-1" y="-15" width="3" height="20" fill="url(#myquroGradient)" rx="1" />
                  <polygon points="-1,-15 2,-15 0,-20" fill="url(#myquroGradient)" />
                </g>
             </svg>
             {/* Glossy overlay for "Glass" effect */}
             <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-2xl pointer-events-none" />
          </div>
        </div>

        {/* TEXT REVEAL CONTAINER */}
        <div className="relative text-center mt-2 overflow-hidden py-2 px-4">

          {/* The Scanner Line (Light beam) */}
          <div
            ref={scannerRef}
            className="absolute top-0 bottom-0 w-1 bg-[#d5b263] z-30 shadow-[0_0_15px_rgba(213,178,99,0.7)]"
            style={{ left: 0 }}
          />

          {/* Brand Name with Mask */}
          <div ref={textMaskRef} className="relative overflow-hidden whitespace-nowrap mx-auto">
             <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-1 font-sans">
               <span className="font-alex-brush text-[#d5b263] leading-none translate-y-[2px]">My</span>
               <span className="relative inline-block leading-none">
                 Q
                 <span className="absolute -bottom-[1px] right-[1.5px] text-[#d5b263] font-black text-[0.7em] select-none transform rotate-[25deg]">
                   \
                 </span>
               </span>
               <span>uro</span>
               <span className="text-[#d5b263] font-black ml-[0.5px]">.</span>
             </h1>
          </div>

          {/* Subtitle */}
          <div ref={subTextRef} className="mt-2 flex items-center justify-center gap-3">
            <div className="h-[1px] w-6 bg-[#d5b263]/40"></div>
            <p className="text-xs md:text-sm font-medium tracking-[0.15em] text-zinc-400 uppercase">
              Restaurant Experience
            </p>
            <div className="h-[1px] w-6 bg-[#d5b263]/40"></div>
          </div>

        </div>

      </div>
    </div>
  );
};