"use client";

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import Navbar to avoid SSR issues with auth context
const Navbar = dynamic(() => import('../components/Navbar'), {
  ssr: false,
  loading: () => null // Don't show loading state
});

// Dynamically import SessionBanner to avoid SSR issues with session context
const SessionBanner = dynamic(() => import('../components/SessionBanner'), {
  ssr: false,
  loading: () => null // Don't show loading state
});

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define routes where we don't show navbar
  const noNavbarRoutes = ['/signin', '/signup', '/auth/callback'];
  const isDashboard = pathname?.startsWith('/dashboard');
  const isReservation = pathname?.includes('/reserve');
  const isRestroDetails = pathname?.startsWith('/restro/') && !pathname?.includes('/reserve') && !pathname?.includes('/3d-menu');
  const isAuthPage = noNavbarRoutes.includes(pathname || '');

  // Don't show navbar and session banner on auth pages or dashboard
  if (isAuthPage || isDashboard) {
    return <div className="min-h-screen bg-black text-white">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <div className="top-16 fixed w-full z-50">
        <SessionBanner />
      </div>
      <div className={`min-h-screen ${isReservation ? 'bg-zinc-950' : 'bg-black'} text-white`}>
        {children}
      </div>
    </>
  );
}