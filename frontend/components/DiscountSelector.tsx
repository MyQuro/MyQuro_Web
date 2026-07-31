"use client";

import { useState, useEffect } from 'react';
import { Tag, Sparkles, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Voucher {
  id: string;
  code: string;
  voucherType: string; // 'percentage' | 'fixed_amount' | 'free_item'
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  expiresAt: string | null;
  status: string;
}

interface Offer {
  id: string;
  name: string;
  description: string | null;
  offerType: string; // 'percentage' | 'fixed_amount' | 'free_item'
  discountPercentage: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
  targetAudience: string;
  showInCheckout: boolean;
}

interface AppliedDiscount {
  id: string;
  discountType: string;
  discountName: string;
  discountValue: number;
  discountSourceId: string;
}

interface DiscountSelectorProps {
  sessionId: string;
  restaurantId: string;
  orderTotal: number; // in paise
  onDiscountApplied: () => void;
}

export default function DiscountSelector({
  sessionId,
  restaurantId,
  orderTotal,
  onDiscountApplied
}: DiscountSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([]);
  const [loyaltyTier, setLoyaltyTier] = useState<string>('bronze');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadDiscounts();
  }, [sessionId, restaurantId]);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      
      // Load all discount data in parallel
      const [vouchersRes, sessionDiscountsRes, loyaltyRes] = await Promise.all([
        apiClient.getMyVouchers(restaurantId),
        apiClient.getSessionDiscounts(sessionId),
        apiClient.getLoyaltyStatus(restaurantId)
      ]);

      setVouchers((vouchersRes.data || []).map((voucher: any) => ({
        id: voucher.id,
        code: voucher.code,
        voucherType: voucher.voucherType,
        discountValue: voucher.discountValue,
        minOrderValue: voucher.minOrderValue || 0,
        maxDiscount: voucher.maxDiscount,
        expiresAt: voucher.expiresAt,
        status: voucher.status,
      })));
      setAppliedDiscounts((sessionDiscountsRes.data.appliedDiscounts || []).map((discount: any) => ({
        id: discount.id,
        discountType: discount.discountType,
        discountName: discount.discountName,
        discountValue: discount.discountValue,
        discountSourceId: discount.discountSourceId || '',
      })));
      setLoyaltyTier(loyaltyRes.loyalty?.tier || 'bronze');
      setLoyaltyPoints(loyaltyRes.loyalty?.points || 0);
      
      // Offers would come from the session discounts response
      // Filter to show only checkout-eligible offers
      setOffers([]); // TODO: Implement offers when backend provides them
    } catch (error) {
      console.error('Failed to load discounts:', error);
      toast.error('Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVoucher = async (voucherCode: string) => {
    try {
      setRedeeming(voucherCode);
      const result = await apiClient.redeemVoucher(sessionId, voucherCode);
      
      if (result.success) {
        toast.success('Voucher applied successfully!');
        await loadDiscounts();
        onDiscountApplied();
      } else {
        toast.error(result.message || 'Failed to apply voucher');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply voucher');
    } finally {
      setRedeeming(null);
    }
  };

  const handleRemoveDiscount = async (discountId: string) => {
    try {
      await apiClient.removeSessionDiscount(sessionId, discountId);
      toast.success('Discount removed');
      await loadDiscounts();
      onDiscountApplied();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove discount');
    }
  };

  const formatDiscount = (type: string, value: number, maxDiscount?: number | null) => {
    if (type === 'percentage') {
      const percentText = `${value}% OFF`;
      if (maxDiscount) {
        return `${percentText} (up to Rs ${(maxDiscount / 100).toFixed(0)})`;
      }
      return percentText;
    } else if (type === 'fixed_amount') {
      return `Rs ${(value / 100).toFixed(0)} OFF`;
    } else {
      return 'Free Item';
    }
  };

  const isVoucherEligible = (voucher: Voucher) => {
    return orderTotal >= voucher.minOrderValue;
  };

  if (loading) {
    return (
      <div className="border-t border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const hasDiscounts = vouchers.length > 0 || offers.length > 0 || appliedDiscounts.length > 0;

  if (!hasDiscounts) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#D32F2F]" />
          <h3 className="font-bold text-gray-900">Offers & Discounts</h3>
        </div>
        {loyaltyPoints > 0 && (
          <div className="text-xs bg-white px-2 py-1 rounded-full border border-gray-200">
            <span className="font-bold text-[#D32F2F]">{loyaltyPoints}</span> points • {loyaltyTier}
          </div>
        )}
      </div>

      {/* Applied Discounts */}
      {appliedDiscounts.length > 0 && (
        <div className="space-y-2 mb-4">
          {appliedDiscounts.map(discount => (
            <div key={discount.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-green-900 text-sm">{discount.discountName}</div>
                  <div className="text-xs text-green-700 mt-0.5">
                    Saving: Rs {(discount.discountValue / 100).toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemoveDiscount(discount.id)}
                className="ml-2 text-green-600 hover:text-green-800 p-1"
                aria-label="Remove discount"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Vouchers */}
      {vouchers.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-gray-600 uppercase mb-2">Your Vouchers</div>
          {vouchers.map(voucher => {
            const eligible = isVoucherEligible(voucher);
            const alreadyApplied = appliedDiscounts.some(d => d.discountSourceId === voucher.id);
            
            return (
              <div
                key={voucher.id}
                className={`border-2 rounded-lg p-3 transition-all ${
                  alreadyApplied 
                    ? 'bg-green-50 border-green-300' 
                    : eligible 
                      ? 'bg-white border-[#D32F2F] hover:shadow-md' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag size={14} className={eligible ? 'text-[#D32F2F]' : 'text-gray-400'} />
                      <span className="font-mono text-sm font-bold text-gray-900">{voucher.code}</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900 mb-1">
                      {formatDiscount(voucher.voucherType, voucher.discountValue, voucher.maxDiscount)}
                    </div>
                    {voucher.minOrderValue > 0 && (
                      <div className="text-xs text-gray-600">
                        Min order: Rs {(voucher.minOrderValue / 100).toFixed(0)}
                      </div>
                    )}
                    {!eligible && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                        <AlertCircle size={12} />
                        Add Rs {((voucher.minOrderValue - orderTotal) / 100).toFixed(0)} more
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRedeemVoucher(voucher.code)}
                    disabled={!eligible || alreadyApplied || redeeming === voucher.code}
                    className={`px-3 py-1.5 rounded-lg font-bold text-sm transition-colors ${
                      alreadyApplied
                        ? 'bg-green-600 text-white cursor-default'
                        : eligible
                          ? 'bg-[#D32F2F] text-white hover:bg-[#B71C1C]'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {redeeming === voucher.code ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : alreadyApplied ? (
                      'Applied'
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
