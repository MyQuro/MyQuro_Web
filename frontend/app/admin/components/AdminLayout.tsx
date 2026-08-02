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
        <div className="admin-root flex min-h-screen bg-[#050506] relative bg-hexagons text-white selection:bg-[#d5b263]/20 selection:text-[#d5b263] font-sans">
            {/* Mobile Top Bar */}
            <div className="lg:hidden fixed top-16 left-0 right-0 h-16 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/5 z-[80] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#d5b263] rounded-lg flex items-center justify-center shadow-lg shadow-[#d5b263]/10">
                        <span className="text-black font-bold text-lg">Q</span>
                    </div>
                    <span className="text-sm font-black text-white tracking-tight">Admin Console</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
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
                            <p className="text-[10px] font-black text-[#d5b263] uppercase tracking-[0.2em]">Management Hub</p>
                            <h1 className="text-2xl font-black text-white capitalize tracking-tight">{title}</h1>
                        </div>

                        {/* Desktop Top Utilities */}
                        <div className="hidden lg:flex items-center gap-4">
                            <button
                                onClick={onOpenCommandPalette}
                                className="flex items-center gap-3 px-4 py-2.5 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl text-zinc-400 hover:text-white hover:border-[#d5b263]/20 transition-all group shadow-sm"
                            >
                                <Search className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest group-hover:text-[#d5b263]">Search...</span>
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded-md text-[9px] font-black">
                                    <Command className="w-3 h-3 text-[#d5b263]" />
                                    <span>K</span>
                                </div>
                            </button>

                            <button
                                onClick={onOpenNotifications}
                                className="relative p-3 bg-[#0c0c0e]/80 border border-white/5 rounded-2xl text-zinc-400 hover:text-white hover:border-[#d5b263]/20 transition-all shadow-sm hover:shadow-md"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#d5b263] rounded-full border-2 border-[#050506]" />
                            </button>
                        </div>
                    </div>
                </header>

                {children}
            </main>

            <style jsx global>{`
                /* hexagons background rules */
                .admin-root.bg-hexagons {
                    background-color: #050506;
                    background-image: url('/hexagons.png');
                    background-repeat: no-repeat;
                    background-position: top center;
                    background-size: 1400px auto;
                }
                
                /* Recursive UI overrides to map light elements to dark gold */
                .admin-root .bg-white {
                    background-color: rgba(12, 12, 14, 0.8) !important;
                    border-color: rgba(255, 255, 255, 0.05) !important;
                    color: #ffffff !important;
                    backdrop-filter: blur(16px) !important;
                }
                
                .admin-root .bg-slate-50,
                .admin-root .bg-gray-50,
                .admin-root .bg-zinc-50 {
                    background-color: #050506 !important;
                }

                .admin-root .bg-gray-100,
                .admin-root .bg-slate-100 {
                    background-color: #121215 !important;
                }

                /* Override wildcard opacity modifiers to prevent bright/grey overlay divs */
                .admin-root [class*="bg-slate-50/"],
                .admin-root [class*="bg-gray-50/"],
                .admin-root [class*="bg-zinc-50/"],
                .admin-root [class*="bg-slate-100/"],
                .admin-root [class*="bg-gray-100/"] {
                    background-color: rgba(0, 0, 0, 0.4) !important;
                    border-color: rgba(255, 255, 255, 0.05) !important;
                }

                .admin-root .text-slate-900,
                .admin-root .text-gray-900,
                .admin-root .text-zinc-900,
                .admin-root .text-slate-800,
                .admin-root .text-gray-800 {
                    color: #ffffff !important;
                }

                .admin-root .text-slate-650,
                .admin-root .text-slate-500,
                .admin-root .text-gray-500,
                .admin-root .text-zinc-500,
                .admin-root .text-slate-400,
                .admin-root .text-gray-400 {
                    color: #a1a1aa !important;
                }

                .admin-root .border-slate-100,
                .admin-root .border-gray-100,
                .admin-root .border-slate-200,
                .admin-root .border-gray-200,
                .admin-root .border-gray-300 {
                    border-color: rgba(255, 255, 255, 0.05) !important;
                }

                /* Stats Cards Custom Background Colors */
                .admin-root .bg-emerald-50 {
                    background-color: rgba(16, 185, 129, 0.1) !important;
                    border: 1px solid rgba(16, 185, 129, 0.25) !important;
                }
                .admin-root .bg-blue-50 {
                    background-color: rgba(59, 130, 246, 0.1) !important;
                    border: 1px solid rgba(59, 130, 246, 0.25) !important;
                }
                .admin-root .bg-rose-50 {
                    background-color: rgba(239, 68, 68, 0.1) !important;
                    border: 1px solid rgba(239, 68, 68, 0.25) !important;
                }

                /* Indigo overrides to Gold */
                .admin-root .text-indigo-600,
                .admin-root .text-indigo-500,
                .admin-root .text-indigo-700 {
                    color: #d5b263 !important;
                }

                .admin-root .bg-indigo-50,
                .admin-root .bg-gray-100\/50,
                .admin-root .bg-indigo-50\/80 {
                    background-color: rgba(213, 178, 99, 0.08) !important;
                    color: #d5b263 !important;
                }

                .admin-root .bg-indigo-600,
                .admin-root .bg-indigo-500,
                .admin-root .bg-indigo-700 {
                    background-color: #d5b263 !important;
                    color: #000000 !important;
                }

                .admin-root .shadow-indigo-100,
                .admin-root .shadow-indigo-200 {
                    box-shadow: 0 10px 30px rgba(213, 178, 99, 0.1) !important;
                }

                .admin-root .ring-indigo-50,
                .admin-root .ring-indigo-100 {
                    --tw-ring-color: rgba(213, 178, 99, 0.1) !important;
                }

                /* Tables Styling */
                .admin-root table {
                    background-color: transparent !important;
                }

                .admin-root thead,
                .admin-root thead tr {
                    background-color: #050506 !important;
                }

                .admin-root thead th {
                    color: #ffffff !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.1em !important;
                    font-size: 10px !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
                }

                .admin-root tbody tr {
                    border-bottom-color: rgba(255, 255, 255, 0.03) !important;
                }

                .admin-root tbody tr:hover {
                    background-color: rgba(255, 255, 255, 0.02) !important;
                }

                /* Forms */
                .admin-root input,
                .admin-root textarea,
                .admin-root select {
                    background-color: #050506 !important;
                    border-color: #1f1f23 !important;
                    color: #ffffff !important;
                }

                .admin-root input:focus,
                .admin-root textarea:focus,
                .admin-root select:focus {
                    border-color: #d5b263 !important;
                    --tw-ring-color: #d5b263 !important;
                }

                /* Hover States */
                .admin-root .hover\\:bg-slate-50:hover,
                .admin-root .hover\\:bg-gray-50:hover {
                    background-color: #121215 !important;
                }

                .admin-root .hover\\:text-slate-900:hover,
                .admin-root .hover\\:text-gray-900:hover {
                    color: #ffffff !important;
                }

                .admin-root .hover\\:text-indigo-700:hover {
                    color: #e0bf70 !important;
                }

                /* Scrollbar overrides */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 99px;
                }
            `}</style>
        </div>
    );
};

export default AdminLayout;
