import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { companyInfo } from '../config/companyInfo';

export interface InvoicePDFData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  project?: {
    name: string;
    number: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  terms?: string;
}

export class PDFService {
  /**
   * Generate PDF for an invoice
   */
  static generateInvoicePDF(data: InvoicePDFData): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Set brand colors
    const primaryColor = this.hexToRGB(companyInfo.branding.primaryColor);
    const accentColor = this.hexToRGB(companyInfo.branding.accentColor);

    // Header with brand color
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Company name in white
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(companyInfo.name, 20, 20);

    // Tagline
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.tagline, 20, 28);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPos = 50;

    // INVOICE title
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('INVOICE', pageWidth - 20, yPos, { align: 'right' });

    // Invoice details box
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const detailsX = pageWidth - 70;
    doc.text('Invoice Number:', detailsX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(data.invoiceNumber, pageWidth - 20, yPos, { align: 'right' });

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice Date:', detailsX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(data.date, pageWidth - 20, yPos, { align: 'right' });

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Due Date:', detailsX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(data.dueDate, pageWidth - 20, yPos, { align: 'right' });

    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Status:', detailsX, yPos);
    doc.setFont('helvetica', 'bold');
    const statusColor = this.getStatusColor(data.status);
    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.text(data.status.toUpperCase(), pageWidth - 20, yPos, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // Company info (left side)
    yPos = 60;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 20, yPos);
    
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(companyInfo.legalName, 20, yPos);
    
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(companyInfo.address.line1, 20, yPos);
    
    if (companyInfo.address.line2) {
      yPos += 4;
      doc.text(companyInfo.address.line2, 20, yPos);
    }
    
    yPos += 4;
    doc.text(`${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipCode}`, 20, yPos);
    
    yPos += 4;
    doc.text(`Phone: ${companyInfo.contact.phone}`, 20, yPos);
    
    yPos += 4;
    doc.text(`Email: ${companyInfo.contact.email}`, 20, yPos);
    
    yPos += 4;
    doc.text(`${companyInfo.tax.taxLabel}: ${companyInfo.tax.taxId}`, 20, yPos);

    // Customer info (Bill To)
    yPos = 110;
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPos);
    
    yPos += 5;
    doc.setFontSize(11);
    doc.text(data.customer.name, 20, yPos);
    
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (data.customer.address) {
      doc.text(data.customer.address, 20, yPos);
      yPos += 4;
    }
    
    doc.text(`Email: ${data.customer.email}`, 20, yPos);
    
    if (data.customer.phone) {
      yPos += 4;
      doc.text(`Phone: ${data.customer.phone}`, 20, yPos);
    }

    // Project info (if applicable)
    if (data.project) {
      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Project:', 20, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.project.name} (${data.project.number})`, 20, yPos);
    }

    // Line items table
    yPos += 15;

    const tableData = data.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.rate.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [primaryColor.r, primaryColor.g, primaryColor.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      styles: {
        fontSize: 9,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;

    // Totals section
    let totalsY = finalY + 10;
    const totalsX = pageWidth - 20;
    const labelX = pageWidth - 70;

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal:', labelX, totalsY);
    doc.text(`$${data.subtotal.toFixed(2)}`, totalsX, totalsY, { align: 'right' });

    // Tax
    totalsY += 6;
    doc.text('Tax:', labelX, totalsY);
    doc.text(`$${data.tax.toFixed(2)}`, totalsX, totalsY, { align: 'right' });

    // Total (highlighted)
    totalsY += 8;
    doc.setFillColor(accentColor.r, accentColor.g, accentColor.b);
    doc.rect(labelX - 5, totalsY - 5, 55, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', labelX, totalsY);
    doc.text(`$${data.total.toFixed(2)}`, totalsX, totalsY, { align: 'right' });

    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Notes section
    if (data.notes) {
      totalsY += 20;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, totalsY);
      totalsY += 5;
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(data.notes, pageWidth - 40);
      doc.text(notesLines, 20, totalsY);
      totalsY += (notesLines.length * 4);
    }

    // Payment terms (footer)
    if (data.terms || companyInfo.legal.terms) {
      const terms = data.terms || companyInfo.legal.terms;
      const footerY = pageHeight - 40;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Payment Terms:', 20, footerY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const termsLines = doc.splitTextToSize(terms, pageWidth - 40);
      doc.text(termsLines, 20, footerY + 4);
    }

    // Banking info (if available)
    if (companyInfo.banking) {
      const bankingY = pageHeight - 25;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Payment Information:', 20, bankingY);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Bank: ${companyInfo.banking.bankName} | Account: ${companyInfo.banking.accountNumber} | Routing: ${companyInfo.banking.routingNumber}`, 20, bankingY + 4);
    }

    // Footer line
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${companyInfo.name} | ${companyInfo.contact.website} | ${companyInfo.contact.phone}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

    return doc;
  }

  /**
   * Download invoice PDF
   */
  static downloadInvoicePDF(data: InvoicePDFData, filename?: string): void {
    const doc = this.generateInvoicePDF(data);
    const name = filename || `Invoice_${data.invoiceNumber}.pdf`;
    doc.save(name);
  }

  /**
   * Get PDF as blob for email attachment
   */
  static getInvoicePDFBlob(data: InvoicePDFData): Blob {
    const doc = this.generateInvoicePDF(data);
    return doc.output('blob');
  }

  /**
   * Get PDF as base64 string
   */
  static getInvoicePDFBase64(data: InvoicePDFData): string {
    const doc = this.generateInvoicePDF(data);
    return doc.output('dataurlstring');
  }

  /**
   * Helper: Convert hex color to RGB
   */
  private static hexToRGB(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 234, g: 88, b: 12 }; // Default orange
  }

  /**
   * Helper: Get status color
   */
  private static getStatusColor(status: string): { r: number; g: number; b: number } {
    switch (status.toLowerCase()) {
      case 'paid':
        return { r: 34, g: 197, b: 94 }; // Green
      case 'pending':
        return { r: 234, g: 179, b: 8 }; // Yellow
      case 'overdue':
        return { r: 239, g: 68, b: 68 }; // Red
      case 'draft':
        return { r: 156, g: 163, b: 175 }; // Gray
      default:
        return { r: 234, g: 88, b: 12 }; // Orange
    }
  }
}
