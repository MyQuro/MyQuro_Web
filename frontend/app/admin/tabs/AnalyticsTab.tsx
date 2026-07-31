"use client";

import { motion } from 'framer-motion';
import { Filter, Calendar, BarChart3, TrendingUp, DollarSign, ShoppingBag, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface AnalyticsTabProps {
    data: any;
    restaurants: any[];
    period: string;
    setPeriod: (period: string) => void;
    analyticsRestaurantId: string;
    setAnalyticsRestaurantId: (id: string) => void;
    customStartDate: string;
    setCustomStartDate: (date: string) => void;
    customEndDate: string;
    setCustomEndDate: (date: string) => void;
}

const AnalyticsTab = ({
    data,
    restaurants,
    period,
    setPeriod,
    analyticsRestaurantId,
    setAnalyticsRestaurantId,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate
}: AnalyticsTabProps) => {
    // Safe access to analytics data
    const metrics = data?.orderMetrics || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, growth: 0 };

    const cards = [
        { label: 'Total Revenue', value: formatPrice(metrics.totalRevenue), icon: DollarSign, trend: 12.5, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Order Volume', value: metrics.totalOrders, icon: ShoppingBag, trend: 8.2, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { label: 'Avg Ticket Size', value: formatPrice(metrics.avgOrderValue), icon: BarChart3, trend: -2.4, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'Growth Vector', value: `${metrics.growth || 0}%`, icon: TrendingUp, trend: 5.1, color: 'text-blue-500', bg: 'bg-blue-50' },
    ];

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col lg:flex-row justify-between items-center gap-6"
            >
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Filter className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={analyticsRestaurantId}
                            onChange={(e) => setAnalyticsRestaurantId(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Aggregate Platform</option>
                            {restaurants.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/30 w-full sm:w-auto overflow-x-auto">
                        {[
                            { id: '7', label: '7D' },
                            { id: '30', label: '30D' },
                            { id: '90', label: '90D' },
                            { id: 'custom', label: 'Custom' }
                        ].map(p => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 min-w-[60px] ${period === p.id
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-900'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {period === 'custom' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 w-full lg:w-auto"
                    >
                        <div className="relative flex-1 sm:flex-none">
                            <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-900 outline-none"
                            />
                        </div>
                        <div className="text-slate-300">→</div>
                        <div className="relative flex-1 sm:flex-none">
                            <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black text-slate-900 outline-none"
                            />
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={card.label}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] group hover:shadow-2xl transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-black/5`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${card.trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                {card.trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {Math.abs(card.trend)}%
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{card.label}</p>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{card.value}</h4>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[320px] flex flex-col relative overflow-hidden group"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                                <TrendingUp className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Trajectory Analysis</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Revenue sequence integration</p>
                            </div>
                        </div>
                    </div>

                    {data?.timeSeries?.length > 0 ? (
                        <div className="flex-1 flex items-end justify-between gap-1.5 pt-4 min-h-[200px]">
                            {data.timeSeries.slice(-14).map((ts: any, idx: number) => {
                                const maxRevenue = Math.max(...data.timeSeries.map((t: any) => t.revenue), 1);
                                const heightPx = Math.max((ts.revenue / maxRevenue) * 180, 8);
                                return (
                                    <div key={idx} className="flex-1 group/bar relative flex flex-col items-center justify-end" style={{ height: '200px' }}>
                                        <div
                                            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                                        >
                                            {formatPrice(ts.revenue)}
                                        </div>
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: heightPx }}
                                            transition={{ delay: idx * 0.04, duration: 0.5, ease: 'easeOut' }}
                                            className="w-full bg-indigo-500/15 rounded-t-lg group-hover/bar:bg-indigo-500 transition-colors duration-300 relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/30 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                                        </motion.div>
                                        <div className="mt-2 text-center w-full overflow-hidden">
                                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">
                                                {new Date(ts.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Activity className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No temporal vectors detected in current buffer</p>
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[320px] flex flex-col relative overflow-hidden group"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm">
                                <BarChart3 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Category Distribution</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Platform menu affinity</p>
                            </div>
                        </div>
                    </div>

                    {data?.categoryPerformance?.length > 0 ? (
                        <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                            {data.categoryPerformance.map((cp: any, idx: number) => {
                                const maxRevenue = Math.max(...data.categoryPerformance.map((c: any) => c.revenue), 1);
                                const percentage = (cp.revenue / maxRevenue) * 100;
                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{cp.categoryName}</span>
                                            <span className="text-[11px] font-mono text-emerald-600 font-bold">{formatPrice(cp.revenue)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Filter className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Consumption vectors not yet synchronized</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default AnalyticsTab;
