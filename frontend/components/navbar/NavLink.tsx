import Link from 'next/link';
import { Home, Compass, Calendar, Receipt, Heart } from 'lucide-react';

interface NavLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon?: 'home' | 'compass' | 'calendar' | 'receipt' | 'heart';
}

export default function NavLink({ href, active, children, icon }: NavLinkProps) {
  const icons = {
    home: Home,
    compass: Compass,
    calendar: Calendar,
    receipt: Receipt,
    heart: Heart
  };

  const Icon = icon ? icons[icon] : null;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
        ${active 
          ? "bg-[#d5b263]/10 text-[#d5b263] shadow-sm border border-[#d5b263]/25" 
          : "text-zinc-400 hover:text-[#d5b263] hover:bg-[#d5b263]/10"
        }
      `}
    >
      {Icon && <Icon size={16} className={active ? "stroke-[2.5px]" : "stroke-[2px]"} />}
      {children}
    </Link>
  );
}