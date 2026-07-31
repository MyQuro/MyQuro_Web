import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = "", size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: {
      my: 'text-2xl translate-y-[1px]',
      quro: 'text-lg',
      tail: '-bottom-[1px] right-[0.5px] text-[0.65em]',
    },
    md: {
      my: 'text-3xl translate-y-[2px]',
      quro: 'text-2xl',
      tail: '-bottom-[1px] right-[1px] text-[0.7em]',
    },
    lg: {
      my: 'text-4xl translate-y-[3px]',
      quro: 'text-3xl',
      tail: '-bottom-[1.5px] right-[1.5px] text-[0.75em]',
    },
    xl: {
      my: 'text-5xl translate-y-[4px]',
      quro: 'text-4xl',
      tail: '-bottom-[2px] right-[2px] text-[0.8em]',
    }
  };

  const current = sizeClasses[size];

  return (
    <div className={`flex items-center gap-1 select-none font-sans ${className}`}>
      {/* "My" in cursive script */}
      <span className={`font-alex-brush text-[#d5b263] leading-none ${current.my}`}>
        My
      </span>
      
      {/* "Quro." with custom golden tail and golden period */}
      <span className={`font-sans font-black text-white tracking-tight leading-none flex items-center ${current.quro}`}>
        <span className="relative inline-block leading-none">
          Q
        </span>
        <span>uro</span>
        <span className="text-[#d5b263] font-black ml-[0.5px]">.</span>
      </span>
    </div>
  );
}
