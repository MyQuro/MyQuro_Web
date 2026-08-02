import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from "../../lib/auth-context";
import { User, Settings, LogOut } from 'lucide-react';

interface UserMenuProps {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role?: string;
  } | null;
}

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/signin" className="px-5 py-2 text-zinc-400 font-bold text-sm hover:text-[#d5b263] transition uppercase tracking-wider">
          Log in
        </Link>
        <Link href="/signup" className="px-5 py-2 bg-[#d5b263] text-black rounded-full text-xs font-black hover:bg-[#c4a152] transition shadow-md hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider">
          Sign up
        </Link>
      </div>
    );
  }

  const userInitials = user.name
    ? user.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 p-1.5 pr-3 rounded-full border border-zinc-800/60 hover:bg-[#d5b263]/10 hover:border-[#d5b263]/30 hover:text-[#d5b263] transition-all"
      >
        {user.image ? (
          <Image src={user.image} alt="Profile" width={32} height={32} className="rounded-full ring-1 ring-zinc-800" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20 flex items-center justify-center text-xs font-bold">
            {userInitials}
          </div>
        )}
        <span className="text-sm font-semibold text-zinc-300 max-w-[100px] truncate group-hover:text-[#d5b263]">
            {user.name}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#0c0c0e] border border-zinc-900 rounded-2xl shadow-2xl py-2.5 z-50 animate-in fade-in slide-in-from-top-2">
           <div className="px-4 py-2.5 border-b border-zinc-900 mb-1.5">
             <p className="text-sm font-black text-white">{user.name}</p>
             <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">{user.email}</p>
           </div>

           <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-[#d5b263]/10 hover:text-[#d5b263] transition-colors rounded-lg mx-1.5 font-medium">
             <User size={16} /> Profile
           </Link>
           <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-[#d5b263]/10 hover:text-[#d5b263] transition-colors rounded-lg mx-1.5 font-medium">
             <Settings size={16} /> Settings
           </Link>

           <div className="border-t border-zinc-900 mt-1.5 pt-1.5">
             <button
                onClick={handleSignOut}
                className="w-[calc(100%-12px)] flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors rounded-lg mx-1.5 font-medium text-left"
             >
               <LogOut size={16} /> Sign out
             </button>
           </div>
        </div>
      )}
    </div>
  );
}