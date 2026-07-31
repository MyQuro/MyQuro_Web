"use client";

import { motion } from 'framer-motion';
import { QrCode, Search, Download, Copy, ExternalLink, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface QRToolsTabProps {
    restaurants: any[];
    selectedRestaurantId: string;
    handleFetchTables: (id: string) => void;
    restaurantTables: any[];
    selectedTableId: string;
    setSelectedTableId: (id: string) => void;
    handleGenerateQR: () => void;
    generatedQR: { qrToken: string, scanUrl: string, qrImageBase64?: string } | null;
}

const QRToolsTab = ({
    restaurants,
    selectedRestaurantId,
    handleFetchTables,
    restaurantTables,
    selectedTableId,
    setSelectedTableId,
    handleGenerateQR,
    generatedQR
}: QRToolsTabProps) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6"
            >
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <QrCode className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">QR Orchestrator</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Generating access vectors</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Select Managed Entity</label>
                        <div className="relative group">
                            <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={selectedRestaurantId}
                                onChange={(e) => handleFetchTables(e.target.value)}
                                className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all appearance-none cursor-pointer group-hover:border-slate-200"
                            >
                                <option value="">Select Restaurant</option>
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {selectedRestaurantId && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-6 pt-2"
                        >
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Target Table ID</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
                                {restaurantTables.map((table: any) => (
                                    <button
                                        key={table.id}
                                        onClick={() => setSelectedTableId(table.id)}
                                        className={`p-4 rounded-xl text-[11px] font-black transition-all duration-300 border-2 ${selectedTableId === table.id
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                            : 'bg-white text-slate-400 border-slate-50 hover:border-slate-200'
                                            }`}
                                    >
                                        {table.tableNumber}
                                    </button>
                                ))}
                                {restaurantTables.length === 0 && (
                                    <p className="col-span-full text-center py-6 text-slate-300 font-bold uppercase text-[10px] tracking-widest border border-dashed border-slate-200 rounded-2xl">No active tables found</p>
                                )}
                            </div>
                        </motion.div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={handleGenerateQR}
                            disabled={!selectedTableId || !selectedRestaurantId}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-[12px] shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 disabled:bg-slate-100 disabled:shadow-none disabled:text-slate-300 transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-[0.2em] group"
                        >
                            <QrCode className="w-4.5 h-4.5 group-hover:rotate-90 transition-transform duration-500" />
                            Generate Neural Code
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Result Panel */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col items-center justify-center text-center space-y-6 min-h-[380px]"
            >
                {!generatedQR ? (
                    <div className="space-y-5">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto border border-dashed border-slate-200">
                            <HelpCircle className="w-8 h-8 text-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Ready to Encode</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-[240px]">Select a restaurant and table from the control panel to generate a unique scanning vector.</p>
                        </div>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full space-y-10"
                    >
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full scale-110 group-hover:scale-125 transition-transform duration-700" />
                            <div className="relative bg-white p-4 rounded-3xl border-4 border-slate-50 shadow-inner inline-block mx-auto group-hover:rotate-2 transition-transform duration-500">
                                {generatedQR.qrImageBase64 ? (
                                    <img
                                        src={generatedQR.qrImageBase64}
                                        alt="Neural QR"
                                        className="w-48 h-48 mix-blend-multiply"
                                    />
                                ) : (
                                    <div className="w-48 h-48 bg-slate-50 rounded-2xl flex items-center justify-center">
                                        <QrCode className="w-16 h-16 text-slate-200 animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 max-w-sm mx-auto">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group overflow-hidden">
                                <span className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest whitespace-nowrap overflow-hidden text-ellipsis mr-4">
                                    Token: {generatedQR.qrToken}
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(generatedQR.qrToken);
                                        toast.success('Vector cached');
                                    }}
                                    className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm hover:scale-110 active:scale-90 transition-all border border-slate-100"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <a
                                    href={generatedQR.scanUrl}
                                    target="_blank"
                                    className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-100 text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Verify
                                </a>
                                <button
                                    className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-100"
                                    onClick={() => {
                                        // Placeholder for actual download logic
                                        toast.success('Initializing Neural Broadcast');
                                    }}
                                >
                                    <Download className="w-4 h-4" />
                                    Broadcast
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default QRToolsTab;
