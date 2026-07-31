"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Plus, Users, Store, CheckCircle2, Clock, Mail, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";

export default function CompanyManagementPage() {
    const [invitations, setInvitations] = useState<any[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        companyName: "",
        ownerEmail: "",
        selectedRestaurantIds: [] as string[],
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invData, restData] = await Promise.all([
                apiClient.getCompanyInvitations(),
                apiClient.getRestaurants(),
            ]);
            setInvitations(invData.invitations);
            setRestaurants(restData.restaurants);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            toast.error("Failed to load invitations");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRestaurant = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            selectedRestaurantIds: prev.selectedRestaurantIds.includes(id)
                ? prev.selectedRestaurantIds.filter((rid) => rid !== id)
                : [...prev.selectedRestaurantIds, id],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.selectedRestaurantIds.length === 0) {
            toast.error("Please select at least one restaurant");
            return;
        }

        setSubmitting(true);
        try {
            await apiClient.createCompanyInvitation({
                companyName: formData.companyName,
                ownerEmail: formData.ownerEmail,
                restaurantIds: formData.selectedRestaurantIds,
            });
            toast.success("Invitation sent successfully");
            setIsModalOpen(false);
            setFormData({ companyName: "", ownerEmail: "", selectedRestaurantIds: [] });
            fetchData();
        } catch (error) {
            toast.error("Failed to send invitation");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Group Management</h1>
                        <p className="text-gray-500 font-medium">Create multi-restaurant hierarchies</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-200"
                >
                    <Plus size={20} strokeWidth={3} />
                    <span>NEW GROUP INVITE</span>
                </button>
            </div>

            {/* Invitations List */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                    </div>
                ) : invitations.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Groups Yet</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mb-8">
                            Start by inviting multiple restaurants to form a brand or company group.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {invitations.map((inv) => (
                            <div key={inv.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${inv.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                                        }`}>
                                        {inv.status}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{inv.companyName}</h3>
                                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                                    <Mail size={14} />
                                    <span>{inv.ownerEmail}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-xs text-gray-400 font-medium">{new Date(inv.createdAt).toLocaleDateString()}</span>
                                    <button className="text-red-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                        View Details
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Invitation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create Group Group</h2>
                                <p className="text-gray-500 font-medium">Invite restaurants to join a brand</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1 uppercase tracking-wider">Group / Brand Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-red-600/20 transition-all placeholder:text-gray-400"
                                        placeholder="e.g. Gourmet Hospitality"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 ml-1 uppercase tracking-wider">Group Admin Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.ownerEmail}
                                        onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                                        className="w-full bg-gray-50 border-0 rounded-2xl px-5 py-4 font-bold text-gray-900 focus:ring-2 focus:ring-red-600/20 transition-all placeholder:text-gray-400"
                                        placeholder="owner@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-gray-700 ml-1 uppercase tracking-wider">Select Restaurants</label>
                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                                        {formData.selectedRestaurantIds.length} SELECTED
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-3xl p-4 max-h-60 overflow-y-auto grid grid-cols-1 gap-2 border border-blue-50/50">
                                    {restaurants.map((rest) => (
                                        <button
                                            type="button"
                                            key={rest.id}
                                            onClick={() => handleToggleRestaurant(rest.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${formData.selectedRestaurantIds.includes(rest.id)
                                                    ? "bg-white border-red-600 shadow-md translate-x-1"
                                                    : "bg-transparent border-transparent hover:border-gray-200"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.selectedRestaurantIds.includes(rest.id) ? "bg-red-600 text-white" : "bg-gray-200 text-gray-400"
                                                    }`}>
                                                    <Store size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900 text-sm leading-tight">{rest.restaurantName}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{rest.city}</p>
                                                </div>
                                            </div>
                                            {formData.selectedRestaurantIds.includes(rest.id) && (
                                                <CheckCircle2 size={18} className="text-red-600 shadow-sm" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black transition-all active:scale-95"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Mail size={20} />
                                    )}
                                    SEND INVITATIONS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
