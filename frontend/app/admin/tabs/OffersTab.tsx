"use client";

import { motion } from 'framer-motion';
import { Tag, DollarSign, Percent, ShoppingBag, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface Offer {
    id: string;
    name: string;
    code: string;
    offerType: string;
    discountValue: number;
    startDate: string;
    endDate: string;
    scope: string;
    status?: string;
}

interface OffersTabProps {
    offers: Offer[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedFilter: string;
    setSelectedFilter: (filter: string) => void;
    selectedType: string | null;
    setSelectedType: (type: string | null) => void;
    setShowOfferModal: (show: boolean) => void;
    handleDeleteOffer: (id: string) => void;
    prepareOfferEdit: (offer: Offer) => void;
}

const OffersTab = ({
    offers,
    searchQuery,
    setSearchQuery,
    selectedFilter,
    setSelectedFilter,
    selectedType,
    setSelectedType,
    setShowOfferModal,
    handleDeleteOffer,
    prepareOfferEdit
}: OffersTabProps) => {
    const filteredOffers = offers.filter(offer => {
        const matchesSearch = !searchQuery ||
            offer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            offer.code.toLowerCase().includes(searchQuery.toLowerCase());

        const isExpired = new Date() > new Date(offer.endDate);
        const isUpcoming = new Date() < new Date(offer.startDate);
        const currentStatus = isExpired ? 'Expired' : isUpcoming ? 'Upcoming' : 'Active';

        const matchesFilter = selectedFilter === 'All Offers' || selectedFilter === currentStatus;
        const matchesType = !selectedType || offer.offerType === selectedType;

        return matchesSearch && matchesFilter && matchesType;
    });

    const offerTypeCards = [
        { name: 'Flat Discount', type: 'flat_discount', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { name: 'Percentage', type: 'percentage', icon: Percent, color: 'text-rose-500', bg: 'bg-rose-50' },
        { name: 'Buy 1 Get 1', type: 'buy_1_get_1', icon: ShoppingBag, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { name: 'Category Base', type: 'category_discount', icon: Tag, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-6">
            {/* Search and Filters Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search campaign vectors..."
                        className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all placeholder:text-slate-400 shadow-inner"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    {['All Offers', 'Active', 'Upcoming', 'Expired'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setSelectedFilter(filter)}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${selectedFilter === filter
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowOfferModal(true)}
                        className="px-6 py-2.5 bg-indigo-600 text-white text-[11px] font-black rounded-xl hover:scale-105 transition-all duration-300 shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest"
                    >
                        <Plus className="w-4 h-4" />
                        New Campaign
                    </button>
                </div>
            </div>

            {/* Strategy Types Selection */}
            <div className="space-y-6">
                <div className="flex justify-between items-center px-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Strategy Archetypes</h2>
                    {selectedType && (
                        <button
                            onClick={() => setSelectedType(null)}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest underline underline-offset-4"
                        >
                            Reset Archetype
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {offerTypeCards.map((type, i) => (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            key={type.name}
                            onClick={() => setSelectedType(selectedType === type.type ? null : type.type)}
                            className={`p-4 bg-white border-2 rounded-2xl flex items-center gap-4 group transition-all duration-300 hover:shadow-2xl ${selectedType === type.type
                                ? 'border-indigo-600 shadow-2xl shadow-indigo-100 -translate-y-2'
                                : 'border-slate-50 hover:border-slate-200'
                                }`}
                        >
                            <div className={`w-12 h-12 ${type.bg} ${type.color} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-sm`}>
                                <type.icon className="w-5 h-5" />
                            </div>
                            <span className="font-black text-slate-900 text-xs leading-tight text-left uppercase tracking-tight">{type.name}</span>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Offers Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-6 py-4">Archetype & Identity</th>
                                <th className="px-5 py-4 text-center">Magnitude</th>
                                <th className="px-5 py-4 font-center text-center">Time Window</th>
                                <th className="px-5 py-4 text-center">Vitals</th>
                                <th className="px-6 py-4 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOffers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-32 text-center">
                                        <Tag className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                                        <p className="text-slate-900 font-black text-xl tracking-tight uppercase">Non-Promotional State</p>
                                        <p className="text-slate-400 text-[11px] mt-2 font-bold uppercase tracking-widest">Deploy a campaign vector to stimulate activity</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOffers.map((offer, i) => {
                                    const isExpired = new Date() > new Date(offer.endDate);
                                    const isUpcoming = new Date() < new Date(offer.startDate);
                                    const currentStatus = isExpired ? 'Expired' : isUpcoming ? 'Upcoming' : 'Active';

                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            key={offer.id}
                                            className="group hover:bg-slate-50 transition-colors cursor-default"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform ${offer.offerType === 'percentage' ? 'bg-rose-50 text-rose-500' :
                                                        offer.offerType === 'flat_discount' ? 'bg-emerald-50 text-emerald-500' :
                                                            'bg-indigo-50 text-indigo-500'
                                                        }`}>
                                                        <Tag className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-black text-slate-900 tracking-tight">{offer.name}</p>
                                                            {offer.scope === 'company' && (
                                                                <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">Global</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1.5">{offer.code}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center font-bold">
                                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${offer.offerType === 'percentage'
                                                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                    {offer.offerType === 'percentage' ? `${offer.discountValue}% OFF` : `${formatPrice(offer.discountValue)} OFF`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                                                        {new Date(offer.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest mt-0.5">to {new Date(offer.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border shadow-sm ${currentStatus === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse' :
                                                    currentStatus === 'Upcoming' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-slate-50 text-slate-400 border-slate-100'
                                                    }`}>
                                                    {currentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => prepareOfferEdit(offer)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteOffer(offer.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default OffersTab;
