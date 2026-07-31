"use client";

import { useState } from 'react';
import { Menu, Bell, Search, Command } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    userRole: string;
    userEmail: string;
    title: string;
    onOpenNotifications?: () => void;
    onOpenCommandPalette?: () => void;
}

const AdminLayout = ({
    children,
    activeTab,
    setActiveTab,
    userRole,
    userEmail,
    title,
    onOpenNotifications,
    onOpenCommandPalette
}: AdminLayoutProps) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#F8F9FC] selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-16 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-100 z-[80] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                        <span className="text-white font-bold text-lg">Q</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tracking-tight">Admin Console</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                userRole={userRole}
                userEmail={userEmail}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <main className="flex-1 lg:ml-72 p-4 lg:p-6 pt-40 lg:pt-32 overflow-x-hidden">
                <header className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Management Hub</p>
                            <h1 className="text-2xl font-black text-slate-900 capitalize tracking-tight">{title}</h1>
                        </div>

                        {/* Desktop Top Utilities */}
                        <div className="hidden lg:flex items-center gap-4">
                            <button
                                onClick={onOpenCommandPalette}
                                className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:bg-slate-50 transition-all group shadow-sm"
                            >
                                <Search className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-slate-900">Search...</span>
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[9px] font-black">
                                    <Command className="w-3 h-3" />
                                    <span>K</span>
                                </div>
                            </button>

                            <button
                                onClick={onOpenNotifications}
                                className="relative p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm hover:shadow-md"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white" />
                            </button>
                        </div>
                    </div>
                </header>

                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
