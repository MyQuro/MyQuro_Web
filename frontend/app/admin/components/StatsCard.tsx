"use client";

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    bg: string;
    index: number;
}

const StatsCard = ({ label, value, icon: Icon, color, bg, index }: StatsCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
            className="bg-white p-4 lg:p-5 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 group"
        >
            <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500 shadow-sm border border-black/5`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</p>
            </div>
        </motion.div>
    );
};

export default StatsCard;
