"use client";

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  CalendarCheck,
  QrCode,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  Store,
  Power,
  ChevronRight,
  Tag,
  Receipt,
  ChefHat,
  Plus,
  Home,
  FileText,
  CreditCard,
  History,
  RotateCcw,
  MonitorSpeaker,
  Lock,
  Crown,
  Share,
} from 'lucide-react';

import NotificationBell from '@/components/NotificationBell';
import Logo from '@/components/Logo';
import { authClient } from '@/lib/auth-client';
import { DashboardProvider, useDashboard } from '@/lib/dashboard-context';
import { getPlan, BASIC_PLAN_ROUTES, type Plan } from '@/lib/plan-store';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/lib/websocket-context';


// --- Loading Screen ---
function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#d5b263] border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 bg-[#d5b263]/10 rounded-full animate-pulse"></div>
      </div>
      <p className="text-zinc-400 font-medium animate-pulse">Loading your workspace...</p>
      <p className="text-zinc-500 text-xs mt-2">This should only take a moment</p>
    </div>
  );
}

// --- Auth Check Component ---
function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending, error } = authClient.useSession();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for auth to finish loading
      if (isPending) {
        return;
      }

      // If there's an error, log it
      if (error) {
        console.error('[Auth Check] Session error:', error);
      }

      // If no session after loading completes
      if (!session?.user) {
        console.warn('[Auth Check] No authenticated session found');
        console.log('[Auth Check] Redirecting to signin with redirect path:', pathname);

        // Redirect to signin with current path as redirect target
        const redirectPath = pathname || '/home';
        router.push(`/signin?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      // Session found - user is authenticated
      console.log('[Auth Check] Authenticated user:', session.user.email);
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [session, isPending, error, router, pathname]);

  // Show loading while checking auth
  if (isPending || isCheckingAuth) {
    return <LoadingScreen />;
  }

  // Show loading if session is still being determined
  if (!session?.user) {
    return <LoadingScreen />;
  }

  // User is authenticated, show dashboard
  return <>{children}</>;
}

// --- Dashboard Content Component ---
function DashboardContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [plan, setPlanState] = useState<Plan>('basic');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);
  const { socket } = useWebSocket();
  const router = useRouter();
  const pathname = usePathname();
  const { user, restaurant, isLoading } = useDashboard();

  // Load plan from store or backend when restaurant is available
  useEffect(() => {
    if (restaurant?.id) {
      setPlanState(restaurant.plan || getPlan(restaurant.id));
    }
  }, [restaurant?.id, restaurant?.plan]);

  // Listen for plan changes via WebSocket
  useEffect(() => {
    if (!socket || !restaurant?.id) return;

    const handlePlanUpdated = (data: { restaurantId: string; plan: Plan }) => {
      if (data.restaurantId === restaurant.id) {
        setPlanState(data.plan);
        toast.success(`Plan updated in real-time to ${data.plan.toUpperCase()}!`, { icon: '👑' });
        
        // Dispatch local event for components listening locally
        window.dispatchEvent(new CustomEvent('myquro_plan_changed', { 
          detail: { restaurantId: data.restaurantId, plan: data.plan } 
        }));
      }
    };

    socket.on('plan-updated', handlePlanUpdated);
    return () => {
      socket.off('plan-updated', handlePlanUpdated);
    };
  }, [socket, restaurant?.id]);

  // Listen for plan changes (from admin panel on same browser tab fallback)
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if (restaurant?.id && ev.detail?.restaurantId === restaurant.id) {
        setPlanState(ev.detail.plan);
      }
    };
    window.addEventListener('myquro_plan_changed', handler);
    return () => window.removeEventListener('myquro_plan_changed', handler);
  }, [restaurant?.id]);

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
    if (!sessionStorage.getItem('pwa_prompt_shown')) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
        sessionStorage.setItem('pwa_prompt_shown', 'true');
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

  const handleHome = async () => {
    router.push('/home');
  };

  const handleSignOut = async () => {
    // Clear localStorage items
    localStorage.removeItem('user_auth');
    localStorage.removeItem('welcomeShown');
    await authClient.signOut();
    router.push('/');
  };

  // Navigation Config with plan-based locking
  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, show: true },
    { name: 'Kitchen Orders', href: '/dashboard/orders', icon: ChefHat, show: true },
    { name: 'Table Service', href: '/dashboard/service', icon: UtensilsCrossed, show: true },
    { name: 'New Order', href: '/dashboard/new-order', icon: Plus, show: true },
    { name: 'Manual Billing', href: '/dashboard/manual-billing', icon: MonitorSpeaker, show: true },
    { name: 'Billing & Payments', href: '/dashboard/billing', icon: Receipt, show: true },
    { name: 'Reservations', href: '/dashboard/reservations', icon: CalendarCheck, show: true },
    { name: 'Menu Mgmt', href: '/dashboard/menu', icon: ShoppingBag, show: true },
    { name: 'Offers', href: '/dashboard/offers', icon: Tag, show: true },
    { name: 'Tables & QR', href: '/dashboard/tables', icon: QrCode, show: true },
    { name: 'Reviews', href: '/dashboard/reviews', icon: FileText, show: true },
    { name: 'Staff', href: '/dashboard/staff', icon: Users, show: true },
    { name: 'Sessions', href: '/dashboard/sessions', icon: History, show: true },
    { name: 'Past Sessions', href: '/dashboard/past-sessions', icon: History, show: true },
    { name: 'Reset Tables', href: '/dashboard/reset-tables', icon: RotateCcw, show: true },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, show: true },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, show: true },
    { name: 'Group Mgmt', href: '/dashboard/companies', icon: Store, show: user?.role === 'admin' || user?.role === 'company_admin' },
  ]
    .filter(item => item.show)
    .map(item => ({
      ...item,
      locked: plan === 'basic' && !BASIC_PLAN_ROUTES.has(item.href),
    }));

  return (
    <div className="min-h-screen bg-black font-sans text-white">

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-[#0c0c0e]/95 backdrop-blur-md border-r border-zinc-950/20 shadow-2xl lg:shadow-none
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="shrink-0 h-20 flex items-center px-6 border-b border-transparent">
          <div className="flex items-center gap-3">
            <Link href="/home" className="flex items-center gap-2 group">
              <Logo size="sm" className="transition-transform group-hover:scale-105" />
              <span className="text-[10px] text-[#d5b263] font-bold uppercase tracking-widest pl-1.5 align-middle bg-[#d5b263]/10 px-2 py-0.5 rounded-full border border-[#d5b263]/20">Partner</span>
            </Link>
          </div>
          <button onClick={() => setSidebarOpen(false)} title="Close sidebar" className="lg:hidden ml-auto text-zinc-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {/* Plan Badge */}
          {plan === 'basic' && (
            <div className="mb-3 px-1">
              <div className="flex items-center gap-2 bg-[#d5b263]/5 border border-[#d5b263]/20 rounded-xl px-3 py-2">
                <Lock size={12} className="text-[#d5b263] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-[#d5b263] uppercase tracking-widest leading-tight">Basic Plan</p>
                  <p className="text-[9px] text-zinc-500 font-medium leading-tight mt-0.5">Some features locked</p>
                </div>
              </div>
            </div>
          )}
          {/* Navigation */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isLocked = item.locked;

              if (isLocked) {
                return (
                  <div
                    key={item.name}
                    onClick={() => toast.custom((t) => (
                      <div
                        className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full shadow-2xl rounded-2xl pointer-events-auto flex overflow-hidden`}
                        style={{ backgroundColor: '#18181b', border: '1px solid rgba(213,178,99,0.2)', color: '#fff' }}
                      >
                        <div className="flex-1 w-0 p-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                              <Crown className="h-8 w-8 text-[#d5b263]" />
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-bold" style={{ color: '#fff' }}>Premium Feature Locked</p>
                              <p className="mt-1 text-sm" style={{ color: '#a1a1aa' }}>Upgrade to Premium to unlock <span style={{ color: '#d5b263', fontWeight: 600 }}>{item.name}</span> and other advanced features.</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex" style={{ borderLeft: '1px solid #27272a' }}>
                          <button onClick={() => toast.dismiss(t.id)} className="border-none rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium focus:outline-none" style={{ color: '#71717a', backgroundColor: 'transparent' }}>Close</button>
                        </div>
                      </div>
                    ), { duration: 4000 })}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 group text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02] select-none"
                  >
                    <Icon size={20} strokeWidth={2.5} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    <span className="text-sm font-semibold tracking-wide flex-1 truncate">{item.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[8px] font-black text-[#d5b263]/80 bg-[#d5b263]/5 border border-[#d5b263]/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                      <Lock size={11} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200 group ${isActive
                    ? 'bg-[#d5b263] text-black shadow-lg shadow-[#d5b263]/25 translate-x-1'
                    : 'text-zinc-400 hover:bg-[#d5b263]/10 hover:text-[#d5b263] hover:translate-x-1'
                    }`}
                >
                  <Icon size={20} strokeWidth={2.5} className={isActive ? 'text-black' : 'text-zinc-450 group-hover:text-[#d5b263]'} />
                  <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto opacity-80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="shrink-0 p-2 m-2 bg-[#050506] rounded-lg border border-zinc-900/40">
          <div className="flex items-center gap-2 mb-1.5">
            {user?.image ? (
              <img
                src={user.image}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-800 shadow-sm"
              />
            ) : (
              <div className="w-7 h-7 bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/25 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-white truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[8px] text-zinc-500 font-medium truncate leading-none mt-0.5">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleHome}
              className="py-1 px-1.5 rounded bg-red-950/15 border border-red-900/20 text-red-400 font-bold text-[9px] flex items-center justify-center gap-0.5 hover:bg-red-950/20 hover:border-red-900/30 transition-all"
            >
              <Home size={10} className="text-[#d5b263]" />
              <span>Home</span>
            </button>
            <button
              onClick={handleSignOut}
              className="py-1 px-1.5 rounded bg-red-950/15 border border-red-900/20 text-red-400 font-bold text-[9px] flex items-center justify-center gap-0.5 hover:bg-red-950/20 hover:border-red-900/30 transition-all"
            >
              <Power size={10} />
              <span>Sign Out</span>
            </button>
          </div>
          <div className="mt-2 pt-1.5 border-t border-zinc-900/50 flex items-center justify-between text-[8px] font-bold tracking-tight">
            <span className="text-red-500 flex items-center gap-0.5 font-extrabold uppercase">
              <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              Support
            </span>
            <a href="tel:+916205749425" className="text-[#d5b263] hover:underline transition-all font-black">+91 62057-49425</a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-72 min-h-screen bg-black text-white dashboard-root">
        <style dangerouslySetInnerHTML={{ __html: `
          /* Dashboard root override for dark/gold premium theme */
          .dashboard-root h1, 
          .dashboard-root h2, 
          .dashboard-root h3, 
          .dashboard-root h4, 
          .dashboard-root h5, 
          .dashboard-root h6 {
            color: #ffffff !important;
          }
          
          .dashboard-root .bg-white {
            background-color: #0c0c0e !important;
            color: #ffffff !important;
          }
          
          /* Override inverted Tailwind zinc/slate background colors to be dark gray */
          .dashboard-root .bg-zinc-900,
          .dashboard-root .bg-zinc-850,
          .dashboard-root .bg-zinc-800 {
            background-color: #121215 !important;
          }
          
          .dashboard-root .bg-zinc-950 {
            background-color: #050506 !important;
          }
          
          .dashboard-root .text-zinc-300,
          .dashboard-root .text-zinc-400,
          .dashboard-root .text-zinc-450,
          .dashboard-root .text-zinc-500,
          .dashboard-root .text-zinc-650 {
            color: #a1a1aa !important;
          }
          
          .dashboard-root .bg-gray-50, 
          .dashboard-root .bg-gray-50\\/50,
          .dashboard-root .bg-gray-100\\/50 {
            background-color: #050506 !important;
          }
          
          .dashboard-root .bg-gray-100 {
            background-color: #121215 !important;
          }
          
          .dashboard-root .text-gray-900, 
          .dashboard-root .text-gray-800, 
          .dashboard-root .text-gray-700 {
            color: #f4f4f5 !important;
          }
          
          .dashboard-root .text-gray-600, 
          .dashboard-root .text-gray-500, 
          .dashboard-root .text-gray-400 {
            color: #a1a1aa !important;
          }
          
          .dashboard-root .border-gray-100, 
          .dashboard-root .border-gray-200, 
          .dashboard-root .border-gray-300,
          .dashboard-root .border-zinc-800,
          .dashboard-root .border-zinc-700,
          .dashboard-root .border-zinc-900 {
            border-color: rgba(63, 63, 70, 0.25) !important;
          }
          
          .dashboard-root .divide-gray-100 > * + *, 
          .dashboard-root .divide-gray-200 > * + *,
          .dashboard-root .divide-zinc-900 > * + * {
            border-color: rgba(63, 63, 70, 0.15) !important;
          }
          
          /* Form controls */
          .dashboard-root input, 
          .dashboard-root textarea, 
          .dashboard-root select,
          .dashboard-root button.bg-white {
            background-color: #050506 !important;
            border-color: #1f1f23 !important;
            color: #ffffff !important;
          }
          
          .dashboard-root input:focus, 
          .dashboard-root textarea:focus, 
          .dashboard-root select:focus {
            border-color: #d5b263 !important;
            --tw-ring-color: #d5b263 !important;
          }
          
          /* Hover styles */
          .dashboard-root .hover\\:bg-gray-50:hover {
            background-color: #121215 !important;
          }
          
          .dashboard-root .hover\\:bg-gray-100:hover {
            background-color: #16161c !important;
          }
          
          /* Red color to gold re-theming */
          .dashboard-root .text-red-600, 
          .dashboard-root .text-red-500,
          .dashboard-root .hover\\:text-red-700:hover {
            color: #d5b263 !important;
          }
          
          .dashboard-root .bg-red-50 {
            background-color: rgba(213, 178, 99, 0.1) !important;
            color: #d5b263 !important;
          }
          
          .dashboard-root .bg-red-600,
          .dashboard-root .bg-red-500,
          .dashboard-root .hover\\:bg-red-700:hover {
            background-color: #d5b263 !important;
            color: #000000 !important;
            font-weight: 800 !important;
          }
          
          /* Modals */
          .dashboard-root .fixed.inset-0.bg-black\\/40 {
            background-color: rgba(0, 0, 0, 0.8) !important;
            backdrop-filter: blur(12px) !important;
          }
        `}} />

        {/* Header */}
        <header className="sticky top-0 z-40 h-20 px-6 lg:px-8 flex items-center justify-between bg-[#050506]/95 backdrop-blur-xl border-b border-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              title='Open sidebar'
              className="lg:hidden p-2 -ml-2 text-zinc-400 hover:bg-zinc-900 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>

            <div className="hidden sm:block">
              <h2 className="text-xl font-black text-white tracking-tight">
                {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="bg-zinc-950 p-1 rounded-full border border-zinc-850">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-2 mx-auto">
          {children}
        </main>

        {/* PWA Install Prompt */}
        {showInstallPrompt && (
          <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#0c0c0e]/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 animate-in slide-in-from-bottom">
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
                <p>For the best full-screen experience on your iPhone/iPad:</p>
                <ol className="list-decimal list-inside space-y-1 bg-white/5 p-2 rounded-lg border border-white/5 text-zinc-300">
                  <li>Tap the <span className="inline-flex items-center justify-center w-5 h-5 bg-zinc-800 rounded mx-1"><Share size={10} className="text-[#d5b263]" /></span> <strong>Share</strong> button.</li>
                  <li>Scroll down and select <strong>Add to Home Screen</strong>.</li>
                </ol>
              </div>
            ) : (
              <p className="text-zinc-400 text-xs leading-relaxed mb-4">
                Install our application for instant launch, offline tracking, and a premium full-screen experience.
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
    </div>
  );
}

// --- Main Layout Export ---
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthCheck>
      <DashboardProvider>
        <DashboardContent>{children}</DashboardContent>
      </DashboardProvider>
    </AuthCheck>
  );
}
