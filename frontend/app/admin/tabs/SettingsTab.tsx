"use client";

import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Moon, Sun, Lock, Save, RefreshCw, Smartphone } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface SettingsTabProps {
    userEmail: string;
    userRole: string;
}

const SettingsTab = ({ userEmail, userRole }: SettingsTabProps) => {
    const [platformStatus, setPlatformStatus] = useState('operational');
    const [darkMode, setDarkMode] = useState(false);
    const [maintenance, setMaintenance] = useState(false);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Platform Configuration */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <Lock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Control Center</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Platform Core Parameters</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                            <div className="space-y-1">
                                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Maintenance Protocol</span>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Toggle read-only state for all nodes</p>
                            </div>
                            <button
                                onClick={() => setMaintenance(!maintenance)}
                                className={`w-14 h-8 rounded-full p-1 transition-all duration-500 ${maintenance ? 'bg-amber-500' : 'bg-slate-200'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-500 ${maintenance ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                            <div className="space-y-1">
                                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Dark Mode Interface</span>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Synchronize visual neural theme</p>
                            </div>
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className={`w-12 h-7 rounded-full p-1 transition-all duration-500 ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-500 ${darkMode ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`} >
                                    {darkMode ? <Moon className="w-3 h-3 text-indigo-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
                                </div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all group">
                            <div className="space-y-1">
                                <span className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Universal Telemetry</span>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Broadcast system updates to all browsers</p>
                            </div>
                            <div className="flex gap-2">
                                {['Off', 'On'].map(v => (
                                    <button
                                        key={v}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${v === 'On' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Brand System */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-sm">
                            <RefreshCw className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Sync Engine</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Real-time Data Reconciliation</p>
                        </div>
                    </div>

                    <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-[13px] font-black text-slate-900 uppercase">Synchronize Sessions</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed max-w-[240px]">Re-align all active customer sessions with the backend ledger.</p>
                        </div>
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-slate-200">
                            Initiate Re-Sync
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Sidebar - Support & Metadata */}
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900 p-6 rounded-3xl text-white shadow-2xl shadow-indigo-100 space-y-6"
                >
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-xl">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-lg font-black uppercase tracking-tight">Security Core</h3>
                        <p className="text-[10px] font-bold text-indigo-200/60 uppercase leading-relaxed tracking-widest">Your administrative session is protected by end-to-end neural encryption.</p>
                    </div>
                    <div className="pt-4 border-t border-white/10 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-indigo-200/40">Status</span>
                            <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                Operational
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-indigo-200/40">Version</span>
                            <span className="text-[10px] font-black uppercase text-indigo-200 font-mono">2.4.0-Stable</span>
                        </div>
                    </div>
                </motion.div>

                <button
                    onClick={() => {
                        toast.success('Configuration cached locally');
                    }}
                    className="w-full py-4 bg-white border border-slate-100 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm group"
                >
                    <Save className="w-4.5 h-4.5 text-indigo-600 group-hover:scale-125 transition-transform" />
                    Commit Changes
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
