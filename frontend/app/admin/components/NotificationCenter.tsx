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
                        className="fixed inset-0 z-[250] bg-slate-900/10 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-6 top-6 bottom-6 w-full max-w-sm bg-white/80 backdrop-blur-2xl rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] z-[260] border border-white flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                    <Bell className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Signals</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Telemetry</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all hover:rotate-90 duration-500"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {notifications.map((n) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-6 rounded-[28px] border transition-all cursor-pointer group ${n.read ? 'bg-white/40 border-slate-50 opacity-60' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'info' ? 'bg-blue-50 text-blue-500' :
                                                n.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                                                    'bg-emerald-50 text-emerald-500'
                                            }`}>
                                            {n.type === 'info' && <Info className="w-5 h-5" />}
                                            {n.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                            {n.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                        </div>
                                        <div className="space-y-1 overflow-hidden">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-[13px] font-black text-slate-900 uppercase truncate">{n.title}</h4>
                                                {!n.read && <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase opacity-80">{n.message}</p>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Clock className="w-3 h-3 text-slate-300" />
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{n.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                            <button className="w-full py-4 bg-white border border-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:text-slate-900 transition-all">
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
