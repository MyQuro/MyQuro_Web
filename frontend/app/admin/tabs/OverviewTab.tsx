"use client";

import { motion } from 'framer-motion';
import { DollarSign, LayoutDashboard, Store, AlertCircle } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { formatPrice } from '@/lib/utils';

interface OverviewTabProps {
    data: any;
}

const OverviewTab = ({ data }: OverviewTabProps) => {
    const stats = [
        { label: 'Revenue', value: formatPrice(data.overview.todayRevenue), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Today Orders', value: data.overview.todayOrders, icon: LayoutDashboard, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Active Partners', value: data.overview.activeRestaurants, icon: Store, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { label: 'Issues', value: data.overview.failedPayments, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                {stats.map((stat, i) => (
                    <StatsCard key={i} {...stat} index={i} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Feed */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Activity Feed</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Live Flow</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {data.recentActivity.orders.map((order: any, i: number) => (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 + (i * 0.05) }}
                                key={order.id}
                                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-default"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <DollarSign className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Order #{order.id.slice(0, 8)}</p>
                                        <p className="text-[11px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-900">{formatPrice(order.totalAmount)}</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1.5 px-2 py-0.5 rounded-full inline-block ${order.status === 'COMPLETED' ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50'
                                        }`}>
                                        {order.status}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* System Health */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 space-y-6"
                >
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">System Integrity</h3>
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Interface Services</p>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">99.9% Uptime</span>
                            </div>
                            <div className="w-full bg-slate-50 h-3 rounded-full p-0.5 border border-slate-100 overflow-hidden shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "99%" }}
                                    transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
                                    className="bg-indigo-600 h-full rounded-full shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Transactional Core</p>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">Operational</span>
                            </div>
                            <div className="w-full bg-slate-50 h-3 rounded-full p-0.5 border border-slate-100 overflow-hidden shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
                                    className="bg-indigo-600 h-full rounded-full shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">Platform Status</p>
                                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">All core systems are performing within optimal parameters. No performance degradations reported.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default OverviewTab;
