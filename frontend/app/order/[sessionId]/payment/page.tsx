"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft, CreditCard, Wallet, Banknote,
  CheckCircle, Loader2, Receipt, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, formatDateTime } from '@/lib/utils';

interface BillSummary {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
}

interface TableSession {
  id: string;
  tableNumber: number;
  restaurantId: string;
  restaurantName: string;
  status: string;
  paymentStatus: string;
  billedAt?: string | null;
  frozenSubtotal?: number | null;
  frozenGstRate?: number | null;
  frozenGstAmount?: number | null;
  frozenDiscountAmount?: number | null;
  finalBillAmount?: number | null;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<TableSession | null>(null);
  const [bill, setBill] = useState<BillSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('upi');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    loadPaymentData();
  }, [sessionId]);

  const loadPaymentData = async () => {
    try {
      const [sessionRes, billData] = await Promise.all([
        apiClient.getTableSession(sessionId),
        apiClient.generateFinalBill(sessionId, {
          restaurantId: '',
          discountPercentage: 0,
          taxRate: 0
        })
      ]);

      const sessionData = (sessionRes as any).data.session;
      setSession(sessionData);

      // If already billed (frozen), use frozen values, otherwise use the live "preview" bill
      if (sessionData.billedAt) {
        setBill({
          subtotal: sessionData.frozenSubtotal || 0,
          discountAmount: sessionData.frozenDiscountAmount || 0,
          taxableAmount: (sessionData.frozenSubtotal || 0) - (sessionData.frozenDiscountAmount || 0),
          gstAmount: sessionData.frozenGstAmount || 0,
          grandTotal: sessionData.finalBillAmount || 0
        });
      } else {
        setBill(billData as any);
      }
    } catch (error: any) {
      console.error('Failed to load payment data:', error);
      toast.error(error.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bill || !session) return;

    if (paymentMethod !== 'cash' && !referenceNumber) {
      toast.error('Please enter transaction reference number');
      return;
    }

    try {
      setProcessing(true);

      await apiClient.recordSessionPayment(sessionId, {
        amount: bill.grandTotal,
        method: paymentMethod,
        referenceNumber: referenceNumber || undefined
      });

      setPaid(true);
      toast.success('Payment recorded successfully!');

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/restro/${session.restaurantId}`);
      }, 2000);

    } catch (error: any) {
      console.error('Payment failed:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Generating your bill...</p>
        </div>
      </div>
    );
  }

  if (!session || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load payment information</p>
          <button
            onClick={() => router.back()}
            className="text-red-600 hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">Thank you for dining with us</p>
          <div className="py-4 px-6 bg-gray-50 rounded-xl mb-6">
            <p className="text-sm text-gray-500 mb-1">Amount Paid</p>
            <p className="text-3xl font-bold text-gray-900">{formatPrice(bill.grandTotal)}</p>
          </div>
          <p className="text-sm text-gray-500">Redirecting you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Orders
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Payment</h1>
          <p className="text-gray-500">{session.restaurantName} - Table {session.tableNumber}</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Bill Summary */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-red-50 to-white border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Final Bill</h2>
                <p className="text-sm text-gray-500">Session #{sessionId.slice(-6)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium">{formatPrice(bill.subtotal)}</span>
            </div>

            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span className="font-medium">-{formatPrice(bill.discountAmount)}</span>
              </div>
            )}

            {bill.gstAmount > 0 && (
              <>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>Taxable Amount</span>
                  <span>{formatPrice(bill.taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST</span>
                  <span className="font-medium">{formatPrice(bill.gstAmount)}</span>
                </div>
              </>
            )}

            <div className="pt-3 border-t flex justify-between text-gray-900">
              <span className="text-lg font-bold">Grand Total</span>
              <span className="text-2xl font-bold">{formatPrice(bill.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-bold text-lg mb-4">Select Payment Method</h3>

          <div className="space-y-3">
            {/* UPI */}
            <button
              onClick={() => setPaymentMethod('upi')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'upi'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'upi' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">UPI / Digital Wallet</p>
                <p className="text-sm text-gray-500">GPay, PhonePe, Paytm, etc.</p>
              </div>
              {paymentMethod === 'upi' && (
                <CheckCircle className="w-6 h-6 text-red-600" />
              )}
            </button>

            {/* Card */}
            <button
              onClick={() => setPaymentMethod('card')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'card' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">Credit / Debit Card</p>
                <p className="text-sm text-gray-500">Visa, Mastercard, Rupay</p>
              </div>
              {paymentMethod === 'card' && (
                <CheckCircle className="w-6 h-6 text-red-600" />
              )}
            </button>

            {/* Cash */}
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash'
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
                }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                <Banknote className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900">Cash</p>
                <p className="text-sm text-gray-500">Pay at counter</p>
              </div>
              {paymentMethod === 'cash' && (
                <CheckCircle className="w-6 h-6 text-red-600" />
              )}
            </button>
          </div>

          {/* Reference Number Input (for non-cash) */}
          {paymentMethod !== 'cash' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter transaction ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={processing}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Confirm Payment of {formatPrice(bill.grandTotal)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
