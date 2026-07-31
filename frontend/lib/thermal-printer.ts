// Thermal Printer Utility for Restaurant Bills
// Supports ESC/POS thermal printers via USB, Bluetooth, Network

interface BillData {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  gstin?: string;
  fssaiLicenseNumber?: string;
  invoiceNumber: string;
  orderNumber?: string | number;
  tableNumber: number | string;
  orderType?: string; // e.g., Delivery, Takeaway, Dine-in
  cashierName?: string;
  date: string;
  time: string;
  userName?: string;
  userPhone?: string;
  sessionId?: string; // Add session ID for review URL
  reviewUrl?: string; // Add direct review URL
  items: Array<{
    name: string;
    variant?: string;
    quantity: number;
    price: number;
    total: number;
    extras?: Array<{
      extraId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
  subtotal: number;
  tax?: number; // Total tax
  cgst?: number;
  sgst?: number;
  taxPercentage?: number;
  discount?: number;
  taxableAmount?: number;
  grandTotal: number;
  paymentMethod?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountLabel?: string;
  isKOT?: boolean;
  notes?: string;
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const Commands = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  FONT_SIZE_NORMAL: GS + '!' + '\x00',
  FONT_SIZE_LARGE: GS + '!' + '\x11',
  FONT_SIZE_XLARGE: GS + '!' + '\x22',
  CUT_PAPER: GS + 'V' + '\x41' + '\x00',
  LINE_FEED: '\n',
  DRAWER_KICK: ESC + 'p' + '\x00' + '\x19' + '\xFA',
};

class ThermalPrinter {
  private width: number = 32; // 32 characters for 80mm, 24 for 58mm

  constructor(width: number = 32) {
    this.width = width;
  }

  // Generate ESC/POS commands for the bill
  generateESCPOS(data: BillData): string {
    let output = '';

    // Initialize printer
    output += Commands.INIT;

    // Header - Restaurant Name or KOT
    output += Commands.ALIGN_CENTER;
    output += Commands.FONT_SIZE_LARGE;
    output += Commands.BOLD_ON;
    if (data.isKOT) {
      output += '*** KOT ***';
      output += Commands.LINE_FEED;
      output += Commands.FONT_SIZE_NORMAL;
      output += Commands.BOLD_OFF;
    } else {
      output += data.restaurantName.toUpperCase();
      output += Commands.LINE_FEED;
      output += Commands.FONT_SIZE_NORMAL;
      output += Commands.BOLD_OFF;
      output += Commands.LINE_FEED;
    }
    //
    // Restaurant Info
    if (!data.isKOT) {
      if (data.restaurantAddress) {
        output += this.wrapText(data.restaurantAddress);
        output += Commands.LINE_FEED;
      }
      if (data.restaurantPhone) {
        output += `Phone Number: ${data.restaurantPhone}`;
        output += Commands.LINE_FEED;
      }
      if (data.gstin) {
        output += `GSTIN: ${data.gstin}`;
        output += Commands.LINE_FEED;
      }
      if (data.fssaiLicenseNumber) {
        output += `FSSAI: ${data.fssaiLicenseNumber}`;
        output += Commands.LINE_FEED;
      }
    }

    // Separator
    if (!data.isKOT) {
      output += Commands.ALIGN_CENTER;
      output += Commands.BOLD_ON;
      output += 'Tax Invoice';
      output += Commands.LINE_FEED;
      output += Commands.BOLD_OFF;
      output += Commands.ALIGN_LEFT;
    } else {
      output += Commands.ALIGN_LEFT;
    }
    output += this.line('-');
    output += Commands.LINE_FEED;

    // Invoice Details
    if (!data.isKOT) {
      if (data.orderNumber) {
        output += `Order Number   : ${data.orderNumber}`;
        output += Commands.LINE_FEED;
      }
      output += `Invoice Number : ${data.invoiceNumber}`;
      output += Commands.LINE_FEED;
      if (data.orderType) {
        output += `Category       : ${data.orderType}`;
        output += Commands.LINE_FEED;
      }
      if (data.cashierName) {
        output += `Employee       : ${data.cashierName}`;
        output += Commands.LINE_FEED;
      }
    } else {
      output += Commands.BOLD_ON;
    }
    output += `Table: ${data.tableNumber}`;
    output += Commands.LINE_FEED;

    // User Information (if provided)
    if (data.userName) {
      output += `Customer: ${data.userName}`;
      output += Commands.LINE_FEED;
    }
    if (data.userPhone) {
      output += `Phone: ${this.maskPhoneNumber(data.userPhone)}`;
      output += Commands.LINE_FEED;
    }

    output += Commands.BOLD_OFF;
    output += `Date: ${data.date}`;
    output += Commands.LINE_FEED;
    output += `Time: ${data.time}`;
    output += Commands.LINE_FEED;

    // Separator
    output += this.line('=');
    output += Commands.LINE_FEED;

    // Column Headers
    output += Commands.BOLD_ON;
    if (data.isKOT) {
      output += this.formatRow('Item', 'Qty', '', '');
    } else {
      output += this.formatRow('Item', 'Qty', 'Price', 'Total');
    }
    output += Commands.LINE_FEED;
    output += Commands.BOLD_OFF;
    output += this.line('-');
    output += Commands.LINE_FEED;

    // Items
    let totalItemsCount = 0;
    data.items.forEach(item => {
      totalItemsCount += item.quantity;
      const itemName = item.variant
        ? `${item.name} (${item.variant})`
        : item.name;

      // Item name (may wrap to multiple lines)
      const wrappedName = this.wrapText(itemName, this.width - (data.isKOT ? 5 : 18));
      output += wrappedName;
      output += Commands.LINE_FEED;

      // Extras (if any)
      if (item.extras && item.extras.length > 0) {
        item.extras.forEach(extra => {
          const extraText = `  + ${extra.quantity}x ${extra.name}`;
          const wrappedExtra = this.wrapText(extraText, this.width - (data.isKOT ? 5 : 18));
          output += wrappedExtra;
          output += Commands.LINE_FEED;
        });
      }

      // Quantity, Price, Total on same line
      if (data.isKOT) {
        output += this.formatRow(
          '',
          item.quantity.toString(),
          '',
          ''
        );
      } else {
        output += this.formatRow(
          '',
          item.quantity.toString(),
          this.formatPrice(item.price || 0),
          this.formatPrice(item.total)
        );
      }
      output += Commands.LINE_FEED;
    });

    // Separator
    output += this.line('-');
    output += Commands.LINE_FEED;

    if (data.notes) {
      output += Commands.BOLD_ON;
      output += 'NOTES:';
      output += Commands.LINE_FEED;
      output += this.wrapText(data.notes);
      output += Commands.LINE_FEED;
      output += Commands.BOLD_OFF;
      output += this.line('-');
      output += Commands.LINE_FEED;
    }

    if (!data.isKOT) {
      // Totals
      output += Commands.ALIGN_LEFT;
      output += this.formatKeyValue('Subtotal:', `INR ${this.formatPrice(data.subtotal)}`);
      output += Commands.LINE_FEED;

      if (data.discount && data.discount > 0) {
        output += this.formatKeyValue(
          data.discountLabel || (data.discountType === 'percentage'
            ? `Discount (${data.discountValue}%):`
            : 'Discount:'),
          `-INR ${this.formatPrice(data.discount)}`
        );
        output += Commands.LINE_FEED;
      }

      const taxableBase = data.taxableAmount ?? Math.max(0, data.subtotal - (data.discount || 0));
      if (data.discount && data.discount > 0) {
        output += this.formatKeyValue('Taxable Amount:', `INR ${this.formatPrice(taxableBase)}`);
        output += Commands.LINE_FEED;
      }

      if (data.tax && data.tax > 0) {
        if (data.cgst !== undefined && data.sgst !== undefined) {
          const taxPct = data.taxPercentage ? (data.taxPercentage / 2) : 2.5;
          output += this.formatKeyValue(`SGST ${taxPct}%:`, `INR ${this.formatPrice(data.sgst)}`);
          output += Commands.LINE_FEED;
          output += this.formatKeyValue(`CGST ${taxPct}%:`, `INR ${this.formatPrice(data.cgst)}`);
          output += Commands.LINE_FEED;
        }
        output += this.formatKeyValue('Total Tax:', `INR ${this.formatPrice(data.tax)}`);
        output += Commands.LINE_FEED;
      }

      output += this.line('-');
      output += Commands.LINE_FEED;

      // Grand Total
      const finalAmount = data.grandTotal;

      // Grand Total
      output += Commands.FONT_SIZE_LARGE;
      output += Commands.BOLD_ON;
      // For double sized font, max chars is halved
      const totalKey = 'Total:';
      const totalVal = `INR ${this.formatPrice(finalAmount)}`;
      const wideWidth = Math.floor(this.width / 2);
      const totalLen = totalKey.length + totalVal.length;
      let totalLine = '';
      if (totalLen < wideWidth) {
        totalLine = totalKey + ' '.repeat(wideWidth - totalLen) + totalVal;
      } else {
        totalLine = totalKey + ' ' + totalVal;
      }
      output += Commands.ALIGN_LEFT;
      output += totalLine;
      output += Commands.LINE_FEED;
      output += Commands.FONT_SIZE_NORMAL;
      output += Commands.BOLD_OFF;

      output += this.line('-');
      output += Commands.LINE_FEED;

      output += Commands.ALIGN_RIGHT;
      output += `Total Items: ${totalItemsCount}`;
      output += Commands.LINE_FEED;

      if (data.paymentMethod) {
        // e.g. "Gpay: INR 120.00"
        let methodStr = data.paymentMethod.toUpperCase();
        if (methodStr === 'UPI') methodStr = 'Gpay'; // matching the receipt style or general UPI
        output += `${methodStr}: INR ${this.formatPrice(finalAmount)}`;
        output += Commands.LINE_FEED;
        output += `Amount Tendered: INR ${this.formatPrice(finalAmount)}`;
        output += Commands.LINE_FEED;
      }

      // Footer
      output += Commands.LINE_FEED;
      output += this.line('-');
      output += Commands.LINE_FEED;
      output += Commands.ALIGN_CENTER;
      output += 'Thank you for dining with us!';
      output += Commands.LINE_FEED;
      output += 'Visit again soon';
      output += Commands.LINE_FEED;
      output += Commands.LINE_FEED;

      // Review Section
      if (data.sessionId || data.reviewUrl) {
        output += Commands.ALIGN_CENTER;
        output += Commands.BOLD_ON;
        output += 'Make sure you leave a review of us at';
        output += Commands.LINE_FEED;
        output += Commands.BOLD_OFF;

        const reviewUrl = data.reviewUrl || `https://myquro.com/review/${data.sessionId}`;
        output += this.generateQRCode(reviewUrl);
        output += Commands.LINE_FEED;
        output += 'Scan QR code to leave a review';
        output += Commands.LINE_FEED;
        output += Commands.LINE_FEED;

        // Fallback URL if QR code doesn't work
        output += 'Or visit:';
        output += Commands.LINE_FEED;
        output += reviewUrl;
        output += Commands.LINE_FEED;
        output += Commands.LINE_FEED;
      }

      // Support Info
      output += 'RPX';
      output += Commands.LINE_FEED;
      output += 'Report issues at support@myquro.com';
      output += Commands.LINE_FEED;
      output += this.line('-');
      output += Commands.LINE_FEED;

      // MyQuro branding at absolute bottom
      output += Commands.ALIGN_CENTER;
      output += Commands.BOLD_ON;
      output += 'Powered by MyQuro';
      output += Commands.LINE_FEED;
      output += Commands.BOLD_OFF;
      output += Commands.LINE_FEED;
      output += Commands.LINE_FEED;
    }

    // Cut paper
    output += Commands.CUT_PAPER;

    return output;
  }

  // Helper: Format price
  private formatPrice(amount: number): string {
    return amount.toFixed(2);
  }

  // Helper: Create a line of characters
  private line(char: string): string {
    return char.repeat(this.width);
  }

  // Helper: Format a row with columns
  private formatRow(col1: string, col2: string, col3: string, col4: string): string {
    const widths = [12, 4, 7, 7]; // Total: 30 chars (with spaces)
    return (
      this.pad(col1, widths[0]) + ' ' +
      this.pad(col2, widths[1]) + ' ' +
      this.pad(col3, widths[2]) + ' ' +
      this.pad(col4, widths[3], 'right')
    );
  }

  // Helper: Format key and value with spaces in between to push value to right
  private formatKeyValue(key: string, value: string): string {
    const totalLen = key.length + value.length;
    if (totalLen >= this.width) return key + ' ' + value;
    return key + ' '.repeat(this.width - totalLen) + value;
  }

  // Helper: Pad text
  private pad(text: string, width: number, align: 'left' | 'right' = 'left'): string {
    if (text.length >= width) return text.substring(0, width);
    const padding = ' '.repeat(width - text.length);
    return align === 'left' ? text + padding : padding + text;
  }

  // Helper: Wrap text to fit width
  private wrapText(text: string, maxWidth?: number): string {
    const width = maxWidth || this.width;
    if (text.length <= width) return text;

    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.join(Commands.LINE_FEED);
  }

  // Helper: Mask phone number (show first 2 and last 3 digits)
  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 5) return phone;

    const firstTwo = phone.substring(0, 2);
    const lastThree = phone.substring(phone.length - 3);
    const stars = '*'.repeat(phone.length - 5);

    return firstTwo + stars + lastThree;
  }
  // Helper: Generate QR Code for ESC/POS
  private generateQRCode(url: string): string {
    // ESC/POS QR Code commands
    const QR_CODE_MODEL = GS + '\x51' + '\x41' + '\x31'; // Model 1
    const QR_CODE_SIZE = GS + '\x51' + '\x43' + '\x03'; // Size 3 (77x77 pixels)
    const QR_CODE_ERROR_CORRECTION = GS + '\x51' + '\x45' + '\x31'; // Error correction level M
    const QR_CODE_STORE = GS + '\x51' + '\x50' + '\x30'; // Store data
    const QR_CODE_PRINT = GS + '\x51' + '\x52' + '\x30'; // Print QR code

    let qrOutput = '';
    qrOutput += QR_CODE_MODEL;
    qrOutput += QR_CODE_SIZE;
    qrOutput += QR_CODE_ERROR_CORRECTION;
    qrOutput += QR_CODE_STORE;

    // Add URL data
    qrOutput += url;

    // Null terminator
    qrOutput += '\x00';

    // Print QR code
    qrOutput += QR_CODE_PRINT;

    return qrOutput;
  }

