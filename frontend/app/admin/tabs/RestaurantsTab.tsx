"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle, ShieldAlert, MoreVertical, Crown, Lock, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { getPlan, setPlan, type Plan } from '@/lib/plan-store';

interface Restaurant {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    plan?: Plan;
    createdAt: string;
    ownerName: string;
}

interface RestaurantsTabProps {
    restaurants: Restaurant[];
    filter: string;
    setFilter: (filter: string) => void;
    handleApprove: (id: string) => void;
    handleSuspend: (id: string) => void;
}

// Plan badge component
const PlanBadge = ({ plan }: { plan: Plan }) => (
    plan === 'premium' ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#d5b263]/10 border border-[#d5b263]/20 text-[#d5b263] rounded-full text-[9px] font-black uppercase tracking-widest">
            <Crown size={9} />
            Premium
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Zap size={9} />
            Basic
        </span>
    )
);

// Plan Switcher per restaurant
const PlanSwitcher = ({ restaurantId, initialPlan }: { restaurantId: string; initialPlan?: Plan }) => {
    const [plan, setPlanState] = useState<Plan>('basic');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setPlanState(initialPlan || getPlan(restaurantId));
    }, [restaurantId, initialPlan]);

    const handleSet = async (newPlan: Plan) => {
        try {
            setPlan(restaurantId, newPlan);
            setPlanState(newPlan);
            setOpen(false);
            await apiClient.updateRestaurantPlan(restaurantId, newPlan);
            toast.success(`Plan updated to ${newPlan}`);
        } catch (error) {
            console.error('Failed to update plan:', error);
            toast.error('Failed to update plan on server');
        }
    };

    return (
        <div className="relative inline-block text-left">
            <button
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/5 bg-black/45 hover:bg-black/60 hover:border-[#d5b263]/20 transition-all text-[10px] font-black text-[#d5b263]"
            >
                <PlanBadge plan={plan} />
                <span className="text-zinc-500 text-[9px] font-normal">▾</span>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 z-20 bg-[#0c0c0e]/95 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl shadow-black overflow-hidden min-w-[160px] animate-in fade-in duration-150">
                        <div className="px-3 py-2 border-b border-white/5 bg-zinc-950/60">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Set Plan</p>
                        </div>
                        {(['basic', 'premium'] as Plan[]).map(p => (
                            <button
                                key={p}
                                onClick={() => handleSet(p)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${plan === p ? 'bg-[#d5b263]/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                {p === 'premium' ? (
                                    <Crown size={13} className="text-[#d5b263]" />
                                ) : (
                                    <Zap size={13} className="text-zinc-500" />
                                )}
                                <div>
                                    <p className="text-[11px] font-black capitalize leading-none mb-0.5">{p}</p>
                                    <p className="text-[9px] text-zinc-500 font-medium leading-tight">
                                        {p === 'basic' ? 'Core features only' : 'All features unlocked'}
                                    </p>
                                </div>
                                {plan === p && (
                                    <CheckCircle size={12} className="text-[#d5b263] ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const RestaurantsTab = ({
    restaurants,
    filter,
    setFilter,
    handleApprove,
    handleSuspend
}: RestaurantsTabProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden"
        >
            <div className="p-6 border-b border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-4 bg-slate-50/10">
                <div className="relative flex-1 w-full lg:w-auto">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search managed entities..."
                        className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all placeholder:text-slate-400 placeholder:font-bold shadow-inner"
                    />
                </div>
                <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/30">
                    {['all', 'pending', 'approved', 'suspended'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-black capitalize transition-all duration-300 ${filter === status
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto min-h-[280px]">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Entity / Credentials</th>
                            <th className="px-6 py-4">Management</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Plan</th>
                            <th className="px-6 py-4">Onboarding</th>
                            <th className="px-6 py-4 text-right">Governance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {restaurants.filter(r => filter === 'all' || r.status === filter).map((restaurant, i) => (
                            <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                key={restaurant.id}
                                className="hover:bg-slate-50 transition-colors group cursor-default"
                            >
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg shadow-inner ring-4 ring-white">
                                            {restaurant.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-black text-sm text-slate-900 leading-tight">{restaurant.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tight">{restaurant.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="text-sm font-black text-slate-700">{restaurant.ownerName}</span>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{restaurant.phone}</p>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ring-1 ring-slate-100
                    ${restaurant.status === 'approved' ? 'text-emerald-500' :
                                            restaurant.status === 'suspended' ? 'text-rose-500' :
                                                restaurant.status === 'pending' ? 'text-amber-500' :
                                                    'text-slate-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${restaurant.status === 'approved' ? 'bg-emerald-500 animate-pulse' :
                                            restaurant.status === 'suspended' ? 'bg-rose-500' :
                                                'bg-amber-500'
                                            }`} />
                                        {restaurant.status}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <PlanSwitcher restaurantId={restaurant.id} initialPlan={restaurant.plan} />
                                </td>
                                <td className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    {new Date(restaurant.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        {restaurant.status === 'pending' && (
                                            <button
                                                onClick={() => handleApprove(restaurant.id)}
                                                className="p-2.5 text-emerald-500 hover:bg-emerald-50 hover:scale-110 rounded-xl transition-all duration-300"
                                                title="Approve Partner"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                        {restaurant.status === 'approved' && (
                                            <button
                                                onClick={() => handleSuspend(restaurant.id)}
                                                className="p-2.5 text-rose-500 hover:bg-rose-50 hover:scale-110 rounded-xl transition-all duration-300"
                                                title="Suspend Partner"
                                            >
                                                <ShieldAlert className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button className="p-2.5 text-slate-300 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all duration-300">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
};

export default RestaurantsTab;
