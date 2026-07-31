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
                    className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed top-16 bottom-0 left-0 w-72 
        bg-white/80 backdrop-blur-2xl border-r border-slate-200/50 
        flex flex-col z-[100] transition-transform duration-500 ease-in-out
        lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                            <span className="text-white font-black text-2xl tracking-tighter">Q</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                {userRole === 'company_admin' ? 'Partner' : 'Admin'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Hub</span>
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
                                            ? 'text-indigo-600'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }
                  `}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute inset-0 bg-indigo-50 rounded-2xl z-0"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className="relative z-10 flex items-center gap-3.5">
                                        <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-900'}`} />
                                        {item.label}
                                    </div>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute right-2 w-1.5 h-6 bg-indigo-600 rounded-full z-10"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 pb-8">
                    <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100">
                                {userEmail[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-slate-900 truncate">{userEmail.split('@')[0] || 'Admin'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{userRole.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
