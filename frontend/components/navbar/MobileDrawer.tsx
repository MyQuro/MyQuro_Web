import React from 'react';
import Link from 'next/link';
import { X, Home, Compass, Calendar, QrCode, LogOut, Settings, User, Receipt, Heart, Building2, Clock } from 'lucide-react';
import { useAuth } from "../../lib/auth-context";
import Logo from "../Logo";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role?: string;
  } | null;
  userRole?: string | null;
  activeSession: any;
  isActive: (path: string) => boolean;
  hasInvitations: boolean;
  onOpenInvites: () => void;
  onOpenRequestStatus: () => void;
}

export default function MobileDrawer({
    isOpen, onClose, user, userRole, isActive, hasInvitations, onOpenInvites, onOpenRequestStatus
}: MobileDrawerProps) {
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className={`fixed inset-y-0 right-0 w-[80%] max-w-sm bg-[#0c0c0e]/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full text-white">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800">
             <Logo size="md" />
             <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800">
               <X className="w-5 h-5 text-zinc-400 hover:text-white" />
             </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
             {/* Navigation */}
             <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Menu</p>
                
                <DrawerLink href="/home" icon={Home} label="Home" active={isActive("/home")} onClick={onClose} />
                <DrawerLink href="/explore" icon={Compass} label="Explore" active={isActive("/explore")} onClick={onClose} />
                <DrawerLink href="/qr" icon={QrCode} label="Scan QR" active={false} onClick={onClose} />
                
                {user && (
                    <>
                      <DrawerLink href="/my-reservations" icon={Calendar} label="Reservations" active={isActive("/my-reservations")} onClick={onClose} />
                      <DrawerLink href="/my-orders" icon={Receipt} label="My Orders" active={isActive("/my-orders")} onClick={onClose} />
                    </>
                )}
             </div>

             {/* Partner/Restaurant Section */}
             {user && (
                 <div className="space-y-2 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Restaurant</p>

                    {userRole === 'restaurant' ? (
                        <Link
                           href="/dashboard"
                           className="flex items-center justify-center w-full py-3 bg-red-600 text-black font-bold rounded-xl shadow-md hover:bg-red-700 transition"
                           onClick={onClose}
                        >
                            Restaurant Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link 
                                href="/apply-for-restro" 
                                onClick={onClose} 
                                className="flex items-center gap-2.5 w-full py-3 px-4 bg-zinc-900/50 border border-zinc-800 text-zinc-300 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-800 hover:text-white transition-all mb-2"
                            >
                                <Building2 size={15} className="text-[#d5b263]" />
                                Apply for Restaurant
                            </Link>
                            <button 
                                onClick={() => { onOpenRequestStatus(); onClose(); }} 
                                className="flex items-center gap-2.5 w-full text-left py-3 px-4 bg-zinc-900/50 border border-zinc-800 text-zinc-300 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-800 hover:text-white transition-all"
                            >
                                <Clock size={15} className="text-[#d5b263]" />
                                Application Status
                            </button>
                        </>
                    )}

                    {hasInvitations && (
                        <button
                            onClick={() => { onOpenInvites(); onClose(); }}
                            className="w-full flex items-center justify-between py-2.5 px-4 bg-red-50 text-red-700 font-medium rounded-lg text-sm"
                        >
                            <span>View Invitations</span>
                            <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                        </button>
                    )}
                 </div>
             )}
          </div>

          {/* Footer / Auth */}
          <div className="p-5 border-t border-zinc-800 bg-zinc-950/50">
             {!user ? (
                  <div className="grid grid-cols-2 gap-3">
                     <Link href="/signin" className="py-2.5 text-center font-bold text-sm text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg shadow-sm hover:bg-zinc-800 transition-colors">
                         Log In
                     </Link>
                     <Link href="/signup" className="py-2.5 text-center font-bold text-sm text-black bg-[#d5b263] rounded-lg shadow-md hover:bg-[#bfa052] transition-colors">
                         Sign Up
                     </Link>
                  </div>
              ) : (
                  <div className="space-y-3">
                     <div className="flex items-center gap-3 mb-4">
                         {user.image ? (
                             <img src={user.image} className="w-10 h-10 rounded-full object-cover" alt="User" />
                         ) : (
                             <div className="w-10 h-10 bg-[#d5b263]/10 text-[#d5b263] rounded-full flex items-center justify-center font-bold">
                                 {user.name?.[0]}
                             </div>
                         )}
                         <div>
                             <p className="font-bold text-white text-sm">{user.name}</p>
                             <p className="text-xs text-zinc-400">{user.email}</p>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                         <Link href="/profile" onClick={onClose} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors">
                             <User size={16} /> Profile
                         </Link>
                         <Link href="/settings" onClick={onClose} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 bg-zinc-900 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors">
                             <Settings size={16} /> Settings
                         </Link>
                     </div>
                     <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 font-bold text-sm rounded-lg transition">
                         <LogOut size={16} /> Sign Out
                     </button>
                  </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}

function DrawerLink({ href, icon: Icon, label, active, onClick }: any) {
    return (
        <Link 
            href={href} 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active ? 'bg-[#d5b263]/10 text-[#d5b263] font-bold border border-[#d5b263]/25' : 'text-zinc-400 hover:bg-[#d5b263]/10 hover:text-[#d5b263] font-medium'
            }`}
        >
            <Icon size={20} className={active ? "stroke-[2.5px] stroke-[#d5b263]" : "stroke-[2px]"} />
            {label}
        </Link>
    );
}