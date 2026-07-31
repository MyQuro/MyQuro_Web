// Bill Printing System - Enhanced & Safe Layout

import { ThermalPrinter, type BillData } from './thermal-printer';
import jsPDF from 'jspdf';

export interface PrintOptions {
  method?: 'thermal-bluetooth' | 'thermal-usb' | 'thermal-network' | 'browser' | 'pdf';
  printerIP?: string;
  printerPort?: number;
  paperWidth?: number;
}

export class BillPrinter {
  private thermal: ThermalPrinter;

  constructor(paperWidth: number = 32) {
    this.thermal = new ThermalPrinter(paperWidth);
  }

  private formatNumber(n: number): string {
    // Produce ASCII-only formatted number with 2 decimals and grouping commas.
    // Avoids locale quirks and non-ASCII glyphs that some thermal printers mis-render.
    const value = Number(n || 0);
    const fixed = value.toFixed(2); // ensures two decimals
    const parts = fixed.split('.');
    let intPart = parts[0];
    const decPart = parts[1] || '00';

    // Insert grouping commas (thousands) using plain ASCII comma
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Ensure result contains only ASCII printable characters
    const out = `${intPart}.${decPart}`;
    return out.replace(/[^\x20-\x7E]/g, '');
  }

  /* =====================================================
     MAIN PRINT METHOD (AUTO FALLBACK)                    
  ===================================================== */
  async print(billData: BillData, options: PrintOptions = {}): Promise<void> {
    const method = options.method || 'auto';

    try {
      if (method === 'thermal-bluetooth' || method === 'auto') {
        try { await this.thermal.printViaBluetooth(billData); return; } catch { }
      }

      if (method === 'thermal-usb' || method === 'auto') {
        try { await this.thermal.printViaUSB(billData); return; } catch { }
      }

      if (method === 'thermal-network' || method === 'auto') {
        if (options.printerIP) {
          try {
            await this.thermal.printViaNetwork(
              billData,
              options.printerIP,
              options.printerPort
            );
            return;
          } catch { }
        }
      }

      if (method === 'browser' || method === 'auto') {
        try { await this.printViaBrowser(billData); return; } catch { }
      }

      this.downloadPDF(billData);
    } catch {
      this.downloadPDF(billData);
    }
  }

  /* =====================================================
     BROWSER PRINT
  ===================================================== */
  private printViaBrowser(billData: BillData): Promise<void> {
    return new Promise((resolve, reject) => {
      const win = window.open('', '_blank', 'width=400,height=700');
      if (!win) return reject();

      win.document.write(this.generateHTML(billData));
      win.document.close();

      win.onload = () => {
        win.focus();
        win.print();
        setTimeout(() => {
          win.close();
          resolve();
        }, 200);
      };
    });
  }

