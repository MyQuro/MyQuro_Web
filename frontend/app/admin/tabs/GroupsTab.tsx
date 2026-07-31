"use client";

import { motion } from 'framer-motion';
import { Building2, Clock, Copy, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Company {
    id: string;
    name: string;
    ownerId: string;
    ownerEmail?: string;
    generatedPassword?: string;
    createdAt: string;
    restaurants: {
        id: string;
        name: string;
        status: string;
    }[];
}

interface CompanyInvitation {
    id: string;
    companyName: string;
    ownerEmail: string;
    status: 'pending' | 'completed' | 'expired';
    generatedPassword?: string;
    createdAt: string;
}

interface GroupsTabProps {
    companies: Company[];
    invitations: CompanyInvitation[];
    setShowInviteModal: (show: boolean) => void;
    setSelectedCompany: (company: Company | null) => void;
}

const GroupsTab = ({
    companies,
    invitations,
    setShowInviteModal,
    setSelectedCompany
}: GroupsTabProps) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Companies */}
            <div className="lg:col-span-2 space-y-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6"
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Networks</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">Managed brand collections</p>
                        </div>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-5 py-3 bg-indigo-600 text-white text-[12px] font-black rounded-xl hover:scale-105 transition-all duration-300 shadow-xl shadow-indigo-100 flex items-center gap-2 group"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            Provision New Group
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {companies.length === 0 ? (
                            <div className="col-span-2 text-center py-24 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                                <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                <p className="text-xl font-black text-slate-400 tracking-tight">Isolated Ecosystem</p>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Provision a group to start scaling</p>
                            </div>
                        ) : (
                            companies.map((company, i) => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={company.id}
                                    onClick={() => setSelectedCompany(company)}
                                    className="p-6 rounded-3xl border border-slate-100 bg-white hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-2 transition-all duration-500 cursor-pointer group relative overflow-hidden ring-1 ring-slate-100"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700 opacity-50" />

                                    <div className="flex items-start justify-between mb-6 relative z-10">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-100">
                                            {company.name[0]}
                                        </div>
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Brand Network</span>
                                    </div>

                                    <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors mb-2">{company.name}</h4>
                                    <p className="text-[12px] text-slate-400 font-bold leading-relaxed">
                                        Overseeing {company.restaurants?.length || 0} premium outlet{company.restaurants?.length === 1 ? '' : 's'} across the marketplace.
                                    </p>

                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Established {new Date(company.createdAt).getFullYear()}</span>
                                        <div className="flex -space-x-3">
                                            {(company.restaurants || []).slice(0, 4).map((r, i) => (
                                                <div
                                                    key={r.id}
                                                    className="w-10 h-10 rounded-xl border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-indigo-600 overflow-hidden hover:z-10 transition-transform hover:-translate-y-2 shadow-sm"
                                                    title={r.name}
                                                >
                                                    {r.name[0]}
                                                </div>
                                            ))}
                                            {(company.restaurants?.length || 0) > 4 && (
                                                <div className="w-10 h-10 rounded-xl border-4 border-white bg-slate-900 flex items-center justify-center text-[10px] font-black text-white hover:z-10 transition-transform hover:-translate-y-2 shadow-sm">
                                                    +{(company.restaurants?.length || 0) - 4}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Invitations Sidebar */}
            <div className="space-y-6">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6"
                >
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        Queued Access
                    </h3>
                    <div className="space-y-4">
                        {invitations.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No active requests</p>
                            </div>
                        ) : (
                            invitations.map((inv, i) => (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.1 + 0.5 }}
                                    key={inv.id}
                                    className={`p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${inv.status === 'completed' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-amber-50/30 border-amber-100'}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-[13px] font-black text-slate-900 tracking-tight">{inv.companyName}</p>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border bg-white ${inv.status === 'completed' ? 'text-emerald-500 border-emerald-100' : 'text-amber-500 border-amber-100'}`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase truncate mb-4">{inv.ownerEmail}</p>

                                    {inv.status === 'completed' && inv.generatedPassword && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="p-4 bg-white rounded-2xl border border-indigo-50 shadow-sm"
                                        >
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3">Login Credentials</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase">ID</span>
                                                    <span className="text-[11px] font-bold text-slate-600 italic truncate max-w-[120px]">{inv.ownerEmail}</span>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <span className="text-[10px] text-slate-300 font-bold uppercase">Secret</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono font-black text-indigo-600">{inv.generatedPassword}</span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(inv.generatedPassword!);
                                                                toast.success('Password copied');
                                                            }}
                                                            className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                                                        >
                                                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-black/5">
                                        <p className="text-[10px] font-black text-slate-300 uppercase">{new Date(inv.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default GroupsTab;
