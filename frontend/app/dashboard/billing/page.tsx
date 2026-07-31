"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { CreditCard, Printer, CheckCircle, DollarSign, Clock, AlertCircle, Banknote, Users, UtensilsCrossed, ShoppingBag, RefreshCw, Bluetooth, Usb, Wifi, Download, Utensils, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';
import { BillPrinter, type PrintOptions } from '@/lib/print-bill';
import { type BillData } from '@/lib/thermal-printer';
import { useWebSocket } from '@/lib/websocket-context';

interface OrderItem {
  id: string;//lol
  menuItemName: string;
  variantName: string;
  quantity: number;
  price: number;
  status: string;
  extras?: Array<{
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface ActiveSession {
  sessionId: string;
  tableNumber: number;
  startedAt: string;
  totalAmount: number;
  status: string;
  orders: OrderItem[];
}

interface PaymentRequest {
  sessionId: string;
  tableNumber: number;
  startedAt: string;
  billedAt: string;
  finalBillAmount: number;
  grandTotal: number;
  invoiceNumber: string;
  paymentStatus: string;
  status: string;
  frozenSubtotal: number;
  frozenGstRate: number;
  frozenGstAmount: number;
  subtotal?: number;
  gstRate?: number;
  gstAmount?: number;
}

interface PaymentFormData {
  method: 'cash' | 'upi' | 'card' | 'bank' | 'gateway';
  referenceNumber?: string;
  discountType: 'none' | 'percentage' | 'fixed';
  discountValue: number;
}

export default function BillingPage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const { socket, isConnected } = useWebSocket();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    method: 'cash',
    referenceNumber: '',
    discountType: 'none',
    discountValue: 0,
  });
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments'>('payments');
  const [printing, setPrinting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMethod, setPrintMethod] = useState<'auto' | 'thermal-bluetooth' | 'thermal-usb' | 'browser' | 'pdf'>('auto');
  const [billPreview, setBillPreview] = useState<BillData | null>(null);

  // Console logging for debugging
  console.log("💳 BILLING PAGE RENDER:", {
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    restaurant: restaurant ? { id: restaurant.id, name: restaurant.restaurantName } : null,
    dashboardLoading,
    hasRestaurant: !!restaurant,
    restaurantId: restaurant?.id,
    paymentRequestsCount: paymentRequests?.length || 0,
    loading,
    activeTab
  });

  useEffect(() => {
    console.log('🔄 useEffect triggered for restaurant:', restaurant?.id);
    if (restaurant?.id) {
      console.log('📡 Calling fetchData for restaurant:', restaurant.id);
      // Initial load only. Background refresh is manual via button.
      fetchData(true);
    } else {
      console.log('❌ No restaurant ID, skipping fetchData');
    }
  }, [restaurant?.id]);

  // WebSocket setup for real-time updates
  useEffect(() => {
    if (!restaurant || !socket || !isConnected) return;

    console.log('🔌 WebSocket enabled for real-time updates for billing');

    // Join restaurant room for real-time updates
    socket.emit('join-restaurant', restaurant.id);

    // Listen for payment updates
    const handlePaymentUpdate = (data: any) => {
      console.log('📡 Received payment update:', data);
      if (data.type === 'payment-completed') {
        // Remove the completed payment request from the list
        setPaymentRequests(prev => prev.filter(req => req.sessionId !== data.sessionId));
        toast.success(`Payment recorded for Table ${data.tableNumber || 'N/A'}`);
      }
    };

    // Listen for billing updates (new bill generated)
    const handleBillingUpdate = (data: any) => {
      console.log('📡 Received billing update:', data);
      if (data.type === 'bill-generated') {
        // Refresh the whole list to include the new request
        fetchData(false);
        toast(`New bill generated for Table ${data.tableSessionId.substring(0, 4)}...`, { icon: '🧾' });
      }
    };

    socket.on('payment-recorded', handlePaymentUpdate);
    socket.on('billing:updated', handleBillingUpdate);

    return () => {
      console.log('🧹 Cleaning up WebSocket listeners');
      socket.off('payment-recorded', handlePaymentUpdate);
      socket.off('billing:updated', handleBillingUpdate);
    };
  }, [restaurant, socket, isConnected]);

  // Loading check - wait for dashboard data to load
  if (dashboardLoading || !user || !restaurant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d5b263] mx-auto mb-4"></div>
          <p className="text-zinc-400 font-bold">Loading billing dashboard...</p>
        </div>
      </div>
    );
  }

  const fetchData = async (showLoader = false) => {
    console.log('📊 fetchData called with showLoader:', showLoader);
    try {
      if (showLoader) {
        console.log('⏳ Setting loading to true');
        setLoading(true);
      }
      console.log('🔄 Calling fetchPaymentRequests');
      await Promise.all([
        fetchPaymentRequests()
      ]);
      console.log('✅ fetchData completed successfully');
    } catch (error) {
      console.error('💥 fetchData failed:', error);
    } finally {
      if (showLoader) {
        console.log('⏳ Setting loading to false');
        setLoading(false);
      }
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/payment-requests/${restaurant!.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPaymentRequests(data.data);
        }
      } else {
        toast.error('Failed to load payment requests');
      }
    } catch (error) {
      console.error('Failed to fetch payment requests:', error);
      toast.error('Failed to load payment requests');
      // don't toggle global loading here; fetchData controls it
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData(false);
      toast.success('Refreshed');
    } catch (err) {
      // silent - fetchData already logs
    } finally {
      setRefreshing(false);
    }
  };

  const handlePrintBill = async () => {
    if (!selectedRequest) {
      toast.error('Please select a payment request to print');
      return;
    }

    try {
      setPrinting(true);
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';

      // Fetch complete session details including all items
      const sessionResponse = await fetch(
        `${BACKEND_URL}/api/sessions/${selectedRequest.sessionId}`,
        { credentials: 'include' }
      );

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch session details');
      }

      const sessionData = await sessionResponse.json();
      console.log('Session data received:', sessionData);

      if (!sessionData.success || !sessionData.data) {
        throw new Error('Invalid session data');
      }

      const session = sessionData.data.session;
      const orders = sessionData.data.orders || [];
      const summary = sessionData.data.summary || {};

      console.log('Parsed session data:', { session, orders, summary });

      // Use calculateFinalBreakdown so tax is computed on the DISCOUNTED amount
      const subtotalPaise = summary?.subtotal || selectedRequest.frozenSubtotal || selectedRequest.subtotal || 0;
      const gstRate = selectedRequest.frozenGstRate ?? selectedRequest.gstRate ?? (Number(restaurant?.defaultGstPercentage) || 0);

      // Existing discount from offers/coupons = (Subtotal + GST) - current due amount
      const gstAmountPaiseForExisting = Math.floor((subtotalPaise * gstRate) / 100);
      const grandTotalBeforeAnyDiscountPaise = subtotalPaise + gstAmountPaiseForExisting;
      const currentDuePaise = selectedRequest.finalBillAmount || selectedRequest.grandTotal || grandTotalBeforeAnyDiscountPaise;
      const existingDiscountPaise = Math.max(0, grandTotalBeforeAnyDiscountPaise - currentDuePaise);

      const breakdown = calculateFinalBreakdown(
        subtotalPaise,
        paymentForm.discountType,
        paymentForm.discountValue,
        gstRate,
        existingDiscountPaise
      );

      const subtotalRupees = breakdown.subtotal / 100;
      const discountRupees = breakdown.discount / 100;
      const taxableRupees = breakdown.taxable / 100;
      const gstRupees = breakdown.gst / 100;
      const grandTotalRupees = breakdown.grandTotal / 100;
      const halfGst = gstRupees / 2;

      // Prepare bill data for printing
      const billData: BillData = {
        restaurantName: session?.restaurantName || restaurant?.restaurantName || 'Restaurant',
        restaurantAddress: restaurant?.address || undefined,
        restaurantPhone: restaurant?.phone || undefined,
        fssaiLicenseNumber: restaurant?.fssaiLicenseNumber || undefined,
        invoiceNumber: selectedRequest.invoiceNumber || `INV-${selectedRequest.sessionId.substring(0, 8)}`,
        tableNumber: selectedRequest.tableNumber,
        date: new Date(selectedRequest.billedAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: new Date(selectedRequest.billedAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        items: orders.flatMap((order: any) =>
          order.items?.map((item: any) => ({
            name: item.menuItemName || 'Item',
            variant: item.variantName || undefined,
            quantity: item.quantity || 1,
            price: (item.unitPrice || 0) / 100,
            total: (item.totalPrice || 0) / 100,
            extras: item.extras || []
          })) || []
        ),
        subtotal: subtotalRupees,
        tax: gstRupees,
        cgst: halfGst,
        sgst: halfGst,
        taxPercentage: gstRate,
        taxableAmount: taxableRupees,
        discount: discountRupees,
        grandTotal: grandTotalRupees,
        paymentMethod: paymentForm.method,
        discountType: paymentForm.discountType !== 'none' ? paymentForm.discountType : undefined,
        discountValue: paymentForm.discountValue > 0 ? paymentForm.discountValue : undefined
      };

      console.log('Prepared bill data:', billData);

      // Store preview data
      setBillPreview(billData);

      // Initialize printer
      let printer: BillPrinter;
      try {
        printer = new BillPrinter(32); // 32 chars for 80mm paper
      } catch (error) {
        console.error('Failed to initialize printer:', error);
        throw new Error('Printer initialization failed');
      }

      // Print options based on selected method
      const printOptions: PrintOptions = {
        method: printMethod === 'auto' ? undefined : printMethod,
        paperWidth: 32
      };

      console.log('Starting print with options:', printOptions);

      // Attempt to print
      try {
        await printer.print(billData, printOptions);
        toast.success('Bill printed successfully!', {
          icon: '🖨️',
          duration: 3000
        });
      } catch (printError) {
        console.error('Print failed, falling back to PDF:', printError);
        // Fallback to PDF download
        try {
          printer.downloadPDF(billData);
          toast.success('Bill downloaded as PDF!', {
            icon: '📄',
            duration: 3000
          });
        } catch (pdfError) {
          console.error('PDF download also failed:', pdfError);
          // Final fallback: Browser print
          try {
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            if (printWindow) {
              const html = generatePreviewText(billPreview);
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Bill - Table ${selectedRequest.tableNumber}</title>
                    <style>
                      body { font-family: monospace; font-size: 12px; line-height: 1.4; margin: 20px; }
                      pre { white-space: pre-wrap; }
                    </style>
                  </head>
                  <body>
                    <pre>${html}</pre>
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
              toast.success('Bill sent to browser print!', {
                icon: '🖨️',
                duration: 3000
              });
            } else {
              toast.error('Printing failed completely. Check console for details.');
            }
          } catch (browserError) {
            console.error('Browser print also failed:', browserError);
            toast.error('Printing failed completely. Check console for details.');
          }
        }
      }

    } catch (error) {
      console.error('Print failed:', error);
      toast.error('Printing failed. Check console for details.');
    } finally {
      setPrinting(false);
      setShowPrintModal(false);
    }
  };

  // Quick preview generator
  const generatePreviewText = (bill: BillData | null): string => {
    if (!bill) return '';

    return `
${bill.restaurantName.toUpperCase()}
${bill.restaurantAddress || ''}
${bill.restaurantPhone ? `Tel: ${bill.restaurantPhone}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Invoice: ${bill.invoiceNumber}
Table: ${bill.tableNumber}
Date: ${bill.date}
Time: ${bill.time}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${bill.items.map(item =>
      `${item.name}${item.variant ? ` (${item.variant})` : ''}\n  ${item.quantity} × ${item.price} = ${item.total}`
    ).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: ${bill.grandTotal.toFixed(2)}
${bill.paymentMethod ? `Payment: ${bill.paymentMethod}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for dining with us!
    `;
  };

  const handleTestPrint = async () => {
    try {
      setPrinting(true);

      // Create test bill data
      const testBillData: BillData = {
        restaurantName: restaurant?.restaurantName || 'Test Restaurant',
        restaurantAddress: '123 Test Street, Test City',
        restaurantPhone: '+91-9876543210',
        fssaiLicenseNumber: restaurant?.fssaiLicenseNumber || undefined,
        invoiceNumber: 'TEST-001',
        tableNumber: 1,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        items: [
          { name: 'Chicken Biryani', variant: 'Full', quantity: 2, price: 250, total: 500 },
          { name: 'Butter Chicken', variant: undefined, quantity: 1, price: 300, total: 300 },
          { name: 'Jeera Rice', variant: undefined, quantity: 1, price: 80, total: 80 }
        ],
        subtotal: 880,
        tax: 70.4,
        discount: 0,
        grandTotal: 950.4,
        paymentMethod: 'Cash'
      };

      const printer = new BillPrinter(32);
      await printer.print(testBillData, { method: 'pdf' }); // Force PDF for testing

      toast.success('Test bill generated successfully!', {
        icon: '🧪',
        duration: 3000
      });
    } catch (error) {
      console.error('Test print failed:', error);
      toast.error('Test print failed');
    } finally {
      setPrinting(false);
    }
  };

  const calculateFinalBreakdown = (
    subtotalPaise: number,
    discountType: 'none' | 'percentage' | 'fixed',
    discountValue: number,
    gstRate: number,
    existingDiscountPaise: number = 0
  ) => {
    // 1. GST on full subtotal
    const gstAmountPaise = Math.floor((subtotalPaise * gstRate) / 100);
    const grandTotalBeforeDiscountPaise = subtotalPaise + gstAmountPaise;

    // 2. Existing discounts (offers, vouchers, earlier bill-level discounts)
    const baseExistingDiscount = Math.max(0, existingDiscountPaise || 0);

    // 3. New manual discount on Grand Total
    let manualDiscountPaise = 0;
    if (discountType === 'percentage') {
      manualDiscountPaise = Math.floor((grandTotalBeforeDiscountPaise * discountValue) / 100);
    } else if (discountType === 'fixed') {
      manualDiscountPaise = Math.round(discountValue * 100);
    }

    const totalDiscountPaise = baseExistingDiscount + manualDiscountPaise;
    const finalGrandTotalPaise = Math.max(0, grandTotalBeforeDiscountPaise - totalDiscountPaise);

    return {
      subtotal: subtotalPaise,
      // For UI/printing we expose both parts and the total
      existingDiscount: baseExistingDiscount,
      manualDiscount: manualDiscountPaise,
      discount: totalDiscountPaise,
      taxable: subtotalPaise, // Taxable base for GST is full subtotal
      gst: gstAmountPaise,
      grandTotalBeforeDiscount: grandTotalBeforeDiscountPaise,
      grandTotal: finalGrandTotalPaise,
      gstRate: gstRate
    };
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setRecordingPayment(true);
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';

      // Calculate final amount with discount
      // Note: selectedRequest amounts are in paise from backend, convert to rupees for calculation
      const originalAmountPaise = selectedRequest.finalBillAmount || selectedRequest.grandTotal;
      const originalAmountInRupees = originalAmountPaise / 100;

      const finalAmountInRupees = paymentForm.discountType !== 'none'
        ? calculateFinalBreakdown(selectedRequest.frozenSubtotal, paymentForm.discountType, paymentForm.discountValue, selectedRequest.frozenGstRate).grandTotal / 100
        : originalAmountInRupees;

      const response = await fetch(`${BACKEND_URL}/api/sessions/record-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: selectedRequest.sessionId,
          amount: finalAmountInRupees,
          originalAmount: originalAmountInRupees,
          method: paymentForm.method,
          referenceNumber: paymentForm.referenceNumber || null,
          discountType: paymentForm.discountType,
          discountValue: paymentForm.discountValue,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Payment recorded successfully!');
          setSelectedRequest(null);
          setPaymentForm({
            method: 'cash',
            referenceNumber: '',
            discountType: 'none',
            discountValue: 0,
          });
          await fetchData(); // Refresh the list
        } else {
          toast.error(data.message || 'Failed to record payment');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading && paymentRequests.length === 0) {
    return <div className="p-8 text-center">Loading billing info...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <Banknote className="w-10 h-10 text-[#d5b263]" />
          Billing
        </h1>
        <p className="text-sm font-medium text-zinc-450 mt-2">Print bills for any session and manage payments</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-bold transition-all rounded-xl border ${activeTab === 'payments'
            ? 'text-[#d5b263] bg-[#d5b263]/10 border-[#d5b263]/20 shadow-inner'
            : 'text-zinc-450 bg-zinc-900 border-zinc-900/40 hover:bg-zinc-800 hover:text-white'
            }`}
        >
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Bill Printing ({paymentRequests.length})
          </div>
        </button>
        <button
          onClick={handleTestPrint}
          disabled={printing}
          className="px-5 py-3 border border-zinc-900/40 bg-zinc-900 hover:bg-zinc-800 text-[#d5b263] hover:text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors ml-auto mr-2 shadow-sm"
          title="Test Bill Printing"
        >
          Test Print
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-3 bg-zinc-900 border border-zinc-900/40 rounded-xl shadow-sm transition-colors ${refreshing ? 'opacity-60 cursor-wait bg-zinc-800' : 'text-zinc-450 hover:text-white hover:bg-zinc-800'}`}
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 shadow-sm transition-all duration-300 relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Sessions Available</p>
                  <p className="text-4xl font-black text-white tracking-tight leading-none">{paymentRequests.length}</p>
                </div>
                <div className="w-14 h-14 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-2xl flex items-center justify-center text-[#d5b263] shadow-sm">
                  <Printer className="w-7 h-7" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 shadow-sm transition-all duration-300 relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Amount</p>
                  <p className="text-4xl font-black text-white tracking-tight leading-none">
                    {formatPrice(paymentRequests.reduce((sum, req) => sum + (req.finalBillAmount || req.grandTotal || 0), 0))}
                  </p>
                </div>
                <div className="w-14 h-14 bg-zinc-900 border border-zinc-850 rounded-2xl flex items-center justify-center text-white shadow-sm">
                  <DollarSign className="w-7 h-7" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 shadow-sm transition-all duration-300 relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Selected</p>
                  <p className="text-4xl font-black text-white tracking-tight leading-none">
                    {selectedRequest ? `T-${selectedRequest.tableNumber}` : 'None'}
                  </p>
                </div>
                <div className="w-14 h-14 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-2xl flex items-center justify-center text-[#d5b263] shadow-sm">
                  <CreditCard className="w-7 h-7" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sessions List */}
            <div className="xl:col-span-2 space-y-4">
              <h2 className="text-xl font-black tracking-tight text-white mb-4 px-2">Sessions for Bill Printing</h2>
              {paymentRequests.length === 0 ? (
                <div className="bg-zinc-900/10 p-12 rounded-[2rem] border-2 border-dashed border-zinc-800/60 text-center text-zinc-500">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-850">
                    <Printer className="w-10 h-10 text-[#d5b263]" />
                  </div>
                  <p className="text-lg font-black text-white tracking-tight">No Sessions Available</p>
                  <p className="text-sm font-medium mt-1">Start a session to begin printing bills.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentRequests.map(request => (
                    <div
                      key={request.sessionId}
                      onClick={() => setSelectedRequest(request)}
                      className={`bg-[#0c0c0e] rounded-[2rem] cursor-pointer transition-all duration-300 transform outline-none flex flex-col justify-between overflow-hidden group relative
                        ${selectedRequest?.sessionId === request.sessionId
                           ? 'ring-2 ring-[#d5b263] bg-[#d5b263]/5 scale-[1.02]'
                           : 'border border-zinc-900/40 shadow-sm hover:-translate-y-1'
                        }`}
                    >
                      {/* Ticket Header */}
                      <div className={`p-5 flex justify-between items-start transition-colors ${selectedRequest?.sessionId === request.sessionId ? 'bg-[#d5b263]/5' : 'bg-transparent'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm border
                            ${selectedRequest?.sessionId === request.sessionId
                              ? 'bg-[#d5b263] text-black border-[#d5b263]'
                              : 'bg-zinc-900 text-white border-zinc-850 group-hover:border-zinc-800'}`}>
                            T{request.tableNumber}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Table</p>
                            <h3 className="font-black text-lg text-white tracking-tight leading-none">#{request.tableNumber}</h3>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-black tracking-tight ${selectedRequest?.sessionId === request.sessionId ? 'text-[#d5b263]' : 'text-white'}`}>
                            {formatPrice(request.finalBillAmount || request.grandTotal || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Dashed Separator */}
                      <div className="relative h-px w-full">
                        <div className="absolute inset-0 border-t-2 border-dashed border-zinc-900/40"></div>
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-zinc-900/40"></div>
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border border-zinc-900/40"></div>
                      </div>

                      {/* Ticket Footer */}
                      <div className={`p-5 flex items-center justify-between mt-auto transition-colors ${selectedRequest?.sessionId === request.sessionId ? 'bg-[#d5b263]/5' : 'bg-zinc-950/20'}`}>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border
                          ${request.status === 'closed' && request.paymentStatus === 'paid'
                            ? 'text-emerald-450 bg-emerald-950/20 border-emerald-900/30'
                            : request.status === 'closed'
                              ? 'text-[#d5b263] bg-[#d5b263]/10 border-[#d5b263]/25'
                              : request.status === 'active'
                                ? 'text-zinc-400 bg-zinc-900 border-zinc-850'
                                : 'text-zinc-500 bg-zinc-900 border-zinc-850'
                          }`}>
                          {request.status === 'closed' && request.paymentStatus === 'paid' ? (
                            <>
                              <CheckCircle className="w-3 h-3" /> Paid
                            </>
                          ) : request.status === 'closed' ? (
                            <>
                              <AlertCircle className="w-3 h-3" /> Ready
                            </>
                          ) : request.status === 'active' ? (
                            <>
                              <Utensils className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> {request.status}
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {request.billedAt
                            ? new Date(request.billedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : new Date(request.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Recording Panel */}
            <div className="space-y-6">
              {selectedRequest ? (
                <div className="bg-[#0c0c0e] rounded-[2rem] border border-zinc-900/40 sticky top-6 animate-in slide-in-from-right-4 duration-300 overflow-hidden flex flex-col">
                  {/* Swiggy Style Ticket Header */}
                  <div className="bg-gradient-to-br from-zinc-900 to-black p-8 text-center text-white relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="w-16 h-16 bg-zinc-950/40 backdrop-blur-md border border-zinc-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-black shadow-lg">
                      T{selectedRequest.tableNumber}
                    </div>
                    <p className="text-4xl font-black tracking-tighter text-[#d5b263] mb-1">
                      {formatPrice(selectedRequest.finalBillAmount || selectedRequest.grandTotal)}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Amount Due</p>
                  </div>

                  {/* Dashed Separator */}
                  <div className="relative h-px w-full bg-transparent z-10">
                    <div className="absolute inset-0 border-t-2 border-dashed border-zinc-900/40"></div>
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full border-r border-zinc-900/40"></div>
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full border-l border-zinc-900/40"></div>
                  </div>

                  <form onSubmit={handleRecordPayment} className="p-6 space-y-5 bg-[#0c0c0e]">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        <Banknote className="w-3.5 h-3.5 inline mr-1 text-[#d5b263]" />
                        Expected Payment Method
                      </label>
                      <select
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })}
                        className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-900/45 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none font-bold text-white shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23d5b263%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em] bg-[right_1rem_center] bg-no-repeat transition-all"
                        required
                      >
                        <option value="cash" className="bg-[#0c0c0e]">💵 Cash Payment</option>
                        <option value="upi" className="bg-[#0c0c0e]">📱 UPI / QR</option>
                        <option value="card" className="bg-[#0c0c0e]">💳 Credit/Debit Card</option>
                        <option value="bank" className="bg-[#0c0c0e]">🏦 Bank Transfer</option>
                        <option value="gateway" className="bg-[#0c0c0e]">🌐 Payment Gateway</option>
                      </select>
                    </div>

                    {(paymentForm.method === 'upi' || paymentForm.method === 'bank' || paymentForm.method === 'gateway') && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                          <span>Reference Number</span>
                          <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-550">OPTIONAL</span>
                        </label>
                        <input
                          type="text"
                          value={paymentForm.referenceNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                          placeholder="Ex: TXN12345678"
                          className="w-full px-4 py-3.5 bg-zinc-950 border border-zinc-900/45 rounded-2xl focus:ring-2 focus:ring-[#d5b263] outline-none font-bold text-white shadow-sm transition-all"
                        />
                      </div>
                    )}

                    {/* Discount Section */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                        <span><Tag className="w-3.5 h-3.5 inline mr-1 text-[#d5b263]" />Apply Discount</span>
                        <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-550">OPTIONAL</span>
                      </label>

                      <div className="space-y-3 p-4 bg-zinc-950 border border-zinc-900/40 rounded-2xl shadow-inner">
                        <select
                          value={paymentForm.discountType}
                          onChange={(e) => setPaymentForm({
                            ...paymentForm,
                            discountType: e.target.value as any,
                            discountValue: e.target.value === 'none' ? 0 : paymentForm.discountValue
                          })}
                          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-[#d5b263] outline-none font-bold text-white shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23d5b263%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1em] bg-[right_1rem_center] bg-no-repeat transition-all"
                        >
                          <option value="none" className="bg-[#0c0c0e]">No Discount</option>
                          <option value="percentage" className="bg-[#0c0c0e]">Percentage (%)</option>
                          <option value="fixed" className="bg-[#0c0c0e]">Fixed Amount (₹)</option>
                        </select>

                        {paymentForm.discountType !== 'none' && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <input
                              type="number"
                              min="0"
                              step={paymentForm.discountType === 'percentage' ? '0.1' : '1'}
                              value={paymentForm.discountValue || ''}
                              onChange={(e) => setPaymentForm({
                                ...paymentForm,
                                discountValue: parseFloat(e.target.value) || 0
                              })}
                              placeholder={paymentForm.discountType === 'percentage' ? 'Amount in % (e.g., 10)' : 'Amount in ₹ (e.g., 50)'}
                              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-[#d5b263] outline-none font-bold text-white shadow-sm transition-all"
                            />
                          </div>
                        )}

                        {/* Discount Preview */}
                        {paymentForm.discountType !== 'none' && paymentForm.discountValue > 0 && selectedRequest.frozenSubtotal && (
                          (() => {
                            const subtotalPaise = selectedRequest.frozenSubtotal;
                            const gstRate = selectedRequest.frozenGstRate ?? (Number(restaurant?.defaultGstPercentage) || 0);
                            const gstAmountPaise = Math.floor((subtotalPaise * gstRate) / 100);
                            const grandTotalBeforeAnyDiscountPaise = subtotalPaise + gstAmountPaise;
                            const currentDuePaise = selectedRequest.finalBillAmount || selectedRequest.grandTotal || grandTotalBeforeAnyDiscountPaise;
                            const existingDiscountPaise = Math.max(0, grandTotalBeforeAnyDiscountPaise - currentDuePaise);

                            const breakdown = calculateFinalBreakdown(
                              subtotalPaise,
                              paymentForm.discountType,
                              paymentForm.discountValue,
                              gstRate,
                              existingDiscountPaise
                            );
                            return (
                              <div className="bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-xl p-4 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center text-sm mb-1.5">
                                  <span className="text-zinc-500 font-bold tracking-widest uppercase text-[10px]">Subtotal</span>
                                  <span className="text-white font-bold">
                                    {formatPrice(breakdown.subtotal)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-1.5">
                                  <span className="text-zinc-500 font-bold tracking-widest uppercase text-[10px]">GST ({breakdown.gstRate}%)</span>
                                  <span className="text-white font-bold">
                                    {formatPrice(breakdown.gst)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-1.5 border-t border-zinc-900 mt-1 pt-1.5">
                                  <span className="text-zinc-400 font-bold tracking-widest uppercase text-[10px]">Grand Total</span>
                                  <span className="text-white font-black">
                                    {formatPrice(breakdown.grandTotalBeforeDiscount)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-sm mb-2">
                                  <span className="text-red-500 font-extrabold tracking-widest uppercase text-[10px]">
                                    Discount {paymentForm.discountType === 'percentage' ? `(${paymentForm.discountValue}%)` : ''}
                                  </span>
                                  <span className="text-red-500 font-black">
                                    -{formatPrice(breakdown.discount)}
                                  </span>
                                </div>
                                <div className="border-t border-zinc-900 mt-2 pt-2 flex justify-between items-center">
                                  <span className="text-white font-black tracking-tight text-sm uppercase">Amount To Pay</span>
                                  <span className="text-[#d5b263] font-black text-xl tracking-tight">
                                    {formatPrice(breakdown.grandTotal)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={recordingPayment}
                      className="w-full py-4 bg-gradient-to-r from-[#d5b263] to-[#bfa052] text-black rounded-2xl font-black hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-50 mt-4 text-lg"
                    >
                      {recordingPayment ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {recordingPayment ? 'Processing...' : 'Mark as Paid'}
                    </button>
                  </form>

                  <div className="p-4 bg-zinc-950/20 border-t border-zinc-900/40 grid grid-cols-2 gap-3 mt-auto">
                    <button
                      type="button"
                      onClick={() => setShowPrintModal(true)}
                      disabled={printing}
                      className="col-span-1 py-3.5 bg-zinc-900 border border-zinc-900/40 text-[#d5b263] hover:text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Printer className="w-4 h-4" />
                      {printing ? 'Wait...' : 'Print Options'}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setPrintMethod('pdf');
                        await handlePrintBill();
                      }}
                      disabled={printing}
                      className="col-span-1 py-3.5 bg-zinc-900 border border-zinc-900/40 text-[#d5b263] hover:text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Quick PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/10 p-12 rounded-[2rem] border-2 border-dashed border-zinc-800/80 text-center text-zinc-500 h-full flex flex-col items-center justify-center min-h-[400px]">
                  <CreditCard className="w-16 h-16 mb-4 text-[#d5b263] mx-auto animate-pulse" strokeWidth={1} />
                  <p className="text-lg font-black tracking-tight text-white">No session selected</p>
                  <p className="text-sm mt-1 font-medium text-zinc-500">Select a table from the list to manage payments</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Method Selection Modal */}
      {showPrintModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="text-center relative">
              <button
                onClick={() => setShowPrintModal(false)}
                className="absolute right-0 top-0 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <AlertCircle className="w-4 h-4" /> {/* Fallback icon, replace with X if possible, using AlertCircle temporarily */}
              </button>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                <Printer className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Print Bill</h3>
              <p className="text-sm font-bold text-gray-500 mt-1 uppercase tracking-wider">Table {selectedRequest.tableNumber} • {formatPrice(selectedRequest.finalBillAmount || selectedRequest.grandTotal)}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setPrintMethod('auto'); handlePrintBill(); }}
                disabled={printing}
                className="w-full p-4 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Auto (Recommended)</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">Tries all methods automatically</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setPrintMethod('thermal-bluetooth'); handlePrintBill(); }}
                disabled={printing}
                className="w-full p-4 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Bluetooth className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Bluetooth Thermal</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">Connect to wireless printer</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setPrintMethod('thermal-usb'); handlePrintBill(); }}
                disabled={printing}
                className="w-full p-4 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Usb className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">USB Thermal</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">Connect via USB cable</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setPrintMethod('browser'); handlePrintBill(); }}
                disabled={printing}
                className="w-full p-4 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Standard Printer</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">Use system print dialog</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setPrintMethod('pdf'); handlePrintBill(); }}
                disabled={printing}
                className="w-full p-4 border-2 border-transparent bg-gray-50 rounded-2xl hover:border-blue-200 hover:bg-blue-50 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-sm group-hover:shadow-md transition-shadow">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Download PDF</div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">Save bill as PDF file</div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowPrintModal(false)}
              disabled={printing}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-black hover:bg-gray-200 transition-colors disabled:opacity-50 active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