  /* =====================================================
     HTML RECEIPT (SAFE & CLEAN)
  ===================================================== */
  private generateHTML(data: BillData): string {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Bill ${data.invoiceNumber}</title>
<style>
@page { size: 80mm auto; margin: 0; }
body {
  width: 80mm;
  margin: 0 auto;
  padding: 12mm 10mm;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.5;
}
h1 {
  text-align: center;
  font-size: 18px;
  margin: 0;
}
.center { text-align: center; }
hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }

table {
  width: 100%;
  border-collapse: collapse;
}
th {
  text-align: left;
  border-bottom: 1px solid #000;
}
td {
  vertical-align: top;
  padding: 2px 0;
  word-break: break-word;
}

.right { text-align: right; }
.bold { font-weight: bold; }
.total {
  font-size: 14px;
  font-weight: bold;
  border-top: 2px solid #000;
}
</style>
</head>

<body>

<body>

${data.isKOT ? `
<h1 style="margin-bottom: 15px; font-size: 22px;">*** KOT ***</h1>
` : `
<h1>${data.restaurantName}</h1>
<div class="center">${data.restaurantAddress || ''}</div>
<div class="center">Phone Number: ${data.restaurantPhone || ''}</div>
${data.gstin ? `<div class="center">GSTIN: ${data.gstin}</div>` : ''}
${data.fssaiLicenseNumber ? `<div class="center">FSSAI: ${data.fssaiLicenseNumber}</div>` : ''}
<div class="center">(Veg & Non-Veg)</div>
<hr />
<div class="center bold">Tax Invoice</div>
<hr />
`}

${!data.isKOT ? `
<div>Order Number : <b>${data.orderNumber || '-'}</b></div>
<div>Invoice Number : <b>${data.invoiceNumber || '-'}</b></div>
<div>Category : <b>${data.orderType || '-'}</b></div>
<div>Employee : <b>${data.cashierName || 'Cashier'}</b></div>
` : `
<div>KOT : <b>${data.invoiceNumber || '-'}</b></div>
`}

<div>${data.isKOT ? 'Table' : 'Date & Time'} : <b>${data.isKOT ? data.tableNumber : `${data.date}, ${data.time}`}</b></div>
${data.isKOT ? `<div>${data.date} ${data.time}</div>` : ''}

<hr />

<table>
<thead>
<tr>
  <th>ITEM NAME</th>
  ${!data.isKOT ? '<th class="right">PRICE</th>' : ''}
  <th class="right">QTY</th>
  ${!data.isKOT ? '<th class="right">AMT</th>' : ''}
</tr>
</thead>
  <tbody>
${data.items.map(i => `
<tr>
  <td>${i.name.toUpperCase()}${i.variant ? `<br><small>(${i.variant})</small>` : ''}${i.extras && i.extras.length > 0 ? `<br><small class="text-blue-600">${i.extras.map(e => `+ ${e.quantity}x ${e.name}`).join(', ')}</small>` : ''}</td>
  ${!data.isKOT ? `<td class="right">${this.formatNumber(i.price || 0)}</td>` : ''}
  <td class="right">${i.quantity}</td>
  ${!data.isKOT ? `<td class="right">${this.formatNumber(i.total)}</td>` : ''}
</tr>
`).join('')}
</tbody>
</table>

<hr />

${data.notes ? `
<div class="bold">NOTES:</div>
<div>${data.notes}</div>
<hr />
` : ''}

${!data.isKOT ? `
<table>
<tr><td class="right">Subtotal: </td><td class="right bold">INR ${this.formatNumber(data.subtotal)}</td></tr>
${data.tax && data.cgst !== undefined && data.sgst !== undefined ? `
<tr><td class="right">SGST ${data.taxPercentage ? data.taxPercentage / 2 : 2.5}%: </td><td class="right bold">INR ${this.formatNumber(data.sgst)}</td></tr>
<tr><td class="right">CGST ${data.taxPercentage ? data.taxPercentage / 2 : 2.5}%: </td><td class="right bold">INR ${this.formatNumber(data.cgst)}</td></tr>
<tr><td class="right">Total Tax: </td><td class="right bold">INR ${this.formatNumber(data.tax)}</td></tr>
` : ''}
${data.discount && data.discount > 0 ? `
<tr><td class="right">${data.discountLabel || (data.discountType === 'percentage' ? `Discount (${data.discountValue}%)` : 'Discount')}: </td><td class="right bold">-INR ${this.formatNumber(data.discount)}</td></tr>
` : ''}
</table>
<hr />
<table>
<tr class="total"><td>Total: </td><td class="right">INR ${this.formatNumber(data.grandTotal)}</td></tr>
</table>

<hr />

<div class="center">Total Items: ${data.items.reduce((s, i) => s + i.quantity, 0)}</div>
${data.paymentMethod ? `
<div class="center">${data.paymentMethod.toUpperCase() === 'UPI' ? 'Gpay' : data.paymentMethod.toUpperCase()}: INR ${this.formatNumber(data.grandTotal)}</div>
<div class="center">Amount Tendered: INR ${this.formatNumber(data.grandTotal)}</div>
` : ''}
` : ''}

<div class="center" style="margin-top: 20px; font-weight: bold;">Powered by MyQuro</div>
</body>
</html>
`;
  }

  /* =====================================================
     PDF RECEIPT (DYNAMIC HEIGHT NO OVERLAP)
  ===================================================== */
  downloadPDF(data: BillData): void {
    const margin = 8;
    const pageWidth = 80;
    const line = 4;

    // Estimate total height needed
    let estimatedHeight = 50 + (margin * 2); // Base height + padding

    // Add height for items and their extras
    data.items.forEach(i => {
      const itemName = i.variant ? `${i.name} (${i.variant})` : i.name;
      const extrasText = i.extras && i.extras.length > 0 ? ` + ${i.extras.map(e => `${e.quantity}x ${e.name}`).join(', ')}` : '';
      const fullItemText = `${itemName}${extrasText}`;
      // Approximate line wraps needed for the item name width
      const charWidth = data.isKOT ? 60 : 35;
      const lines = Math.ceil(fullItemText.length / (charWidth / 2)); // rough estimate
      estimatedHeight += (lines * line) + 2;
    });

    if (data.notes) estimatedHeight += 15 + Math.ceil(data.notes.length / 30) * line;
    if (!data.isKOT) estimatedHeight += 75; // Account for the expanded Totals, Taxes, and Payment blocks

    // Minimum height of 100mm, otherwise dynamic
    const finalHeight = Math.max(100, estimatedHeight);

    const doc = new jsPDF({ unit: 'mm', format: [pageWidth, finalHeight] });

    let y = 10 + margin;

    const ensure = (h: number) => {
      // With dynamic height, we attempt to keep it all on one page
      // But if we somehow exceed the dynamically generated canvas, add page
      if (y + h > finalHeight - margin) {
        doc.addPage();
        y = 10 + margin;
      }
    };

    /* HEADER */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    if (data.isKOT) {
      doc.setFontSize(18);
      doc.text('*** KOT ***', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    } else {
      doc.text(data.restaurantName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (data.restaurantAddress) {
        doc.splitTextToSize(data.restaurantAddress, 70).forEach((l: string) => {
          doc.text(l, pageWidth / 2, y, { align: 'center' });
          y += line;
        });
      }
      if (data.restaurantPhone) {
        doc.text(`Phone Number: ${data.restaurantPhone}`, pageWidth / 2, y, { align: 'center' });
        y += line;
      }
      if (data.gstin) {
        doc.text(`GSTIN: ${data.gstin}`, pageWidth / 2, y, { align: 'center' });
        y += line;
      }
      if (data.fssaiLicenseNumber) {
        doc.text(`FSSAI: ${data.fssaiLicenseNumber}`, pageWidth / 2, y, { align: 'center' });
        y += line;
      }

      doc.text('(Veg & Non-Veg)', pageWidth / 2, y, { align: 'center' });
      y += line + 2;

      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Tax Invoice', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    }

    /* INFO */
    doc.setFontSize(9);
    if (!data.isKOT) {
      doc.setFont('helvetica', 'normal');
      if (data.orderNumber) {
        doc.text(`Order Number   : ${data.orderNumber}`, margin, y); y += line;
      }
      doc.text(`Invoice Number : ${data.invoiceNumber || '-'}`, margin, y); y += line;

      if (data.orderType) {
        doc.text(`Category       : ${data.orderType}`, margin, y); y += line;
      }
      if (data.cashierName) {
        doc.text(`Employee       : ${data.cashierName}`, margin, y); y += line;
      }
      doc.text(`Date & Time    : ${data.date}, ${data.time}`, margin, y); y += line;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(`KOT: ${data.invoiceNumber || '-'}`, margin, y); y += line + 1;
      doc.setFontSize(11);
      doc.text(`Table: ${data.tableNumber}`, margin, y); y += line + 1;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.date} ${data.time}`, margin, y); y += line;
    }

    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    /* ITEMS */
    const col = { name: margin, price: data.isKOT ? 0 : 38, qty: data.isKOT ? pageWidth - 15 : 52, amt: pageWidth - margin };
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM NAME', col.name, y);
    if (!data.isKOT) doc.text('PRICE', col.price, y);
    doc.text('QTY', col.qty, y);
    if (!data.isKOT) {
      doc.text('AMT', col.amt, y, { align: 'right' });
    }
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;

    doc.setFont('helvetica', 'normal');

    let totalItemsCount = 0;
    data.items.forEach(i => {
      totalItemsCount += i.quantity;
      ensure(10);
      const itemName = i.variant ? `${i.name} (${i.variant})` : i.name;
      const extrasText = i.extras && i.extras.length > 0 ? ` + ${i.extras.map(e => `${e.quantity}x ${e.name}`).join(', ')}` : '';
      const fullItemText = `${itemName}${extrasText}`.toUpperCase();

      const lines = doc.splitTextToSize(fullItemText, data.isKOT ? 60 : 30);
      lines.forEach((l: string, idx: number) => {
        doc.text(l, col.name, y + idx * line);
      });
      if (!data.isKOT) doc.text(this.formatNumber(i.price || 0), col.price, y);
      doc.text(String(i.quantity), col.qty, y);
      if (!data.isKOT) {
        doc.text(this.formatNumber(i.total), col.amt, y, { align: 'right' });
      }
      y += lines.length * line + 1;
    });

    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    if (data.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES:', margin, y); y += line;
      doc.setFont('helvetica', 'normal');
      doc.splitTextToSize(data.notes, 70).forEach((l: string) => {
        doc.text(l, margin, y);
        y += line;
      });
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    }

    /* TOTALS */
    if (!data.isKOT) {
      const row = (l: string, v: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(l, 40, y, { align: 'right' });
        doc.text(v, col.amt, y, { align: 'right' });
        y += line;
      };

      row('Subtotal: ', `INR ${this.formatNumber(data.subtotal)}`, true);

      // Taxes
      if (data.tax && data.tax > 0) {
        if (data.cgst !== undefined && data.sgst !== undefined) {
          const taxPct = data.taxPercentage ? data.taxPercentage / 2 : 2.5;
          row(`SGST ${taxPct}%: `, `INR ${this.formatNumber(data.sgst)}`, false);
          row(`CGST ${taxPct}%: `, `INR ${this.formatNumber(data.cgst)}`, false);
        }
        row('Total Tax: ', `INR ${this.formatNumber(data.tax)}`, true);
      }

      // Discount
      if (data.discount && data.discount > 0) {
        const discountLabel = data.discountLabel || (data.discountType === 'percentage'
          ? `Discount (${data.discountValue}%):`
          : 'Discount:');
        row(discountLabel, `-INR ${this.formatNumber(data.discount)}`, true);
      }

      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFontSize(12);
      row('Total: ', `INR ${this.formatNumber(data.grandTotal)}`, true);
      doc.setFontSize(9);

      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.text(`Total Items: ${totalItemsCount}`, pageWidth / 2, y, { align: 'center' });
      y += 4;

      if (data.paymentMethod) {
        let methodStr = data.paymentMethod.toUpperCase();
        if (methodStr === 'UPI') methodStr = 'Gpay';

        doc.text(`${methodStr}: INR ${this.formatNumber(data.grandTotal)}`, pageWidth / 2, y, { align: 'center' });
        y += line;
        doc.text(`Amount Tendered: INR ${this.formatNumber(data.grandTotal)}`, pageWidth / 2, y, { align: 'center' });
        y += line;
      }
    }

    doc.save(`${data.isKOT ? 'KOT' : 'Bill'}-${data.invoiceNumber || new Date().getTime()}.pdf`);
  }
}
