"use client";

import { motion } from 'framer-motion';
import {
    Users,
    Shield,
    Search,
    Filter,
    MoreVertical,
    Mail,
    UserCheck,
    UserMinus,
    ArrowUpRight,
    Activity,
    Fingerprint
} from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

interface IdentityEngineTabProps {
    users: any[];
    onRefresh: () => void;
}

const IdentityEngineTab = ({ users, onRefresh }: IdentityEngineTabProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            setUpdatingUserId(userId);
            await apiClient.updateAdminUserRole(userId, newRole);
            toast.success(`Identity protocol updated: ${newRole.toUpperCase()}`);
            onRefresh();
        } catch (error) {
            toast.error('Identity reconfiguration failed');
        } finally {
            setUpdatingUserId(null);
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'company_admin': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            case 'restaurant': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            default: return 'bg-slate-50 text-slate-500 border-slate-100';
        }
    };

    return (
        <div className="space-y-6">
            {/* Telemetry Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-inner">
                        <Users className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Identities</p>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{users.length}</h4>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shadow-inner">
                        <Activity className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Velocity</p>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter">98.2%</h4>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4"
                >
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100 shadow-inner">
                        <Shield className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Privileged Access</p>
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter">
                            {users.filter(u => u.role === 'admin' || u.role === 'company_admin').length}
                        </h4>
                    </div>
                </motion.div>
            </div>

            {/* Control Ribbon */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-center gap-4"
            >
                <div className="relative w-full md:w-96">
                    <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="SEARCH IDENTITIES..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'admin', 'company_admin', 'restaurant', 'customer'].map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${roleFilter === role
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                                }`}
                        >
                            {role === 'all' ? 'All Units' : role.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Identities Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredUsers.map((user, idx) => (
                    <motion.div
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white p-5 rounded-3xl border border-slate-100 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 flex gap-2">
                            <div className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getRoleColor(user.role)}`}>
                                {user.role.replace('_', ' ')}
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    {user.image ? (
                                        <img src={user.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-slate-300">
                                            {user.name?.[0] || user.email[0].toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="text-[17px] font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
                                    {user.name || 'Anonymous Unit'}
                                    <ArrowUpRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h4>
                                <p className="text-[12px] font-bold text-slate-400 mt-1 flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" />
                                    {user.email}
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        Joined {format(new Date(user.createdAt), 'MMM yyyy')}
                                    </p>
                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        ID: {user.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleRoleUpdate(user.id, user.role === 'admin' ? 'customer' : 'admin')}
                                    disabled={updatingUserId === user.id}
                                    className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all disabled:opacity-50"
                                    title="Toggle Admin Protocol"
                                >
                                    <Shield className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleRoleUpdate(user.id, 'restaurant')}
                                    disabled={updatingUserId === user.id}
                                    className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                                    title="Assign Restaurant Auth"
                                >
                                    <Activity className="w-4 h-4" />
                                </button>
                            </div>

                            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">
                                <UserMinus className="w-3.5 h-3.5" />
                                Suspend Node
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default IdentityEngineTab;
