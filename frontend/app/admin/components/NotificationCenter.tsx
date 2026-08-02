"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Notification {
    id: string;
    type: 'info' | 'warning' | 'success';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
    const notifications: Notification[] = [
        { id: '1', type: 'info', title: 'New Restaurant Request', message: 'The Grand Palace is awaiting approval.', time: '2 mins ago', read: false },
        { id: '2', type: 'success', title: 'Payment Synchronized', message: 'All platform transaction records are up to date.', time: '1 hour ago', read: true },
        { id: '3', type: 'warning', title: 'High Load Detected', message: 'Analytics engine is processing heavy volumes.', time: '3 hours ago', read: true },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#0c0c0e]/95 backdrop-blur-3xl rounded-l-[40px] shadow-2xl z-[260] border-l border-white/5 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#d5b263]/10 border border-[#d5b263]/25 rounded-2xl flex items-center justify-center shadow-md">
                                    <Bell className="w-5 h-5 text-[#d5b263]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Signals</h3>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Platform Telemetry</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-full flex items-center justify-center transition-all hover:rotate-90 duration-500"
                            >
                                <X className="w-5 h-5 text-zinc-400 hover:text-white" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {notifications.map((n) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-6 rounded-[28px] border transition-all cursor-pointer group ${n.read ? 'bg-zinc-950/40 border-white/5 opacity-60' : 'bg-zinc-900/60 border-white/10 shadow-sm hover:border-[#d5b263]/20'
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'info' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' :
                                                n.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                                                    'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {n.type === 'info' && <Info className="w-5 h-5" />}
                                            {n.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                            {n.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                        </div>
                                        <div className="space-y-1 overflow-hidden flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-[13px] font-black text-white uppercase truncate">{n.title}</h4>
                                                {!n.read && <div className="w-2 h-2 bg-[#d5b263] rounded-full animate-pulse" />}
                                            </div>
                                            <p className="text-[11px] font-bold text-zinc-400 leading-relaxed uppercase opacity-85">{n.message}</p>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Clock className="w-3 h-3 text-zinc-500" />
                                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">{n.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-zinc-950/60 border-t border-white/5">
                            <button className="w-full py-4 bg-zinc-900 border border-white/5 hover:border-[#d5b263]/25 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-all">
                                Acknowledge All
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationCenter;
