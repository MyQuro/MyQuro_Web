"use client";

import { useState, useEffect } from 'react';
import {
    Tag,
    Percent,
    ChevronRight,
    X,
    CheckCircle2,
    AlertCircle,
    Ticket,
    Loader2,
    BadgePercent,
    ChevronDown,
    Info,
    Gift
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Offer {
    id: string;
    name: string;
    description: string | null;
    offerType: string;
    discountValue: number;
    code: string | null;
    endDate: string;
    scope?: string;
    applicableCategoryId?: string | null;
}

interface AppliedOfferDiscount {
    id: string;
    discountType: string;
    discountName: string;
    discountValue: number;
    discountSourceId: string;
}

interface OffersPanelProps {
    sessionId: string;
    restaurantId: string;
    subtotalPaise: number;  // live cart subtotal in paise
    availableOffers: Offer[];  // pre-loaded from page
    appliedDiscounts: AppliedOfferDiscount[];
    onOffersChanged: () => void;  // reload applied discounts in parent
    liveTotalDiscountPaise?: number; // Optional: use parent's calculation for live preview
}


function getOfferLabel(offer: Offer): string {
    if (offer.offerType === 'percentage') return `${offer.discountValue}% OFF`;
    if (offer.offerType === 'flat_discount') return `₹${offer.discountValue} OFF`;
    if (offer.offerType === 'buy_1_get_1') return 'Buy 1 Get 1 Free';
    if (offer.offerType === 'category_discount') return `${offer.discountValue}% off category`;
    return `${offer.discountValue} OFF`;
}

function getOfferDescription(offer: Offer): string {
    if (offer.description) return offer.description;
    if (offer.offerType === 'percentage') return `Get ${offer.discountValue}% off on your order`;
    if (offer.offerType === 'flat_discount') return `Flat ₹${offer.discountValue} off on your order`;
    return '';
}

function getSavingsText(discountValuePaise: number): string {
    return `You saved ₹${(discountValuePaise / 100).toFixed(0)}`;
}

export default function OffersPanel({
    sessionId,
    restaurantId,
    subtotalPaise,
    availableOffers,
    appliedDiscounts,
    onOffersChanged,
    liveTotalDiscountPaise,
}: OffersPanelProps) {

    const [isOpen, setIsOpen] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [applyingCode, setApplyingCode] = useState(false);
    const [applyingOfferId, setApplyingOfferId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const appliedOffers = appliedDiscounts.filter(d => d.discountType === 'offer');
    // Use live calculation from parent if available, otherwise fallback to backend values
    const totalSaved = liveTotalDiscountPaise !== undefined 
        ? liveTotalDiscountPaise 
        : appliedOffers.reduce((sum, d) => sum + d.discountValue, 0);
    const hasApplied = appliedOffers.length > 0;


    const isOfferApplied = (offerId: string) =>
        appliedOffers.some(d => d.discountSourceId === offerId);

    const getAppliedDiscountId = (offerId: string) =>
        appliedOffers.find(d => d.discountSourceId === offerId)?.id;

    const handleApply = async (offerCode: string, offerId?: string) => {
        if (!offerCode.trim()) {
            toast.error('Please enter a valid offer code');
            return;
        }

        if (offerId) setApplyingOfferId(offerId);
        else setApplyingCode(true);

        try {
            const res = await apiClient.applyOffer(sessionId, {
                offerCode: offerCode.trim(),
                restaurantId,
                subtotalPaise,
            });

            if (res.success) {
                toast.success(res.message || 'Offer applied! 🎉', {
                    style: { background: '#16a34a', color: '#fff', fontWeight: 700 }
                });
                setCodeInput('');
                onOffersChanged();
                // Close drawer on success if it was a manual code or from list
                setTimeout(() => setIsOpen(false), 500);
            } else {
                toast.error((res as any).message || 'Failed to apply offer');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to apply offer');
        } finally {
            setApplyingOfferId(null);
            setApplyingCode(false);
        }
    };

    const handleRemove = async (discountId: string) => {
        setRemovingId(discountId);
        try {
            const res = await apiClient.removeOffer(sessionId, discountId);
            if (res.success) {
                toast.success('Offer removed');
                onOffersChanged();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove offer');
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="mb-6">
            {/* --- Premium Entry Bar (Dark Glassmorphism) --- */}
            <button
                onClick={() => setIsOpen(true)}
                className={`w-full relative group overflow-hidden flex items-center justify-between p-4 rounded-[20px] transition-all duration-300 border ${hasApplied
                    ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.2)]'
                    : 'bg-[#0c0c0e] border-white/5 hover:border-[#d5b263]/30 shadow-lg active:scale-[0.98]'
                    }`}
            >
                {/* Shimmer Effect */}
                {!hasApplied && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                )}
                <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all shadow-inner ${hasApplied 
                      ? 'bg-emerald-500/20 border border-emerald-500/30' 
                      : 'bg-[#16161a] border border-white/10 group-hover:border-[#d5b263]/30'
                        }`}>
                        {hasApplied ? (
                            <CheckCircle2 size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-in zoom-in duration-300" />
                        ) : (
                            <Percent size={22} className="text-[#d5b263] drop-shadow-[0_0_8px_rgba(213,178,99,0.3)]" />
                        )}
                    </div>
                    <div className="text-left">
                        <h4 className={`text-[15px] font-black leading-tight tracking-tight ${hasApplied ? 'text-emerald-400' : 'text-white'}`}>
                            {hasApplied ? 'Offer Applied!' : 'Apply Coupon'}
                        </h4>
                        <p className={`text-[12px] font-bold mt-0.5 ${hasApplied ? 'text-emerald-500/80' : 'text-zinc-400'}`}>
                            {hasApplied ? getSavingsText(totalSaved) : 'Save more with available offers'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 relative z-10 shadow-inner">
                    <span className={`text-[11px] font-black tracking-wider uppercase ${hasApplied ? 'text-emerald-400' : 'text-[#d5b263]'}`}>
                        {hasApplied ? 'EDIT' : 'VIEW'}
                    </span>
                    <ChevronRight size={14} strokeWidth={3} className={hasApplied ? 'text-emerald-400' : 'text-[#d5b263]'} />
                </div>
            </button>

            {/* --- Full Screen Drawer / Bottom Sheet --- */}
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-500" onClick={() => setIsOpen(false)}>
                    <div
                        className="bg-[#050506] border border-white/10 w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[32px] h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="relative p-6 pt-8 bg-gradient-to-br from-[#0c0c0e] to-[#050506] border-b border-white/5 flex flex-col items-center shrink-0">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <div className="absolute top-3 w-12 h-1.5 bg-zinc-800 rounded-full sm:hidden" />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute right-6 top-6 p-2.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>

                            <div className="w-16 h-16 bg-gradient-to-br from-[#d5b263]/20 to-[#d5b263]/5 rounded-[20px] flex items-center justify-center mb-4 border border-[#d5b263]/20 shadow-inner">
                                <Ticket size={32} className="text-[#d5b263] drop-shadow-[0_0_12px_rgba(213,178,99,0.5)]" />
                            </div>
                            <h2 className="text-[26px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-400 tracking-tight leading-none drop-shadow-sm">Coupons & Offers</h2>
                            <p className="text-zinc-400 font-bold text-[13px] mt-2">Unlock sweet savings on your meal!</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide bg-[#050506]">
                            {/* Manual Entry Section */}
                            <div className="space-y-3">
                                <p className="text-[11px] font-black text-[#d5b263] uppercase tracking-widest pl-1">Apply manually</p>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={codeInput}
                                        onChange={e => setCodeInput(e.target.value.toUpperCase())}
                                        placeholder="ENTER COUPON CODE"
                                        className="w-full h-14 pl-6 pr-24 bg-[#0c0c0e] border border-white/10 rounded-[16px] text-[15px] font-black tracking-wider text-white placeholder-zinc-600 focus:outline-none focus:border-[#d5b263]/50 focus:ring-4 focus:ring-[#d5b263]/10 transition-all shadow-inner uppercase"
                                    />
                                    <button
                                        onClick={() => handleApply(codeInput)}
                                        disabled={!codeInput.trim() || applyingCode}
                                        className="absolute right-2 top-2 bottom-2 px-6 bg-[#d5b263] text-black font-black text-[13px] rounded-xl hover:bg-[#c4a152] disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shadow-lg active:scale-95 flex items-center justify-center min-w-[80px]"
                                    >
                                        {applyingCode ? <Loader2 size={18} className="animate-spin" /> : 'APPLY'}
                                    </button>
                                </div>
                            </div>

                            {/* Available Offers List */}
                            <div className="space-y-4 pb-8">
                                <div className="flex items-center justify-between pl-1">
                                    <p className="text-[11px] font-black text-[#d5b263] uppercase tracking-widest">Available Offers</p>
                                    <span className="text-[10px] font-bold text-black bg-[#d5b263] px-2 py-0.5 rounded-md shadow-sm">
                                        {availableOffers.length} For You
                                    </span>
                                </div>

                                {availableOffers.length === 0 ? (
                                    <div className="bg-[#0c0c0e] rounded-[24px] border border-white/5 p-8 flex flex-col items-center text-center shadow-xl">
                                        <Gift size={48} className="text-zinc-700 mb-4" />
                                        <p className="text-zinc-400 font-bold">No offers available right now.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-5">
                                        {availableOffers.map((offer) => {
                                            const applied = isOfferApplied(offer.id);
                                            const appliedId = getAppliedDiscountId(offer.id);
                                            const isProcessing = applyingOfferId === offer.id || removingId === appliedId;

                                            return (
                                                <div
                                                    key={offer.id}
                                                    className={`group relative bg-[#0c0c0e] rounded-[24px] p-5 border transition-all duration-300 shadow-xl overflow-hidden ${applied
                                                        ? 'border-emerald-500/50 shadow-[0_8px_32px_-8px_rgba(16,185,129,0.2)]'
                                                        : 'border-white/5 hover:border-[#d5b263]/30'
                                                        }`}
                                                >
                                                    {/* Background Glow */}
                                                    {applied && (
                                                      <div className="absolute inset-0 bg-emerald-500/5 blur-xl"></div>
                                                    )}

                                                    {/* Corner Tag */}
                                                    <div className={`absolute top-0 right-6 px-3 py-1 pb-1.5 rounded-b-xl text-[10px] font-black text-black z-10 shadow-md ${applied ? 'bg-emerald-400' : 'bg-[#d5b263]'
                                                        }`}>
                                                        {offer.offerType === 'percentage' ? 'SAVINGS' : 'FLAT'}
                                                    </div>

                                                    <div className="flex gap-4 relative z-10">
                                                        {/* Visual Icon */}
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner border ${applied 
                                                          ? 'bg-emerald-500/20 border-emerald-500/30' 
                                                          : 'bg-[#16161a] border-white/10 group-hover:border-[#d5b263]/30'
                                                            }`}>
                                                            {applied ? (
                                                                <CheckCircle2 size={24} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                                            ) : (
                                                                <Percent size={24} className="text-[#d5b263] drop-shadow-[0_0_8px_rgba(213,178,99,0.3)]" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0 pr-12">
                                                            <h3 className="text-[17px] font-black text-white leading-tight tracking-tight">
                                                                {getOfferLabel(offer)}
                                                            </h3>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border border-dashed tracking-wider ${applied ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/20 text-[#d5b263]'
                                                                    }`}>
                                                                    {offer.code || 'AUTO'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[12px] text-zinc-400 font-bold mt-3 leading-snug pr-2">
                                                                {getOfferDescription(offer)}
                                                            </p>

                                                            <button className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 mt-4 hover:text-zinc-300 transition-colors uppercase tracking-widest">
                                                                <Info size={14} />
                                                                View Details & T&C
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Action Overlay/Button */}
                                                    <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between relative z-10">
                                                        <div className="flex -space-x-2">
                                                            {[1, 2, 3].map(i => (
                                                                <div key={i} className={`w-7 h-7 rounded-full border-2 border-[#0c0c0e] flex items-center justify-center ${applied ? 'bg-emerald-950 text-emerald-400' : 'bg-[#16161a] text-[#d5b263]'
                                                                    }`}>
                                                                    <Tag size={12} />
                                                                </div>
                                                            ))}
                                                            <span className="pl-4 text-[10px] font-bold text-zinc-500 self-center tracking-wider uppercase">100+ applied</span>
                                                        </div>

                                                        {applied ? (
                                                            <button
                                                                onClick={() => appliedId && handleRemove(appliedId)}
                                                                disabled={isProcessing}
                                                                className="px-6 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black text-[13px] rounded-[14px] hover:bg-rose-500/20 transition-all active:scale-95 disabled:opacity-50 tracking-wider shadow-inner"
                                                            >
                                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'REMOVE'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => offer.code && handleApply(offer.code, offer.id)}
                                                                disabled={!offer.code || isProcessing}
                                                                className="px-8 py-2.5 bg-[#d5b263] text-black font-black text-[13px] rounded-[14px] hover:bg-[#c4a152] transition-all active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-500 tracking-wider shadow-lg"
                                                            >
                                                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'APPLY'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Footer Info */}
                        <div className="p-5 bg-gradient-to-br from-[#0c0c0e] to-[#050506] border-t border-white/5 flex items-center gap-4 shrink-0 relative z-20">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner">
                                <BadgePercent size={24} className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                            </div>
                            <div>
                                <p className="text-[14px] font-black text-white tracking-tight">Guaranteed Savings</p>
                                <p className="text-[11px] font-bold text-zinc-400 mt-0.5">All coupons are verified and active</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
        </div>
    );
}
