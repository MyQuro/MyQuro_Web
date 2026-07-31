import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface OrderDetail {
  session: {
    sessionId: string;
    restaurantId: string;
    restaurantName: string;
    restaurantLogo: string | null;
    restaurantBanner: string | null;
    restaurantCity: string;
    restaurantAddress: string;
    restaurantFssai?: string | null;
    tableNumber: string;
    startedAt: string;
    closedAt: string | null;
    billedAt: string | null;
    paymentStatus: string;
    finalBillAmount: number;
    grandTotal: number;
    subtotal: number;
    discountAmount: number;
    gstAmount: number;
    status: string;
    createdByUserId: string;
    creatorName: string | null;
    creatorEmail: string;
    creatorImage: string | null;
  };
  items: Array<{
    orderItemId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes: string | null;
    status: string;
    itemName: string;
    itemDescription: string | null;
    itemImage: string | null;
    isVeg: boolean;
    variantName: string | null;
    variantSize: string | null;
    extras: Array<{
      extraId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
  payments: Array<{
    id: string;
    tableSessionId: string;
    amount: number;
    method: string;
    status: string;
    transactionId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  discounts: Array<{
    id: string;
    sessionId: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    voucherId: string | null;
    createdAt: string;
  }>;
}

export const generateInvoicePDF = async (orderData: OrderDetail): Promise<void> => {
  const { session, items, payments, discounts } = orderData;

  // Create new PDF document
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = 20;

  // --- Design Tokens ---
  const colors = {
    primary: [211, 47, 47],    // MyQuro Red
    textDark: [33, 37, 41],    // Dark Gray/Black
    textGray: [108, 117, 125], // Muted Gray
    lightBg: [248, 249, 250],  // Lightest Gray
    border: [222, 226, 230],   // Border Gray
    success: [40, 167, 69]     // Success Green
  };

  // --- Helper function: Format Currency ---
  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // --- Helper function: Format Date ---
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- Helper function: Add Text with Word Wrap ---
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, fontStyle: string = 'normal') => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + (lines.length * (fontSize * 0.45));
  };

  // --- 1. Top Ribbon & Branding ---
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(0, 0, pageWidth, 4, 'F');
  yPosition = 15;

  // MyQuro Brand
  pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text('MyQuro', margin, yPosition);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
  pdf.text('Modern Restaurant Management', margin, yPosition + 4.5);

  // INVOICE Title
  pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text('INVOICE', pageWidth - margin - 50, yPosition + 4);

  yPosition += 25;

  // --- 2. Information Grid (2 Columns) ---
  const col1X = margin;
  const col2X = pageWidth / 2 + 5;
  const initialGridY = yPosition;

  // Restaurant Logo (Top Right of Info Grid)
  if (session.restaurantLogo) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = session.restaurantLogo;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 2000);
      });
      pdf.addImage(img, 'PNG', pageWidth - margin - 25, initialGridY - 5, 25, 25);
    } catch (e) { /* skip logo silently if error */ }
  }

  // Column 1: Restaurant Info
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
  pdf.text('BILLED BY', col1X, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
  pdf.text(session.restaurantName, col1X, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
  yPosition = addWrappedText(`${session.restaurantAddress}, ${session.restaurantCity}`, col1X, yPosition, 75, 9);

  if ((session as any).restaurantFssai) {
    pdf.setFont('helvetica', 'bold');
    yPosition += 2;
    pdf.text(`FSSAI: ${(session as any).restaurantFssai}`, col1X, yPosition);
    yPosition += 6;
  }

  // Column 2: Order Details
  let grid2Y = initialGridY;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
  pdf.text('ORDER DETAILS', col2X, grid2Y);
  grid2Y += 6;

  const orderInfo = [
    ['Order ID', session.sessionId.slice(-12).toUpperCase()],
    ['Table', `Table ${session.tableNumber}`],
    ['Date', formatDate(session.closedAt || session.startedAt)],
    ['Time', formatTime(session.startedAt)],
    ['Status', session.paymentStatus.toUpperCase()],
  ];

  orderInfo.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
    pdf.text(label, col2X, grid2Y);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
    pdf.text(value, pageWidth - margin - (session.restaurantLogo ? 30 : 0), grid2Y, { align: 'right' });
    grid2Y += 5;
  });

  yPosition = Math.max(yPosition, grid2Y) + 15;

  // --- 3. Items Table ---
  pdf.setFillColor(colors.lightBg[0], colors.lightBg[1], colors.lightBg[2]);
  pdf.rect(margin, yPosition - 6, contentWidth, 10, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
  pdf.text('ITEM DESCRIPTION', margin + 5, yPosition);
  pdf.text('QTY', 110, yPosition, { align: 'center' });
  pdf.text('PRICE', 145, yPosition, { align: 'right' });
  pdf.text('TOTAL', pageWidth - margin - 5, yPosition, { align: 'right' });

  yPosition += 8;

  // Item Rows
  items.forEach((item, index) => {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    // Alternating background for rows
    if (index % 2 === 0) {
      pdf.setFillColor(252, 252, 252);
      pdf.rect(margin, yPosition - 5, contentWidth, 12, 'F');
    }

    const itemName = item.variantName ? `${item.itemName} (${item.variantName})` : item.itemName;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

    const tempY = yPosition;
    yPosition = addWrappedText(itemName, margin + 5, yPosition, 75, 9, 'bold');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(item.quantity.toString(), 110, tempY, { align: 'center' });
    pdf.text(formatCurrency(item.unitPrice), 145, tempY, { align: 'right' });
    pdf.text(formatCurrency(item.totalPrice), pageWidth - margin - 5, tempY, { align: 'right' });

    // Extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(extra => {
        pdf.setFontSize(8);
        pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
        pdf.text(`+ ${extra.name} x${extra.quantity}`, margin + 8, yPosition);
        pdf.text(formatCurrency(extra.totalPrice), pageWidth - margin - 5, yPosition, { align: 'right' });
        yPosition += 4.5;
      });
    }

    // Notes
    if (item.notes) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
      yPosition = addWrappedText(`Note: ${item.notes}`, margin + 10, yPosition + 1, 70, 8, 'italic');
    }

    // Row separator (subtle)
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setLineWidth(0.1);
    pdf.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 8;
  });

  // --- 4. Summary ---
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = 20;
  }

  yPosition += 5;
  const summaryX = pageWidth - margin - 80;

  const summaryRows = [
    ['Subtotal', formatCurrency(session.subtotal)],
    ['Platform Charges', '0.00'],
  ];

  if (session.discountAmount > 0) {
    summaryRows.push(['Discount', `-${formatCurrency(session.discountAmount)}`]);
  }

  if (session.gstAmount > 0) {
    summaryRows.push(['GST & Taxes', formatCurrency(session.gstAmount)]);
  }

  summaryRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
    pdf.text(label, summaryX, yPosition);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
    pdf.text(value, pageWidth - margin - 5, yPosition, { align: 'right' });
    yPosition += 6;
  });

  // Grand Total Highlight
  pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.rect(summaryX - 5, yPosition, 85, 12, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL AMOUNT', summaryX, yPosition + 7.5);
  pdf.text(`INR ${formatCurrency(session.finalBillAmount)}`, pageWidth - margin - 5, yPosition + 7.5, { align: 'right' });

  yPosition += 25;

  // --- 5. QR Code & Payment ---
  const initialBottomY = yPosition;

  // QR Code (Simulated)
  const qrSize = 25;
  pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  pdf.rect(margin, yPosition, qrSize, qrSize, 'S');

  // Placeholder QR design
  pdf.setFillColor(0, 0, 0);
  pdf.rect(margin + 2, yPosition + 2, 4, 4, 'F');
  pdf.rect(margin + qrSize - 6, yPosition + 2, 4, 4, 'F');
  pdf.rect(margin + 2, yPosition + qrSize - 6, 4, 4, 'F');

  pdf.setFontSize(6);
  pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
  pdf.text('SCAN TO VIEW', margin, yPosition + qrSize + 4);
  pdf.text('DIGITAL RECEIPT', margin, yPosition + qrSize + 7);

  // Payment Details
  if (payments.length > 0) {
    let payY = initialBottomY;
    pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT DETAILS', margin + qrSize + 10, payY);
    payY += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    payments.forEach(p => {
      pdf.text(`${p.method.toUpperCase()} • ${formatDate(p.createdAt)}`, margin + qrSize + 10, payY);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`INR ${formatCurrency(p.amount)}`, pageWidth - margin, payY, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      payY += 5;
    });
  }

  // Final Footer
  yPosition = pageHeight - margin - 15;
  pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
  pdf.text('Thank you for dining with us!', pageWidth / 2, yPosition, { align: 'center' });

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(colors.textGray[0], colors.textGray[1], colors.textGray[2]);
  pdf.text('This is a computer-generated invoice. No signature required.', pageWidth / 2, yPosition + 5, { align: 'center' });

  pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Powered by MyQuro.com', pageWidth / 2, yPosition + 11, { align: 'center' });

  // Save the PDF
  const safeRestroName = session.restaurantName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  pdf.save(`Invoice-${safeRestroName}-${session.sessionId.slice(-6)}.pdf`);
};