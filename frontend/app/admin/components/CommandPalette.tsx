"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, LayoutDashboard, Store, Building2, BarChart3, Tag, QrCode, ArrowRight, Settings, Bell, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (tab: any) => void;
    restaurants: any[];
}

const CommandPalette = ({ isOpen, onClose, onNavigate, restaurants }: CommandPaletteProps) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const navigationItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, category: 'Navigation' },
        { id: 'restaurants', label: 'Restaurants', icon: Store, category: 'Navigation' },
        { id: 'groups', label: 'Groups', icon: Building2, category: 'Navigation' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, category: 'Navigation' },
        { id: 'offers', label: 'Offers', icon: Tag, category: 'Navigation' },
        { id: 'qr-tools', label: 'QR Tools', icon: QrCode, category: 'Navigation' },
        { id: 'audit-logs', label: 'Audit Logs', icon: Shield, category: 'System' },
        { id: 'settings', label: 'Settings', icon: Settings, category: 'System' },
    ];

    const filteredItems = navigationItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );

    const filteredRestaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    const allItems = [...filteredItems, ...filteredRestaurants.map(r => ({ ...r, label: r.name, icon: Store, category: 'Restaurants', isRestaurant: true }))];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (isOpen) onClose();
                else onClose(); // This logic will be handled by parent, but keeping for reference
            }

            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % allItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = allItems[selectedIndex];
                if (selected) {
                    if (selected.isRestaurant) {
                        // Handle restaurant jump - maybe switch to restaurant tab with filter?
                        onNavigate('restaurants');
                    } else {
                        onNavigate(selected.id);
                    }
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, allItems, selectedIndex]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] px-4 md:px-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] overflow-hidden border border-white"
                    >
                        {/* Search Input */}
                        <div className="relative border-b border-slate-100 p-6">
                            <Search className="absolute left-10 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Search resources, actions or navigation..."
                                className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl text-lg font-bold text-slate-900 outline-none placeholder:text-slate-300 transition-all border border-transparent focus:border-indigo-100"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <Command className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400">K</span>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
                            {allItems.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                        <Search className="w-8 h-8 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No neural matches found</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {['Navigation', 'System', 'Restaurants'].map(category => {
                                        const categoryItems = allItems.filter(item => item.category === category);
                                        if (categoryItems.length === 0) return null;

                                        return (
                                            <div key={category} className="space-y-2">
                                                <h4 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{category}</h4>
                                                <div className="space-y-1">
                                                    {categoryItems.map((item) => {
                                                        const globalIndex = allItems.indexOf(item);
                                                        const isSelected = selectedIndex === globalIndex;

                                                        return (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => {
                                                                    if (item.isRestaurant) onNavigate('restaurants');
                                                                    else onNavigate(item.id);
                                                                    onClose();
                                                                }}
                                                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.01]' : 'hover:bg-slate-50 text-slate-600'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                                        <item.icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                                                                    </div>
                                                                    <span className="text-[14px] font-black uppercase tracking-wider">{item.label}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <motion.div layoutId="arrow" initial={{ x: -10 }} animate={{ x: 0 }}>
                                                                        <ArrowRight className="w-5 h-5" />
                                                                    </motion.div>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-8">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-400">ENTER</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-400">↑</span>
                                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-400">↓</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigate</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-400">ESC</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Close</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