  // Print via Web Bluetooth (for Bluetooth thermal printers)
  async printViaBluetooth(data: BillData): Promise<void> {
    try {
      // @ts-ignore - Web Bluetooth API
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic printer service
          { namePrefix: 'POS' },
          { namePrefix: 'Printer' },
          { namePrefix: 'TM' },
          { namePrefix: 'RPP' },
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const escpos = this.generateESCPOS(data);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(escpos);

      // Send in chunks (Bluetooth has size limits)
      const chunkSize = 512;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between chunks
      }

      console.log('✅ Printed via Bluetooth');
    } catch (error) {
      console.error('Bluetooth printing failed:', error);
      throw new Error('Bluetooth printing not available or failed');
    }
  }

  // Print via Web USB (for USB thermal printers)
  async printViaUSB(data: BillData): Promise<void> {
    try {
      // @ts-ignore - WebUSB API
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0483 }, // STMicroelectronics
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x154f }, // SNBC
        ]
      });

      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      const escpos = this.generateESCPOS(data);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(escpos);

      // Find OUT endpoint
      const endpoints = device.configuration.interfaces[0].alternate.endpoints;
      const outEndpoint = endpoints.find((ep: any) => ep.direction === 'out');

      if (!outEndpoint) throw new Error('No OUT endpoint found');

      await device.transferOut(outEndpoint.endpointNumber, bytes);

      await device.close();
      console.log('✅ Printed via USB');
    } catch (error) {
      console.error('USB printing failed:', error);
      throw new Error('USB printing not available or failed');
    }
  }

  // Print via network (for network thermal printers)
  async printViaNetwork(data: BillData, printerIP: string, port: number = 9100): Promise<void> {
    try {
      const escpos = this.generateESCPOS(data);

      // Note: Direct network printing requires a backend proxy
      // Send to backend which will forward to printer
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/print/network`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          printerIP,
          port,
          data: escpos
        })
      });

      if (!response.ok) throw new Error('Network printing failed');
      console.log('✅ Printed via Network');
    } catch (error) {
      console.error('Network printing failed:', error);
      throw new Error('Network printing not available or failed');
    }
  }
}

export { ThermalPrinter, type BillData };
