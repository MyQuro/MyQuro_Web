"use client";

import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Store,
    Building2,
    BarChart3,
    Tag,
    QrCode,
    Menu,
    X,
    Shield,
    Settings
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';

interface MenuItem {
    id: string;
    label: string;
    icon: any;
}

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    userRole: string;
    userEmail: string;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const AdminSidebar = ({
    activeTab,
    setActiveTab,
    userRole,
    userEmail,
    isOpen,
    setIsOpen
}: AdminSidebarProps) => {
    const menuItems: MenuItem[] = [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'restaurants', label: userRole === 'company_admin' ? 'My Restaurants' : 'Restaurants', icon: Store },
        { id: 'groups', label: 'Enterprise', icon: Building2 },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'offers', label: 'Promotions', icon: Tag },
        { id: 'qr-tools', label: 'QR Tools', icon: QrCode },
        { id: 'identity-engine', label: 'Identity Engine', icon: Shield },
        { id: 'settings', label: 'Settings', icon: Settings },
    ].filter(item => {
        if (userRole === 'company_admin' && item.id === 'groups') return false;
        return true;
    });

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed top-16 bottom-0 left-0 w-72 
        bg-[#0c0c0e]/85 backdrop-blur-2xl border-r border-white/5 
        flex flex-col z-[100] transition-transform duration-500 ease-in-out
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="flex flex-col gap-2 mb-10">
                        <Logo size="md" />
                        <div className="flex flex-col mt-2 px-1">
                            <span className="text-[13px] font-black text-white tracking-tight leading-none">
                                {userRole === 'company_admin' ? 'Partner Portal' : 'Admin Console'}
                            </span>
                            <span className="text-[9px] font-bold text-[#d5b263] uppercase tracking-widest mt-1">Platform Hub</span>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl 
                    text-[13px] font-bold transition-all duration-300 relative group
                    ${isActive
                                            ? 'text-black font-black shadow-md shadow-[#d5b263]/10'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                        }
                   `}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute inset-0 bg-[#d5b263] rounded-2xl z-0"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className="relative z-10 flex items-center gap-3.5">
                                        <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-black' : 'text-zinc-500 group-hover:text-white'}`} />
                                        {item.label}
                                    </div>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute right-2 w-1.5 h-6 bg-black/80 rounded-full z-10"
                                        />
                                    )}
                                </button>
                             );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 pb-8">
                    <div className="p-4 bg-zinc-950/60 rounded-3xl border border-white/5 group hover:bg-[#0c0c0e] hover:border-white/10 hover:shadow-2xl transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d5b263] to-[#bfa052] flex items-center justify-center text-black font-black text-sm shadow-md">
                                {userEmail[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-white truncate">{userEmail.split('@')[0] || 'Admin'}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{userRole.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
